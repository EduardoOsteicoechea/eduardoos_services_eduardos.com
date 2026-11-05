using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace eEyes.Desktop;

internal static class BridgeRouter
{
    private static readonly HashSet<string> AllowExact = new(StringComparer.Ordinal)
    {
        "/api/eeyes/device/sync",
        "/api/eeyes/device/notifications/ack",
    };

    private static readonly Regex TaskAction = new(
        @"^/api/eeyes/device/tasks/[A-Za-z0-9_-]+/(start|media|complete)$",
        RegexOptions.Compiled);

    private static readonly Regex MediaGet = new(
        @"^/api/eeyes/device/media/[A-Za-z0-9_-]+$",
        RegexOptions.Compiled);

    public static bool IsAllowlistedPath(string path) =>
        AllowExact.Contains(path) || TaskAction.IsMatch(path) || MediaGet.IsMatch(path);

    public static string Reply(string? id, string type, JsonNode? payload = null, string? error = null)
    {
        var o = new JsonObject
        {
            ["type"] = type,
            ["payload"] = payload ?? new JsonObject(),
        };
        if (!string.IsNullOrWhiteSpace(id)) o["id"] = id;
        if (!string.IsNullOrWhiteSpace(error)) o["error"] = error;
        return o.ToJsonString();
    }
}
