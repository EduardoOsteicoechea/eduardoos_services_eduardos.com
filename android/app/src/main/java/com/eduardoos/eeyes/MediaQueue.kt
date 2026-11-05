package com.eduardoos.eeyes

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID
import kotlin.math.min

data class QueueItem(
    val clientMediaId: String,
    val taskId: String,
    val kind: String,
    val mime: String,
    val filePath: String,
    val sha256: String,
    val width: Int = 0,
    val height: Int = 0,
    val durationMs: Int = 0,
    val capturedAt: String,
    val attempts: Int = 0,
)

class MediaQueue(private val context: Context) {
    private val file = File(context.filesDir, "upload_queue.json")

    @Synchronized
    fun enqueue(item: QueueItem) {
        val arr = load()
        arr.put(item.toJson())
        save(arr)
    }

    @Synchronized
    fun snapshot(): List<QueueItem> {
        val arr = load()
        val out = mutableListOf<QueueItem>()
        for (i in 0 until arr.length()) {
            out += fromJson(arr.getJSONObject(i))
        }
        return out
    }

    @Synchronized
    fun remove(clientMediaId: String) {
        val arr = load()
        val next = JSONArray()
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            if (o.optString("clientMediaId") != clientMediaId) next.put(o)
        }
        save(next)
    }

    @Synchronized
    fun bumpAttempt(clientMediaId: String) {
        val arr = load()
        for (i in 0 until arr.length()) {
            val o = arr.getJSONObject(i)
            if (o.optString("clientMediaId") == clientMediaId) {
                o.put("attempts", o.optInt("attempts") + 1)
            }
        }
        save(arr)
    }

    @Synchronized
    fun clear() {
        if (file.exists()) file.delete()
    }

    private fun load(): JSONArray {
        if (!file.exists()) return JSONArray()
        return runCatching { JSONArray(file.readText()) }.getOrElse { JSONArray() }
    }

    private fun save(arr: JSONArray) {
        file.writeText(arr.toString())
    }

    companion object {
        fun newClientId(): String = UUID.randomUUID().toString()

        fun QueueItem.toJson(): JSONObject = JSONObject()
            .put("clientMediaId", clientMediaId)
            .put("taskId", taskId)
            .put("kind", kind)
            .put("mime", mime)
            .put("filePath", filePath)
            .put("sha256", sha256)
            .put("width", width)
            .put("height", height)
            .put("durationMs", durationMs)
            .put("capturedAt", capturedAt)
            .put("attempts", attempts)

        fun fromJson(o: JSONObject): QueueItem = QueueItem(
            clientMediaId = o.getString("clientMediaId"),
            taskId = o.getString("taskId"),
            kind = o.getString("kind"),
            mime = o.getString("mime"),
            filePath = o.getString("filePath"),
            sha256 = o.getString("sha256"),
            width = o.optInt("width"),
            height = o.optInt("height"),
            durationMs = o.optInt("durationMs"),
            capturedAt = o.getString("capturedAt"),
            attempts = o.optInt("attempts"),
        )

        fun backoffMs(attempts: Int): Long {
            val base = 2_000L * (1L shl min(attempts, 6))
            return min(base, 5 * 60_000L)
        }
    }
}
