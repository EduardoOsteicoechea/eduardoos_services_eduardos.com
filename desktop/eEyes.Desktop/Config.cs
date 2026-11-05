namespace eEyes.Desktop;

internal static class Config
{
    public static string BaseUrl { get; } =
        Environment.GetEnvironmentVariable("EEYES_BASE_URL")?.TrimEnd('/')
        ?? "https://eduardoos.com";

    public static string ShellVersion { get; } =
        typeof(Config).Assembly.GetName().Version?.ToString(3) ?? "1.0.0";

    public static int VersionCode
    {
        get
        {
            var v = typeof(Config).Assembly.GetName().Version;
            if (v is null) return 1;
            return v.Major * 10000 + v.Minor * 100 + v.Build;
        }
    }

    public static string AppDataDir
    {
        get
        {
            var dir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "eEyes");
            Directory.CreateDirectory(dir);
            return dir;
        }
    }
}
