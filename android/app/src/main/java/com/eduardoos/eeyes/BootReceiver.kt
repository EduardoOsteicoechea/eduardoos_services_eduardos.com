package com.eduardoos.eeyes

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Restarts the live connection after reboot or an app update. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> {
                LiveSyncService.start(context)
                SyncScheduler.scheduleNext(context)
                SyncScheduler.enqueueWhenOnline(context)
            }
        }
    }
}
