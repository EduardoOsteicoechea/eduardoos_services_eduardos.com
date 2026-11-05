package com.eduardoos.eeyes

import android.content.Context
import android.util.Base64
import org.json.JSONObject
import java.io.File
import java.time.Instant
import kotlin.concurrent.thread

/** Persists captured media in the retry queue, then tries an immediate upload. */
object MediaUploader {
    fun enqueue(ctx: Context, taskId: String, kind: String, mime: String, bytes: ByteArray, durationMs: Int) {
        val app = ctx.applicationContext
        val clientId = MediaQueue.newClientId()
        val dir = File(app.cacheDir, "media").also { it.mkdirs() }
        val out = File(dir, "$clientId.bin")
        out.writeBytes(bytes)
        val item = QueueItem(
            clientMediaId = clientId,
            taskId = taskId,
            kind = kind,
            mime = mime,
            filePath = out.absolutePath,
            sha256 = MediaCompressor.sha256Hex(bytes),
            durationMs = durationMs,
            capturedAt = Instant.now().toString(),
        )
        MediaQueue(app).enqueue(item)
        UploadWorker.enqueue(app)
        thread { flush(app, item) }
    }

    fun flush(ctx: Context, item: QueueItem): Boolean {
        val file = File(item.filePath)
        if (!file.exists()) {
            MediaQueue(ctx).remove(item.clientMediaId)
            return true
        }
        val api = ApiClient(BuildConfig.EEYES_BASE_URL, TokenStore(ctx))
        val body = JSONObject()
            .put("clientMediaId", item.clientMediaId)
            .put("kind", item.kind)
            .put("mime", item.mime)
            .put("capturedAt", item.capturedAt)
            .put("durationMs", item.durationMs)
            .put("sha256", item.sha256)
            .put("dataBase64", Base64.encodeToString(file.readBytes(), Base64.NO_WRAP))
            .toString()
        val res = runCatching { api.request("POST", "/api/eeyes/device/tasks/${item.taskId}/media", body) }.getOrNull()
        if (res != null && res.code in 200..299) {
            MediaQueue(ctx).remove(item.clientMediaId)
            file.delete()
            return true
        }
        MediaQueue(ctx).bumpAttempt(item.clientMediaId)
        return false
    }
}
