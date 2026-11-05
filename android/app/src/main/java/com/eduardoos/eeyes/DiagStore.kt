package com.eduardoos.eeyes

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** Non-secret sync/notification diagnostics shown in the UI "Diagnóstico" panel. */
class DiagStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences("eeyes_diag", Context.MODE_PRIVATE)

    fun recordSync(source: String, code: Int, error: String?, notifications: JSONArray?) {
        val summary = JSONArray()
        if (notifications != null) {
            for (i in 0 until minOf(notifications.length(), 10)) {
                val n = notifications.optJSONObject(i) ?: continue
                summary.put(JSONObject().put("title", n.optString("title")).put("at", n.optString("at")))
            }
        }
        prefs.edit()
            .putLong("lastSyncAt", System.currentTimeMillis())
            .putString("lastSyncSource", source)
            .putInt("lastSyncHttp", code)
            .putString("lastSyncError", error ?: "")
            .putInt("lastSyncNotifications", notifications?.length() ?: 0)
            .putString("lastSyncSummary", summary.toString())
            .apply()
    }

    fun recordNotification(key: String, shown: Boolean) {
        prefs.edit()
            .putLong("lastNotificationAt", System.currentTimeMillis())
            .putString("lastNotificationKey", key)
            .putBoolean("lastNotificationShown", shown)
            .apply()
    }

    fun recordLive(state: String, code: Int) {
        prefs.edit()
            .putLong("liveAt", System.currentTimeMillis())
            .putString("liveState", state)
            .putInt("liveHttp", code)
            .apply()
    }

    fun recordLiveCamera(ready: Boolean) {
        prefs.edit().putBoolean("liveCamera", ready).apply()
    }

    fun recordCapture(key: String, facing: String, error: String?) {
        prefs.edit()
            .putLong("lastCaptureAt", System.currentTimeMillis())
            .putString("lastCaptureKey", key)
            .putString("lastCaptureFacing", facing)
            .putString("lastCaptureError", error ?: "")
            .apply()
    }

    /** Keys already photographed, so a lost ack does not take the picture twice. */
    @Synchronized
    fun markCaptured(key: String) {
        val arr = capturedKeys()
        arr.put(key)
        while (arr.length() > MAX_CAPTURED_KEYS) arr.remove(0)
        prefs.edit().putString("capturedKeys", arr.toString()).apply()
    }

    fun wasCaptured(key: String): Boolean {
        val arr = capturedKeys()
        for (i in 0 until arr.length()) if (arr.optString(i) == key) return true
        return false
    }

    private fun capturedKeys(): JSONArray =
        runCatching { JSONArray(prefs.getString("capturedKeys", "[]")) }.getOrElse { JSONArray() }

    /** Returns true only the first time, so the battery prompt is shown once. */
    fun firstBatteryPrompt(): Boolean {
        if (prefs.getBoolean("batteryPrompted", false)) return false
        prefs.edit().putBoolean("batteryPrompted", true).apply()
        return true
    }

    fun toJson(): JSONObject {
        val out = JSONObject()
        val liveAt = prefs.getLong("liveAt", 0)
        out.put("liveState", prefs.getString("liveState", "sin iniciar"))
        out.put("liveAt", if (liveAt > 0) java.time.Instant.ofEpochMilli(liveAt).toString() else "nunca")
        out.put("liveHttp", prefs.getInt("liveHttp", 0))
        val lastSync = prefs.getLong("lastSyncAt", 0)
        out.put("lastSyncAt", if (lastSync > 0) java.time.Instant.ofEpochMilli(lastSync).toString() else "nunca")
        out.put("lastSyncSource", prefs.getString("lastSyncSource", ""))
        out.put("lastSyncHttp", prefs.getInt("lastSyncHttp", 0))
        out.put("lastSyncError", prefs.getString("lastSyncError", ""))
        out.put("lastSyncNotifications", prefs.getInt("lastSyncNotifications", 0))
        out.put("lastSyncSummary", prefs.getString("lastSyncSummary", "[]"))
        val lastNotif = prefs.getLong("lastNotificationAt", 0)
        out.put("lastNotificationAt", if (lastNotif > 0) java.time.Instant.ofEpochMilli(lastNotif).toString() else "nunca")
        out.put("lastNotificationKey", prefs.getString("lastNotificationKey", ""))
        out.put("lastNotificationShown", prefs.getBoolean("lastNotificationShown", false))
        out.put("liveCamera", prefs.getBoolean("liveCamera", false))
        val lastCapture = prefs.getLong("lastCaptureAt", 0)
        out.put("lastCaptureAt", if (lastCapture > 0) java.time.Instant.ofEpochMilli(lastCapture).toString() else "nunca")
        out.put("lastCaptureKey", prefs.getString("lastCaptureKey", ""))
        out.put("lastCaptureFacing", prefs.getString("lastCaptureFacing", ""))
        out.put("lastCaptureError", prefs.getString("lastCaptureError", ""))
        return out
    }

    private companion object {
        const val MAX_CAPTURED_KEYS = 50
    }
}
