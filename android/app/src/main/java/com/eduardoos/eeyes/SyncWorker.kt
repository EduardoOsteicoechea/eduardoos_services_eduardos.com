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
        val res = api.request("GET", "/api/eeyes/device/sync")
        if (res.errorCode == "device_revoked" || res.errorCode == "device_expired") {
            tokenStore.clear()
            MediaQueue(applicationContext).clear()
            return Result.success()
        }
        if (res.code !in 200..299) return Result.retry()
        val root = JSONObject(res.body)
        NotificationScheduler.scheduleFromSync(applicationContext, root.optJSONArray("notifications"))
        UploadWorker.enqueue(applicationContext)
        return Result.success()
    }
}
