package com.eduardoos.eeyes

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import kotlin.concurrent.thread

class NotificationAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val key = intent.getStringExtra("key").orEmpty()
        val title = intent.getStringExtra("title").orEmpty()
        val body = intent.getStringExtra("body").orEmpty()
        val taskId = intent.getStringExtra("taskId").orEmpty()
        show(context, key, title, body, taskId)
        thread {
            val api = ApiClient(BuildConfig.EEYES_BASE_URL, TokenStore(context))
            val payload = JSONObject().put("keys", JSONArray().put(key)).toString()
            api.request("POST", "/api/eeyes/device/notifications/ack", payload)
        }
    }

    companion object {
        fun show(ctx: Context, key: String, title: String, body: String, taskId: String) {
            val channelId = "eeyes_tasks"
            val nm = ctx.getSystemService(NotificationManager::class.java)
            if (Build.VERSION.SDK_INT >= 26) {
                nm.createNotificationChannel(
                    NotificationChannel(channelId, "eEyes tareas", NotificationManager.IMPORTANCE_DEFAULT),
                )
            }
            val n = NotificationCompat.Builder(ctx, channelId)
                .setContentTitle(title.ifBlank { "eEyes" })
                .setContentText(body)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setAutoCancel(true)
                .build()
            nm.notify(key.hashCode(), n)
        }
    }
}
