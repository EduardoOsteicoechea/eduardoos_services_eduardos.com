package com.eduardoos.eeyes

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject
import kotlin.concurrent.thread

class NotificationAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val key = intent.getStringExtra("key").orEmpty()
        val title = intent.getStringExtra("title").orEmpty()
        val body = intent.getStringExtra("body").orEmpty()
        val taskId = intent.getStringExtra("taskId").orEmpty()
        if (intent.getStringExtra("kind") == NotificationScheduler.KIND_CAPTURE) {
            val pending = goAsync()
            ScheduledPhoto.start(
                context,
                key,
                taskId,
                intent.getStringExtra("facing").orEmpty(),
                title,
                intent.getIntExtra("intervalSec", 0),
                intent.getIntExtra("maxPhotos", 1),
            ) {
                pending.finish()
            }
            return
        }
        deliver(context, key, title, body, taskId)
    }

    companion object {
        /** Shows the notification and acks it so later syncs stop listing the key. */
        fun deliver(ctx: Context, key: String, title: String, body: String, taskId: String) {
            val shown = show(ctx, key, title, body, taskId)
            DiagStore(ctx).recordNotification(key, shown)
            if (!shown) return
            val appCtx = ctx.applicationContext
            thread {
                val api = ApiClient(BuildConfig.EEYES_BASE_URL, TokenStore(appCtx))
                val payload = JSONObject().put("keys", JSONArray().put(key)).toString()
                api.request("POST", "/api/eeyes/device/notifications/ack", payload)
            }
        }

        /** Returns false when the system blocks eEyes notifications (permission or channel off). */
        fun show(ctx: Context, key: String, title: String, body: String, taskId: String): Boolean {
            // New channel id: importance of an existing channel cannot be raised in code.
            val channelId = "eeyes_alerts"
            val nm = ctx.getSystemService(NotificationManager::class.java)
            if (Build.VERSION.SDK_INT >= 26) {
                nm.createNotificationChannel(
                    NotificationChannel(channelId, "eEyes avisos", NotificationManager.IMPORTANCE_HIGH),
                )
            }
            if (!NotificationManagerCompat.from(ctx).areNotificationsEnabled()) return false
            val n = NotificationCompat.Builder(ctx, channelId)
                .setContentTitle(title.ifBlank { "eEyes" })
                .setContentText(body)
                .setSmallIcon(R.drawable.ic_stat_eeyes)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .build()
            nm.notify(key.hashCode(), n)
            return true
        }
    }
}
