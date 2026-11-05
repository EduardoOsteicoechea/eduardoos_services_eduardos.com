using System.Text.Json.Nodes;
using Microsoft.Toolkit.Uwp.Notifications;

namespace eEyes.Desktop;

internal static class NotificationService
{
    // Sync runs every 30s; keys already shown or scheduled in this process are skipped
    // so a toast is not duplicated while the ack is in flight.
    private static readonly HashSet<string> Handled = new(StringComparer.Ordinal);
    private static readonly HashSet<string> PendingAck = new(StringComparer.Ordinal);
    private static readonly Dictionary<string, DateTimeOffset> Scheduled = new(StringComparer.Ordinal);
    private static readonly object Gate = new();

    /// <summary>
    /// Shows due notifications, schedules upcoming ones, and returns keys to ack.
    /// Scheduled toasts are acked only once their time has passed.
    /// </summary>
    public static List<string> ScheduleFromSync(JsonArray? notifications)
    {
        var handledNow = new List<string>();
        lock (Gate)
        {
            foreach (var (key, at) in Scheduled.ToList())
            {
                if (at > DateTimeOffset.UtcNow) continue;
                Scheduled.Remove(key);
                DiagStore.RecordNotification(key);
                handledNow.Add(key);
            }
        }
        if (notifications is null) return handledNow;
        foreach (var n in notifications)
        {
            var key = n?["key"]?.GetValue<string>() ?? "";
            if (key.Length == 0) continue;
            lock (Gate)
            {
                if (!Handled.Add(key)) continue;
            }
            var title = n?["title"]?.GetValue<string>() ?? "eEyes";
            var body = n?["body"]?.GetValue<string>() ?? "";
            var taskId = n?["taskId"]?.GetValue<string>() ?? "";
            var atRaw = n?["at"]?.GetValue<string>();
            DateTimeOffset at;
            if (!DateTimeOffset.TryParse(atRaw, out at)) at = DateTimeOffset.UtcNow;
            if (at <= DateTimeOffset.UtcNow)
            {
                Show(title, body, taskId);
                DiagStore.RecordNotification(key);
                handledNow.Add(key);
            }
            else
            {
                new ToastContentBuilder()
                    .AddText(title)
                    .AddText(body)
                    .AddArgument("taskId", taskId)
                    .Schedule(at.LocalDateTime);
                lock (Gate) Scheduled[key] = at;
            }
        }
        return handledNow;
    }

    public static async Task AckAsync(ApiClient api, List<string> keys)
    {
        List<string> batch;
        lock (Gate)
        {
            foreach (var k in keys) PendingAck.Add(k);
            batch = PendingAck.ToList();
        }
        if (batch.Count == 0) return;
        var payload = new JsonObject { ["keys"] = new JsonArray(batch.Select(k => (JsonNode?)JsonValue.Create(k)).ToArray()) };
        try
        {
            var res = await api.RequestAsync("POST", "/api/eeyes/device/notifications/ack", payload.ToJsonString());
            if (res.Code is < 200 or >= 300) return;
        }
        catch
        {
            return;
        }
        lock (Gate)
        {
            foreach (var k in batch) PendingAck.Remove(k);
        }
    }

    public static void Show(string title, string body, string taskId)
    {
        new ToastContentBuilder()
            .AddText(title)
            .AddText(body)
            .AddArgument("taskId", taskId)
            .Show();
    }
}
