package com.eduardoos.eeyes

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.json.JSONObject

class SyncWorker(appContext: Context, params: WorkerParameters) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        val tokenStore = TokenStore(applicationContext)
        if (tokenStore.getToken().isNullOrBlank()) return Result.success()
        val api = ApiClient(BuildConfig.EEYES_BASE_URL, tokenStore)
        val diag = DiagStore(applicationContext)
        val res = runCatching { api.request("GET", "/api/eeyes/device/sync") }.getOrElse {
            diag.recordSync("worker", 0, it.javaClass.simpleName, null)
            return Result.retry()
        }
        if (res.errorCode == "device_revoked" || res.errorCode == "device_expired") {
            diag.recordSync("worker", res.code, res.errorCode, null)
            tokenStore.clear()
            MediaQueue(applicationContext).clear()
            return Result.success()
        }
        if (res.code !in 200..299) {
            diag.recordSync("worker", res.code, res.errorCode, null)
            return Result.retry()
        }
        val root = JSONObject(res.body)
        val notifications = root.optJSONArray("notifications")
        diag.recordSync("worker", res.code, null, notifications)
        NotificationScheduler.scheduleFromSync(applicationContext, notifications)
        UploadWorker.enqueue(applicationContext)
        return Result.success()
    }
}
