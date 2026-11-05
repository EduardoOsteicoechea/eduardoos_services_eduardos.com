using eEyes.Desktop;
using Xunit;

namespace eEyes.Desktop.Tests;

public class BridgeRouterTests
{
    [Fact]
    public void Allowlists_device_paths_only()
    {
        Assert.True(BridgeRouter.IsAllowlistedPath("/api/eeyes/device/sync"));
        Assert.True(BridgeRouter.IsAllowlistedPath("/api/eeyes/device/tasks/abc/start"));
        Assert.True(BridgeRouter.IsAllowlistedPath("/api/eeyes/device/media/xyz"));
        Assert.False(BridgeRouter.IsAllowlistedPath("/api/eeyes/pairings"));
        Assert.False(BridgeRouter.IsAllowlistedPath("/api/auth/me"));
    }
}
