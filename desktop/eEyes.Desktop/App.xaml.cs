namespace eEyes.Desktop;

public partial class App : System.Windows.Application
{
    protected override void OnStartup(System.Windows.StartupEventArgs e)
    {
        DispatcherUnhandledException += (_, args) =>
        {
            WriteStartup(args.Exception);
            System.Windows.MessageBox.Show(args.Exception.Message, "eEyes");
            args.Handled = true;
        };
        base.OnStartup(e);
        var args = e.Args;
        for (var i = 0; i < args.Length; i++)
        {
            if (args[i] == "--apply-update" && i + 1 < args.Length)
            {
                UpdateHelper.ApplyUpdateAndRelaunch(args[i + 1]);
                Shutdown();
                return;
            }
        }
    }

    private static void WriteStartup(Exception ex)
    {
        try
        {
            File.AppendAllText(Path.Combine(Config.AppDataDir, "startup.log"), ex + Environment.NewLine);
        }
        catch
        {
            /* the message box is the user-facing report */
        }
    }
}
