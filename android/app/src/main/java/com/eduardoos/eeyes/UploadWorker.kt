package com.eduardoos.eeyes

import android.content.Context
import android.util.Base64
import androidx.work.CoroutineWorker
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

class UploadWorker(appContext: Context, params: WorkerParameters) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result {
        val queue = MediaQueue(applicationContext)
        val tokenStore = TokenStore(applicationContext)
        if (tokenStore.getToken().isNullOrBlank()) return Result.success()
        val api = ApiClient(BuildConfig.EEYES_BASE_URL, tokenStore)
        var retryDelay = 0L
        for (item in queue.snapshot()) {
            val file = File(item.filePath)
            if (!file.exists()) {
                queue.remove(item.clientMediaId)
                continue
            }
            val body = JSONObject()
                .put("clientMediaId", item.clientMediaId)
                .put("kind", item.kind)
                .put("mime", item.mime)
                .put("capturedAt", item.capturedAt)
                .put("durationMs", item.durationMs)
                .put("sha256", item.sha256)
                .put("dataBase64", Base64.encodeToString(file.readBytes(), Base64.NO_WRAP))
                .toString()
            val res = api.request("POST", "/api/eeyes/device/tasks/${item.taskId}/media", body)
            if (res.code in 200..299) {
                queue.remove(item.clientMediaId)
                file.delete()
            } else {
                queue.bumpAttempt(item.clientMediaId)
                retryDelay = MediaQueue.backoffMs(item.attempts + 1)
            }
        }
        if (retryDelay > 0) {
            WorkManager.getInstance(applicationContext).enqueue(
                OneTimeWorkRequestBuilder<UploadWorker>().setInitialDelay(retryDelay, TimeUnit.MILLISECONDS).build(),
            )
        }
        return Result.success()
    }

    companion object {
        fun enqueue(ctx: Context) {
            WorkManager.getInstance(ctx).enqueue(OneTimeWorkRequestBuilder<UploadWorker>().build())
        }
    }
}
