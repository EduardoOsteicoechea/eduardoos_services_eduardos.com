package com.eduardoos.eeyes

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

/** Periodic fallback when the live connection service is not running. */
class SyncWorker(appContext: Context, params: WorkerParameters) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result =
        when (DeviceSync.run(applicationContext, "worker")) {
            DeviceSync.Outcome.RETRY -> Result.retry()
            else -> Result.success()
        }
}
