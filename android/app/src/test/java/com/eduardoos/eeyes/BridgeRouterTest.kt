package com.eduardoos.eeyes

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BridgeRouterTest {
    @Test
    fun allowlistsDevicePaths() {
        assertTrue(BridgeRouter.isAllowlistedPath("/api/eeyes/device/sync"))
        assertTrue(BridgeRouter.isAllowlistedPath("/api/eeyes/device/tasks/abc123/start"))
        assertTrue(BridgeRouter.isAllowlistedPath("/api/eeyes/device/tasks/abc123/media"))
        assertTrue(BridgeRouter.isAllowlistedPath("/api/eeyes/device/media/xyz"))
        assertFalse(BridgeRouter.isAllowlistedPath("/api/eeyes/pairings"))
        assertFalse(BridgeRouter.isAllowlistedPath("/api/auth/me"))
    }
}
