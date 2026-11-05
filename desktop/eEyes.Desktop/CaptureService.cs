using System.Text.Json.Nodes;
using Windows.Devices.Enumeration;
using Windows.Media.Capture;
using Windows.Media.MediaProperties;
using Windows.Storage.Streams;
using DevicePanel = Windows.Devices.Enumeration.Panel;

namespace eEyes.Desktop;

internal sealed class CaptureService
{
    private readonly MediaQueue _queue;
    private readonly ApiClient _api;
    private CancellationTokenSource? _autoCts;
    private bool _capturing;
    private readonly HashSet<string> _scheduled = new(StringComparer.Ordinal);
    private readonly Dictionary<string, int> _scheduledFailures = new(StringComparer.Ordinal);
    private readonly object _scheduledGate = new();
    private const int MaxScheduledFailures = 5;
    private const int WarmupMs = 1000;

    public CaptureService(MediaQueue queue, ApiClient api)
    {
        _queue = queue;
        _api = api;
    }

    public bool IsCapturing => _capturing;

    /// <summary>Takes one photo with the camera on <paramref name="facing"/> ("front"/"back"); false when no picture was taken.</summary>
    public async Task<bool> CapturePhotoAsync(string taskId, string facing = "back")
    {
        _capturing = true;
        try
        {
            var deviceId = await PickCameraAsync(facing);
            if (deviceId is null) return false;
            using var capture = new MediaCapture();
            await capture.InitializeAsync(new MediaCaptureInitializationSettings
            {
                StreamingCaptureMode = StreamingCaptureMode.Video,
                VideoDeviceId = deviceId,
            });
            var raw = await TakeJpegAsync(capture);
            if (raw is null || raw.Length == 0) return false;
            await EnqueueAndUploadAsync(taskId, "image", "image/jpeg", MediaCompressor.CompressJpeg(raw), 0);
            return true;
        }
        catch
        {
            return false;
        }
        finally
        {
            if (_autoCts is null) _capturing = false;
        }
    }

    private static async Task<string?> PickCameraAsync(string facing)
    {
        var devices = await DeviceInformation.FindAllAsync(DeviceClass.VideoCapture);
        if (devices.Count == 0) return null;
        var want = facing == "front" ? DevicePanel.Front : DevicePanel.Back;
        return (devices.FirstOrDefault(d => d.EnclosureLocation?.Panel == want) ?? devices[0]).Id;
    }

    private static async Task<byte[]?> TakeJpegAsync(MediaCapture capture)
    {
        var lowLag = await capture.PrepareLowLagPhotoCaptureAsync(ImageEncodingProperties.CreateJpeg());
        try
        {
            // The stream runs during warm-up so auto exposure / white balance settle.
            await Task.Delay(WarmupMs);
            var photo = await lowLag.CaptureAsync();
            using var frame = photo.Frame;
            var size = (uint)frame.Size;
            using var reader = new DataReader(frame.GetInputStreamAt(0));
            await reader.LoadAsync(size);
            var bytes = new byte[size];
            reader.ReadBytes(bytes);
            return bytes;
        }
        finally
        {
            await lowLag.FinishAsync();
        }
    }

    /// <summary>
    /// Runs hub-scheduled photos (sync items with kind "capture") at their time. The
    /// first upload completes the task server-side; the key is acked once taken.
    /// </summary>
    public void HandleScheduled(JsonArray? notifications)
    {
        if (notifications is null) return;
        foreach (var n in notifications)
        {
            if (n?["kind"]?.GetValue<string>() != "capture") continue;
            var key = n["key"]?.GetValue<string>() ?? "";
            if (key.Length == 0) continue;
            lock (_scheduledGate)
            {
                if (!_scheduled.Add(key)) continue;
            }
            var taskId = n["taskId"]?.GetValue<string>() ?? "";
            var facing = n["facing"]?.GetValue<string>() ?? "back";
            var title = n["title"]?.GetValue<string>() ?? "eEyes";
            if (!DateTimeOffset.TryParse(n["at"]?.GetValue<string>(), out var at)) at = DateTimeOffset.UtcNow;
            _ = Task.Run(() => RunScheduledAsync(key, taskId, facing, title, at));
        }
    }

    private async Task RunScheduledAsync(string key, string taskId, string facing, string title, DateTimeOffset at)
    {
        var wait = at - DateTimeOffset.UtcNow;
        if (wait > TimeSpan.Zero) await Task.Delay(wait);
        var ok = await CapturePhotoAsync(taskId, facing);
        DiagStore.RecordCapture(key, facing, ok ? null : "camara_no_disponible");
        if (ok)
        {
            var camera = facing == "front" ? "frontal" : "trasera";
            NotificationService.Show("eEyes tomó una foto", $"\"{title}\" · cámara {camera}", taskId);
            await NotificationService.AckAsync(_api, [key]);
            return;
        }
        lock (_scheduledGate)
        {
            var failures = _scheduledFailures.GetValueOrDefault(key) + 1;
            _scheduledFailures[key] = failures;
            // Let a later sync retry, but stop hammering a missing or busy camera.
            if (failures < MaxScheduledFailures) _scheduled.Remove(key);
        }
    }

    public void StartAuto(string taskId, int intervalSec, int maxPhotos)
    {
        StopAuto();
        _autoCts = new CancellationTokenSource();
        var cts = _autoCts;
        _ = Task.Run(async () =>
        {
            _capturing = true;
            var taken = 0;
            try
            {
                while (!cts.IsCancellationRequested && taken < maxPhotos)
                {
                    await CapturePhotoAsync(taskId);
                    taken++;
                    await Task.Delay(TimeSpan.FromSeconds(Math.Max(1, intervalSec)), cts.Token);
                }
            }
            catch (OperationCanceledException) { }
            finally
            {
                _capturing = false;
            }
        });
    }

    public void StopAuto()
    {
        _autoCts?.Cancel();
        _autoCts = null;
        _capturing = false;
    }

    public async Task RecordAudioAsync(string taskId, int seconds)
    {
        _capturing = true;
        try
        {
            var capture = new MediaCapture();
            await capture.InitializeAsync(new MediaCaptureInitializationSettings
            {
                StreamingCaptureMode = StreamingCaptureMode.Audio,
            });
            var profile = MediaEncodingProfile.CreateM4a(AudioEncodingQuality.Low);
            var filePath = Path.Combine(Config.AppDataDir, $"audio-{Guid.NewGuid():N}.m4a");
            var folder = await Windows.Storage.StorageFolder.GetFolderFromPathAsync(Config.AppDataDir);
            var file = await folder.CreateFileAsync(Path.GetFileName(filePath), Windows.Storage.CreationCollisionOption.ReplaceExisting);
            await capture.StartRecordToStorageFileAsync(profile, file);
            await Task.Delay(TimeSpan.FromSeconds(Math.Clamp(seconds, 1, 300)));
            await capture.StopRecordAsync();
            var bytes = await File.ReadAllBytesAsync(file.Path);
            await EnqueueAndUploadAsync(taskId, "audio", "audio/mp4", bytes, seconds * 1000);
        }
        catch
        {
            // Mic may be unavailable in headless CI; ignore.
        }
        finally
        {
            _capturing = false;
        }
    }

    private async Task EnqueueAndUploadAsync(string taskId, string kind, string mime, byte[] bytes, int durationMs)
    {
        var id = Guid.NewGuid().ToString();
        var path = Path.Combine(Config.AppDataDir, id + ".bin");
        await File.WriteAllBytesAsync(path, bytes);
        var item = new QueueItem(
            id,
            taskId,
            kind,
            mime,
            path,
            MediaCompressor.Sha256Hex(bytes),
            DateTime.UtcNow.ToString("o"),
            DurationMs: durationMs);
        _queue.Enqueue(item);
        await FlushAsync(item);
    }

    public async Task FlushQueueAsync()
    {
        foreach (var item in _queue.Snapshot())
        {
            await FlushAsync(item);
        }
    }

    private async Task FlushAsync(QueueItem item)
    {
        if (!File.Exists(item.FilePath))
        {
            _queue.Remove(item.ClientMediaId);
            return;
        }
        var bytes = await File.ReadAllBytesAsync(item.FilePath);
        var body = new System.Text.Json.Nodes.JsonObject
        {
            ["clientMediaId"] = item.ClientMediaId,
            ["kind"] = item.Kind,
            ["mime"] = item.Mime,
            ["capturedAt"] = item.CapturedAt,
            ["durationMs"] = item.DurationMs,
            ["sha256"] = item.Sha256,
            ["dataBase64"] = Convert.ToBase64String(bytes),
        }.ToJsonString();
        var res = await _api.RequestAsync("POST", $"/api/eeyes/device/tasks/{item.TaskId}/media", body);
        if (res.Code is >= 200 and < 300)
        {
            _queue.Remove(item.ClientMediaId);
            File.Delete(item.FilePath);
        }
        else
        {
            _queue.BumpAttempt(item.ClientMediaId);
        }
    }
}
