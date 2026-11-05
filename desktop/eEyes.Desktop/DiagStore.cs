using System.Text.Json.Nodes;

namespace eEyes.Desktop;

/// <summary>Non-secret sync/notification diagnostics shown in the UI "Diagnóstico" panel.</summary>
internal static class DiagStore
{
    private static readonly object Gate = new();
    private static DateTimeOffset? _lastSyncAt;
    private static string _lastSyncSource = "";
    private static int _lastSyncHttp;
    private static string _lastSyncError = "";
    private static int _lastSyncNotifications;
    private static JsonArray _lastSyncSummary = new();
    private static DateTimeOffset? _lastNotificationAt;
    private static string _lastNotificationKey = "";
    private static DateTimeOffset? _liveAt;
    private static string _liveState = "sin iniciar";
    private static int _liveHttp;
    private static DateTimeOffset? _lastCaptureAt;
    private static string _lastCaptureKey = "";
    private static string _lastCaptureFacing = "";
    private static string _lastCaptureError = "";

    public static void RecordLive(string state, int code)
    {
        lock (Gate)
        {
            _liveAt = DateTimeOffset.UtcNow;
            _liveState = state;
            _liveHttp = code;
        }
    }

    public static void RecordSync(string source, int code, string? error, JsonArray? notifications)
    {
        var summary = new JsonArray();
        if (notifications is not null)
        {
            foreach (var n in notifications.Take(10))
            {
                summary.Add(new JsonObject
                {
                    ["title"] = n?["title"]?.GetValue<string>() ?? "",
                    ["at"] = n?["at"]?.GetValue<string>() ?? "",
                });
            }
        }
        lock (Gate)
        {
            _lastSyncAt = DateTimeOffset.UtcNow;
            _lastSyncSource = source;
            _lastSyncHttp = code;
            _lastSyncError = error ?? "";
            _lastSyncNotifications = notifications?.Count ?? 0;
            _lastSyncSummary = summary;
        }
    }

    public static void RecordNotification(string key)
    {
        lock (Gate)
        {
            _lastNotificationAt = DateTimeOffset.UtcNow;
            _lastNotificationKey = key;
        }
    }

    public static void RecordCapture(string key, string facing, string? error)
    {
        lock (Gate)
        {
            _lastCaptureAt = DateTimeOffset.UtcNow;
            _lastCaptureKey = key;
            _lastCaptureFacing = facing;
            _lastCaptureError = error ?? "";
        }
    }

    public static JsonObject ToJson()
    {
        lock (Gate)
        {
            return new JsonObject
            {
                ["lastCaptureAt"] = _lastCaptureAt?.ToString("o") ?? "nunca",
                ["lastCaptureKey"] = _lastCaptureKey,
                ["lastCaptureFacing"] = _lastCaptureFacing,
                ["lastCaptureError"] = _lastCaptureError,
                ["liveState"] = _liveState,
                ["liveAt"] = _liveAt?.ToString("o") ?? "nunca",
                ["liveHttp"] = _liveHttp,
                ["lastSyncAt"] = _lastSyncAt?.ToString("o") ?? "nunca",
                ["lastSyncSource"] = _lastSyncSource,
                ["lastSyncHttp"] = _lastSyncHttp,
                ["lastSyncError"] = _lastSyncError,
                ["lastSyncNotifications"] = _lastSyncNotifications,
                ["lastSyncSummary"] = _lastSyncSummary.ToJsonString(),
                ["lastNotificationAt"] = _lastNotificationAt?.ToString("o") ?? "nunca",
                ["lastNotificationKey"] = _lastNotificationKey,
            };
        }
    }
}
