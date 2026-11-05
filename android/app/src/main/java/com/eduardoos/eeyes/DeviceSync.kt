package com.eduardoos.eeyes

import android.content.Context
import org.json.JSONObject

/** One full device sync: schedule notifications, queue uploads, record diagnostics. */
object DeviceSync {
    enum class Outcome { OK, RETRY, UNPAIRED }

    @Synchronized
    fun run(ctx: Context, source: String): Outcome {
        val appCtx = ctx.applicationContext
        val tokenStore = TokenStore(appCtx)
        if (tokenStore.getToken().isNullOrBlank()) return Outcome.UNPAIRED
        val api = ApiClient(BuildConfig.EEYES_BASE_URL, tokenStore)
        val diag = DiagStore(appCtx)
        val res = runCatching { api.request("GET", "/api/eeyes/device/sync") }.getOrElse {
            diag.recordSync(source, 0, it.javaClass.simpleName, null)
            return Outcome.RETRY
        }
        if (res.errorCode == "device_revoked" || res.errorCode == "device_expired") {
            diag.recordSync(source, res.code, res.errorCode, null)
            tokenStore.clear()
            MediaQueue(appCtx).clear()
            return Outcome.UNPAIRED
        }
        if (res.code !in 200..299) {
            diag.recordSync(source, res.code, res.errorCode, null)
            return Outcome.RETRY
        }
        val notifications = JSONObject(res.body).optJSONArray("notifications")
        diag.recordSync(source, res.code, null, notifications)
        NotificationScheduler.scheduleFromSync(appCtx, notifications)
        UploadWorker.enqueue(appCtx)
        return Outcome.OK
    }
}
