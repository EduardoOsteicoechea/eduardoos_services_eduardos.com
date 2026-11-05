package com.eduardoos.eeyes

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

/** 15-minute and "back online" fallback. Revives the live connection, then syncs. */
class SyncWorker(appContext: Context, params: WorkerParameters) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        LiveSyncService.start(applicationContext)
        return when (DeviceSync.run(applicationContext, "worker")) {
            DeviceSync.Outcome.RETRY -> Result.retry()
            else -> Result.success()
        }
    }
}
