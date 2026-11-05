using System.Text.Json.Nodes;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using Microsoft.Win32;
using Windows.Security.Credentials.UI;

namespace eEyes.Desktop;

public partial class MainWindow : Window
{
    private readonly TokenStore _tokens = new();
    private readonly MediaQueue _queue = new();
    private ApiClient _api = null!;
    private CaptureService _capture = null!;
    private System.Windows.Forms.NotifyIcon? _tray;
    private readonly CancellationTokenSource _live = new();
    private static readonly TimeSpan MinBackoff = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan MaxBackoff = TimeSpan.FromSeconds(60);
    private string? _pairCode1;
    private string? _pairSession;

    public MainWindow()
    {
        InitializeComponent();
        _api = new ApiClient(_tokens);
        _capture = new CaptureService(_queue, _api);
        Loaded += OnLoaded;
        Closed += (_, _) =>
        {
            _live.Cancel();
            _tray?.Dispose();
        };
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        await WebView.EnsureCoreWebView2Async();
        WebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        WebView.CoreWebView2.Settings.AreDevToolsEnabled = false;
        WebView.CoreWebView2.NavigationStarting += (_, args) =>
        {
            if (!args.Uri.StartsWith(Config.BaseUrl + "/api/eeyes/ui", StringComparison.OrdinalIgnoreCase))
            {
                args.Cancel = true;
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                {
                    FileName = args.Uri,
                    UseShellExecute = true,
                });
            }
        };
        WebView.CoreWebView2.WebMessageReceived += OnWebMessage;
        var url = $"{Config.BaseUrl}/api/eeyes/ui?platform=desktop&shellVersion={Uri.EscapeDataString(Config.ShellVersion)}";
        WebView.Source = new Uri(url);

        _tray = new System.Windows.Forms.NotifyIcon
        {
            Visible = true,
            Text = "eEyes",
            Icon = System.Drawing.Icon.ExtractAssociatedIcon(Environment.ProcessPath!) ?? System.Drawing.SystemIcons.Application,
        };

        _ = Task.Run(() => LiveLoopAsync(_live.Token));
    }

    /// <summary>
    /// Long-poll on /device/wait: the server answers as soon as the hub changes this
    /// device's tasks (or after ~50 s), then a sync runs. Same contract as Android.
    /// </summary>
    private async Task LiveLoopAsync(CancellationToken ct)
    {
        var version = "";
        var lastSync = DateTimeOffset.MinValue;
        var backoff = MinBackoff;
        while (!ct.IsCancellationRequested)
        {
            try
            {
                if (_tokens.GetToken() is null)
                {
                    await Task.Delay(TimeSpan.FromSeconds(5), ct);
                    continue;
                }
                var res = await _api.RequestAsync("GET", "/api/eeyes/device/wait?v=" + Uri.EscapeDataString(version));
                if (res.Code is >= 200 and < 300)
                {
                    backoff = MinBackoff;
                    var body = JsonNode.Parse(res.Body);
                    version = body?["v"]?.GetValue<string>() ?? "";
                    var changed = body?["changed"]?.GetValue<bool>() ?? false;
                    if (changed || DateTimeOffset.UtcNow - lastSync > TimeSpan.FromSeconds(30))
                    {
                        await SyncOnceAsync("live");
                        lastSync = DateTimeOffset.UtcNow;
                    }
                    DiagStore.RecordLive("conectado", res.Code);
                    continue;
                }
                Dispatcher.Invoke(() => HandleAuth(res));
                DiagStore.RecordLive("error " + (res.ErrorCode ?? "red"), res.Code);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                DiagStore.RecordLive("error " + ex.GetType().Name, 0);
            }
            try
            {
                await Task.Delay(backoff, ct);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            backoff = TimeSpan.FromTicks(Math.Min(backoff.Ticks * 2, MaxBackoff.Ticks));
        }
    }

    private async Task SyncOnceAsync(string source)
    {
        var res = await _api.RequestAsync("GET", "/api/eeyes/device/sync");
        Dispatcher.Invoke(() => HandleAuth(res));
        if (res.Code is < 200 or >= 300)
        {
            DiagStore.RecordSync(source, res.Code, res.ErrorCode, null);
            return;
        }
        var notifications = JsonNode.Parse(res.Body)?["notifications"] as JsonArray;
        DiagStore.RecordSync(source, res.Code, null, notifications);
        var acks = NotificationService.ScheduleFromSync(notifications);
        await NotificationService.AckAsync(_api, acks);
        await _capture.FlushQueueAsync();
    }

    private async void OnWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        string reply;
        string? id = null;
        try
        {
            var msg = JsonNode.Parse(e.TryGetWebMessageAsString())?.AsObject();
            if (msg is null) return;
            id = msg["id"]?.GetValue<string>();
            var type = msg["type"]?.GetValue<string>() ?? "";
            var payload = msg["payload"]?.AsObject() ?? new JsonObject();
            reply = type switch
            {
                "getState" => BridgeRouter.Reply(id, "state", await BuildStateAsync()),
                "pairStep" => await PairStepAsync(id, payload),
                "getDiagnostics" => BridgeRouter.Reply(id, "state", Diagnostics()),
                "testNotification" => TestNotification(id),
                "startTask" => await StartTaskAsync(id, payload),
                "capturePhoto" => await CapturePhotoAsync(id, payload),
                "startAutoCapture" => StartAuto(id, payload),
                "stopAutoCapture" => StopAuto(id),
                "recordAudio" => await RecordAudioAsync(id, payload),
                "completeTask" => await CompleteAsync(id, payload),
                "request" => await ProxyRequestAsync(id, payload),
                "openExternal" => await OpenExternalAsync(id, payload),
                _ => BridgeRouter.Reply(id, "state", error: "unknown_type"),
            };
        }
        catch
        {
            reply = BridgeRouter.Reply(id, "state", error: "bridge_error");
        }
        WebView.CoreWebView2.PostWebMessageAsString(reply);
    }

    /// <summary>Windows Hello (face, fingerprint or PIN); returns null on success or an error code.</summary>
    private static async Task<string?> AuthenticateUserAsync()
    {
        var availability = await UserConsentVerifier.CheckAvailabilityAsync();
        if (availability != UserConsentVerifierAvailability.Available) return "biometric_unavailable";
        var result = await UserConsentVerifier.RequestVerificationAsync("Confirma que eres tú para vincular eEyes");
        return result == UserConsentVerificationResult.Verified ? null : "biometric_failed";
    }

    private static string InstallId()
    {
        try
        {
            using var key = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64)
                .OpenSubKey(@"SOFTWARE\Microsoft\Cryptography");
            return key?.GetValue("MachineGuid") as string ?? Environment.MachineName;
        }
        catch
        {
            return Environment.MachineName;
        }
    }

    private async Task<string> PairStepAsync(string? id, JsonObject payload)
    {
        var step = payload["step"]?.GetValue<int>() ?? 0;
        var code = (payload["code"]?.GetValue<string>() ?? "").Trim();
        if (step == 1)
        {
            _pairCode1 = null;
            _pairSession = null;
            var authError = await AuthenticateUserAsync();
            if (authError is not null) return BridgeRouter.Reply(id, "state", error: authError);
            _pairCode1 = code;
        }
        if (string.IsNullOrEmpty(_pairCode1) || step is < 1 or > 3)
            return BridgeRouter.Reply(id, "state", error: "pairing_invalid");

        var res = await _api.PairStepAsync(step, _pairCode1, code, _pairSession, InstallId());
        if (res.Code is < 200 or >= 300)
        {
            if (step == 1) _pairCode1 = null;
            return BridgeRouter.Reply(id, "state", error: res.ErrorCode ?? "pairing_invalid");
        }
        if (step == 1)
        {
            try { _pairSession = JsonNode.Parse(res.Body)?["session"]?.GetValue<string>(); }
            catch { _pairSession = null; }
        }
        if (step == 3)
        {
            _pairCode1 = null;
            _pairSession = null;
            return BridgeRouter.Reply(id, "state", await BuildStateAsync());
        }
        return BridgeRouter.Reply(id, "state", new JsonObject { ["step"] = step });
    }

    private JsonObject Diagnostics()
    {
        var o = DiagStore.ToJson();
        o["version"] = Config.ShellVersion;
        o["versionCode"] = Config.VersionCode;
        o["paired"] = _tokens.GetToken() is not null;
        o["server"] = Config.BaseUrl;
        return o;
    }

    private static string TestNotification(string? id)
    {
        NotificationService.Show("eEyes · prueba", "Si ves esto, las notificaciones funcionan.", "");
        DiagStore.RecordNotification("test");
        return BridgeRouter.Reply(id, "state", new JsonObject { ["shown"] = true });
    }

    private async Task<string> StartTaskAsync(string? id, JsonObject payload)
    {
        var taskId = payload["taskId"]?.GetValue<string>() ?? "";
        var res = await _api.RequestAsync("POST", $"/api/eeyes/device/tasks/{taskId}/start", "{}");
        HandleAuth(res);
        return BridgeRouter.Reply(id, "state", await BuildStateAsync(), res.Code >= 400 ? res.ErrorCode : null);
    }

    private async Task<string> CapturePhotoAsync(string? id, JsonObject payload)
    {
        await _capture.CapturePhotoAsync(payload["taskId"]?.GetValue<string>() ?? "");
        UpdateTrayBanner();
        return BridgeRouter.Reply(id, "state", new JsonObject { ["ok"] = true });
    }

    private string StartAuto(string? id, JsonObject payload)
    {
        _capture.StartAuto(
            payload["taskId"]?.GetValue<string>() ?? "",
            payload["intervalSec"]?.GetValue<int>() ?? 5,
            payload["maxPhotos"]?.GetValue<int>() ?? 10);
        UpdateTrayBanner();
        return BridgeRouter.Reply(id, "state", new JsonObject { ["ok"] = true });
    }

    private string StopAuto(string? id)
    {
        _capture.StopAuto();
        UpdateTrayBanner();
        return BridgeRouter.Reply(id, "state", new JsonObject { ["ok"] = true });
    }

    private async Task<string> RecordAudioAsync(string? id, JsonObject payload)
    {
        await _capture.RecordAudioAsync(
            payload["taskId"]?.GetValue<string>() ?? "",
            payload["seconds"]?.GetValue<int>() ?? 15);
        UpdateTrayBanner();
        return BridgeRouter.Reply(id, "state", new JsonObject { ["ok"] = true });
    }

    private async Task<string> CompleteAsync(string? id, JsonObject payload)
    {
        _capture.StopAuto();
        var taskId = payload["taskId"]?.GetValue<string>() ?? "";
        var res = await _api.RequestAsync("POST", $"/api/eeyes/device/tasks/{taskId}/complete", "{}");
        HandleAuth(res);
        UpdateTrayBanner();
        return BridgeRouter.Reply(id, "state", await BuildStateAsync(), res.Code >= 400 ? res.ErrorCode : null);
    }

    private async Task<string> ProxyRequestAsync(string? id, JsonObject payload)
    {
        var path = payload["path"]?.GetValue<string>() ?? "";
        if (!BridgeRouter.IsAllowlistedPath(path))
            return BridgeRouter.Reply(id, "state", error: "forbidden");
        var method = payload["method"]?.GetValue<string>() ?? "GET";
        var body = payload["body"]?.GetValue<string>();
        var res = await _api.RequestAsync(method, path, string.IsNullOrWhiteSpace(body) ? null : body);
        HandleAuth(res);
        return BridgeRouter.Reply(id, "state", new JsonObject { ["status"] = res.Code, ["body"] = res.Body }, res.ErrorCode);
    }

    private async Task<string> OpenExternalAsync(string? id, JsonObject payload)
    {
        var url = payload["url"]?.GetValue<string>() ?? "";
        if (url == "eeyes://update") await UpdateHelper.CheckAndApplyAsync(_api);
        else if (url.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
            {
                FileName = url,
                UseShellExecute = true,
            });
        }
        return BridgeRouter.Reply(id, "state", new JsonObject { ["ok"] = true });
    }

    private async Task<JsonObject> BuildStateAsync()
    {
        var paired = _tokens.GetToken() is not null;
        var tasks = new JsonArray();
        if (paired)
        {
            var res = await _api.RequestAsync("GET", "/api/eeyes/device/sync");
            HandleAuth(res);
            if (res.Code is < 200 or >= 300) DiagStore.RecordSync("app", res.Code, res.ErrorCode, null);
            if (res.Code is >= 200 and < 300)
            {
                var root = JsonNode.Parse(res.Body);
                if (root?["tasks"] is JsonArray arr)
                {
                    foreach (var t in arr) tasks.Add(t?.DeepClone());
                }
                var notifications = root?["notifications"] as JsonArray;
                DiagStore.RecordSync("app", res.Code, null, notifications);
                var acks = NotificationService.ScheduleFromSync(notifications);
                await NotificationService.AckAsync(_api, acks);
                if (root?["update"] is JsonObject update &&
                    (update["versionCode"]?.GetValue<int>() ?? 0) > Config.VersionCode)
                {
                    WebView.CoreWebView2.PostWebMessageAsString(
                        BridgeRouter.Reply(null, "updateAvailable", update));
                }
            }
        }
        return new JsonObject
        {
            ["paired"] = paired,
            ["platform"] = "desktop",
            ["shellVersion"] = Config.ShellVersion,
            ["tasks"] = tasks,
            ["capturing"] = _capture.IsCapturing,
        };
    }

    private void HandleAuth(ApiClient.Response res)
    {
        if (res.ErrorCode is "device_revoked" or "device_expired")
        {
            _tokens.Clear();
            _queue.Clear();
            WebView.CoreWebView2.PostWebMessageAsString(BridgeRouter.Reply(null, "revoked"));
        }
    }

    private void UpdateTrayBanner()
    {
        if (_tray is null) return;
        _tray.Text = _capture.IsCapturing ? "eEyes · captura activa" : "eEyes";
        Dispatcher.Invoke(() =>
        {
            Title = _capture.IsCapturing ? "eEyes — captura activa" : "eEyes";
        });
    }
}
