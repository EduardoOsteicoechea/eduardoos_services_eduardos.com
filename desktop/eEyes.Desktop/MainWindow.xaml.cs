using System.Text.Json.Nodes;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace eEyes.Desktop;

public partial class MainWindow : Window
{
    private readonly TokenStore _tokens = new();
    private readonly MediaQueue _queue = new();
    private ApiClient _api = null!;
    private CaptureService _capture = null!;
    private System.Windows.Forms.NotifyIcon? _tray;
    private System.Threading.Timer? _syncTimer;

    public MainWindow()
    {
        InitializeComponent();
        _api = new ApiClient(_tokens);
        _capture = new CaptureService(_queue, _api);
        Loaded += OnLoaded;
        Closed += (_, _) =>
        {
            _syncTimer?.Dispose();
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
            Icon = System.Drawing.SystemIcons.Application,
        };

        _syncTimer = new System.Threading.Timer(async _ =>
        {
            try
            {
                if (_tokens.GetToken() is null) return;
                var res = await _api.RequestAsync("GET", "/api/eeyes/device/sync");
                HandleAuth(res);
                if (res.Code is >= 200 and < 300)
                {
                    var root = JsonNode.Parse(res.Body);
                    var acks = NotificationService.ScheduleFromSync(root?["notifications"] as JsonArray);
                    await NotificationService.AckAsync(_api, acks);
                    await _capture.FlushQueueAsync();
                }
            }
            catch { /* ignore background sync errors */ }
        }, null, TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(30));
    }

    private async void OnWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        string reply;
        try
        {
            var msg = JsonNode.Parse(e.TryGetWebMessageAsString())?.AsObject();
            if (msg is null) return;
            var id = msg["id"]?.GetValue<string>();
            var type = msg["type"]?.GetValue<string>() ?? "";
            var payload = msg["payload"]?.AsObject() ?? new JsonObject();
            reply = type switch
            {
                "getState" => BridgeRouter.Reply(id, "state", await BuildStateAsync()),
                "pair" => await PairAsync(id, payload),
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
            reply = BridgeRouter.Reply(null, "state", error: "bridge_error");
        }
        WebView.CoreWebView2.PostWebMessageAsString(reply);
    }

    private async Task<string> PairAsync(string? id, JsonObject payload)
    {
        var res = await _api.PairAsync(
            payload["code1"]?.GetValue<string>() ?? "",
            payload["code2"]?.GetValue<string>() ?? "",
            payload["code3"]?.GetValue<string>() ?? "");
        if (res.Code is >= 200 and < 300) return BridgeRouter.Reply(id, "state", await BuildStateAsync());
        return BridgeRouter.Reply(id, "state", error: res.ErrorCode ?? "pairing_invalid");
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
            if (res.Code is >= 200 and < 300)
            {
                var root = JsonNode.Parse(res.Body);
                if (root?["tasks"] is JsonArray arr)
                {
                    foreach (var t in arr) tasks.Add(t?.DeepClone());
                }
                var acks = NotificationService.ScheduleFromSync(root?["notifications"] as JsonArray);
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
