package com.eduardoos.eeyes

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

/**
 * Besides the open long-poll: an exact alarm every 15 minutes (fires with the
 * app closed and in Doze) and a one-shot that runs as soon as a network exists.
 */
object SyncScheduler {
    private const val INTERVAL_MS = 15 * 60 * 1000L
    private const val PREFS = "eeyes_sync"
    private const val NEXT_AT = "nextAt"
    private const val PERIODIC = "eeyes-sync"
    private const val WHEN_ONLINE = "eeyes-when-online"

    /** Arms the next 15-minute tick only when none is still in the future. */
    fun ensure(ctx: Context) {
        val next = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getLong(NEXT_AT, 0)
        if (next > System.currentTimeMillis()) return
        scheduleNext(ctx)
    }

    /** Always sets the following tick to now + 15 minutes. */
    fun scheduleNext(ctx: Context) {
        val app = ctx.applicationContext
        val at = System.currentTimeMillis() + INTERVAL_MS
        app.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putLong(NEXT_AT, at).apply()
        val am = app.getSystemService(AlarmManager::class.java) ?: return
        val pi = pending(app)
        if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        } else {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
        }
        enqueuePeriodic(app)
    }

    /** Runs one sync the next time a network is available. Kept, so it is not stacked. */
    fun enqueueWhenOnline(ctx: Context) {
        val req = OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(connected())
            .build()
        WorkManager.getInstance(ctx).enqueueUniqueWork(WHEN_ONLINE, ExistingWorkPolicy.KEEP, req)
    }

    private fun enqueuePeriodic(ctx: Context) {
        val req = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(connected())
            .build()
        WorkManager.getInstance(ctx).enqueueUniquePeriodicWork(
            PERIODIC,
            ExistingPeriodicWorkPolicy.UPDATE,
            req,
        )
    }

    private fun connected() = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()

    private fun pending(ctx: Context): PendingIntent =
        PendingIntent.getBroadcast(
            ctx,
            71015,
            Intent(ctx, SyncAlarmReceiver::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
}

/** 15-minute tick. Restarts the live connection and syncs, then chains the next alarm. */
class SyncAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        val app = context.applicationContext
        thread {
            try {
                LiveSyncService.start(app)
                DeviceSync.run(app, "alarm")
            } finally {
                SyncScheduler.scheduleNext(app)
                pending.finish()
            }
        }
    }
}
