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

    fun toJson(): JSONObject {
        val out = JSONObject()
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
        return out
    }
}
