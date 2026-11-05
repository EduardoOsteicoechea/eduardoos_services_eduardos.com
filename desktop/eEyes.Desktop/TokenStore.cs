using System.Security.Cryptography;
using System.Text;

namespace eEyes.Desktop;

internal sealed class TokenStore
{
    private readonly string _path = Path.Combine(Config.AppDataDir, "device.token");

    public string? GetToken()
    {
        if (!File.Exists(_path)) return null;
        try
        {
            var protectedBytes = File.ReadAllBytes(_path);
            var plain = ProtectedData.Unprotect(protectedBytes, null, DataProtectionScope.CurrentUser);
            return Encoding.UTF8.GetString(plain);
        }
        catch
        {
            return null;
        }
    }

    public void SetToken(string token)
    {
        var plain = Encoding.UTF8.GetBytes(token);
        var protectedBytes = ProtectedData.Protect(plain, null, DataProtectionScope.CurrentUser);
        File.WriteAllBytes(_path, protectedBytes);
    }

    public void Clear()
    {
        if (File.Exists(_path)) File.Delete(_path);
        var queue = Path.Combine(Config.AppDataDir, "upload_queue.json");
        if (File.Exists(queue)) File.Delete(queue);
    }
}
