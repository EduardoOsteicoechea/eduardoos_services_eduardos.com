using System.Text.Json;
using System.Text.Json.Nodes;

namespace eEyes.Desktop;

internal sealed record QueueItem(
    string ClientMediaId,
    string TaskId,
    string Kind,
    string Mime,
    string FilePath,
    string Sha256,
    string CapturedAt,
    int Width = 0,
    int Height = 0,
    int DurationMs = 0,
    int Attempts = 0);

internal sealed class MediaQueue
{
    private readonly string _path = Path.Combine(Config.AppDataDir, "upload_queue.json");
    private readonly object _gate = new();

    public void Enqueue(QueueItem item)
    {
        lock (_gate)
        {
            var arr = Load();
            arr.Add(ToNode(item));
            Save(arr);
        }
    }

    public IReadOnlyList<QueueItem> Snapshot()
    {
        lock (_gate)
        {
            return Load().Select(FromNode).ToList();
        }
    }

    public void Remove(string clientMediaId)
    {
        lock (_gate)
        {
            var next = new JsonArray();
            foreach (var n in Load())
            {
                if (n?["clientMediaId"]?.GetValue<string>() != clientMediaId) next.Add(n?.DeepClone());
            }
            Save(next);
        }
    }

    public void BumpAttempt(string clientMediaId)
    {
        lock (_gate)
        {
            var arr = Load();
            foreach (var n in arr)
            {
                if (n?["clientMediaId"]?.GetValue<string>() == clientMediaId)
                {
                    var attempts = n["attempts"]?.GetValue<int>() ?? 0;
                    n["attempts"] = attempts + 1;
                }
            }
            Save(arr);
        }
    }

    public void Clear()
    {
        lock (_gate)
        {
            if (File.Exists(_path)) File.Delete(_path);
        }
    }

    public static long BackoffMs(int attempts)
    {
        var shift = Math.Min(attempts, 6);
        var baseMs = 2000L * (1L << shift);
        return Math.Min(baseMs, 5 * 60_000L);
    }

    private JsonArray Load()
    {
        if (!File.Exists(_path)) return new JsonArray();
        try
        {
            return JsonNode.Parse(File.ReadAllText(_path)) as JsonArray ?? new JsonArray();
        }
        catch
        {
            return new JsonArray();
        }
    }

    private void Save(JsonArray arr) => File.WriteAllText(_path, arr.ToJsonString());

    private static JsonObject ToNode(QueueItem i) => new()
    {
        ["clientMediaId"] = i.ClientMediaId,
        ["taskId"] = i.TaskId,
        ["kind"] = i.Kind,
        ["mime"] = i.Mime,
        ["filePath"] = i.FilePath,
        ["sha256"] = i.Sha256,
        ["capturedAt"] = i.CapturedAt,
        ["width"] = i.Width,
        ["height"] = i.Height,
        ["durationMs"] = i.DurationMs,
        ["attempts"] = i.Attempts,
    };

    private static QueueItem FromNode(JsonNode? n) => new(
        n?["clientMediaId"]?.GetValue<string>() ?? "",
        n?["taskId"]?.GetValue<string>() ?? "",
        n?["kind"]?.GetValue<string>() ?? "",
        n?["mime"]?.GetValue<string>() ?? "",
        n?["filePath"]?.GetValue<string>() ?? "",
        n?["sha256"]?.GetValue<string>() ?? "",
        n?["capturedAt"]?.GetValue<string>() ?? "",
        n?["width"]?.GetValue<int>() ?? 0,
        n?["height"]?.GetValue<int>() ?? 0,
        n?["durationMs"]?.GetValue<int>() ?? 0,
        n?["attempts"]?.GetValue<int>() ?? 0);
}
