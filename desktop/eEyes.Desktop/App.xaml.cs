namespace eEyes.Desktop;

public partial class App : System.Windows.Application
{
    protected override void OnStartup(System.Windows.StartupEventArgs e)
    {
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
}
