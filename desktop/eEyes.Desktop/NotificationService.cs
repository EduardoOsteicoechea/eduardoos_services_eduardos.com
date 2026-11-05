using System.Text.Json.Nodes;
using Microsoft.Toolkit.Uwp.Notifications;

namespace eEyes.Desktop;

internal static class NotificationService
{
    public static void ScheduleFromSync(JsonArray? notifications)
    {
        if (notifications is null) return;
        foreach (var n in notifications)
        {
            var title = n?["title"]?.GetValue<string>() ?? "eEyes";
            var body = n?["body"]?.GetValue<string>() ?? "";
            var taskId = n?["taskId"]?.GetValue<string>() ?? "";
            var atRaw = n?["at"]?.GetValue<string>();
            DateTimeOffset at;
            if (!DateTimeOffset.TryParse(atRaw, out at)) at = DateTimeOffset.UtcNow;
            if (at <= DateTimeOffset.UtcNow)
            {
                Show(title, body, taskId);
            }
            else
            {
                // Unpacked toast schedule
                new ToastContentBuilder()
                    .AddText(title)
                    .AddText(body)
                    .AddArgument("taskId", taskId)
                    .Schedule(at.LocalDateTime);
            }
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
