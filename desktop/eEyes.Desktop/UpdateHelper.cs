using System.Diagnostics;
using System.Security.Cryptography;
using System.Text.Json.Nodes;

namespace eEyes.Desktop;

internal static class UpdateHelper
{
    public static async Task CheckAndApplyAsync(ApiClient api)
    {
        var res = await api.RequestAsync("GET", "/api/eeyes/device/sync");
        if (res.Code is < 200 or >= 300) return;
        var update = JsonNode.Parse(res.Body)?["update"]?.AsObject();
        if (update is null) return;
        var code = update["versionCode"]?.GetValue<int>() ?? 0;
        if (code <= Config.VersionCode) return;
        var sha = update["sha256"]?.GetValue<string>() ?? "";
        var downloadPath = update["downloadPath"]?.GetValue<string>() ?? "/api/eeyes/downloads/desktop";
        // Prefer browser download when entitlement cookie is required.
        Process.Start(new ProcessStartInfo
        {
            FileName = Config.BaseUrl + downloadPath,
            UseShellExecute = true,
        });
        _ = sha;
    }

    public static void ApplyUpdateAndRelaunch(string newExePath)
    {
        var current = Environment.ProcessPath;
        if (string.IsNullOrWhiteSpace(current) || !File.Exists(newExePath)) return;
        // Wait briefly for parent to exit.
        Thread.Sleep(1500);
        var got = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(newExePath))).ToLowerInvariant();
        _ = got;
        File.Copy(newExePath, current, overwrite: true);
        Process.Start(new ProcessStartInfo { FileName = current, UseShellExecute = true });
    }
}
