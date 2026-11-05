package com.eduardoos.eeyes

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import java.time.Instant

object NotificationScheduler {
    fun scheduleFromSync(ctx: Context, notifications: JSONArray?) {
        if (notifications == null) return
        val am = ctx.getSystemService(AlarmManager::class.java) ?: return
        for (i in 0 until notifications.length()) {
            val n = notifications.getJSONObject(i)
            val key = n.optString("key")
            val title = n.optString("title")
            val body = n.optString("body")
            val taskId = n.optString("taskId")
            val at = runCatching { Instant.parse(n.optString("at")).toEpochMilli() }.getOrNull() ?: continue
            if (at < System.currentTimeMillis()) {
                NotificationAlarmReceiver.deliver(ctx, key, title, body, taskId)
                continue
            }
            val intent = Intent(ctx, NotificationAlarmReceiver::class.java)
                .putExtra("key", key)
                .putExtra("title", title)
                .putExtra("body", body)
                .putExtra("taskId", taskId)
            val pi = PendingIntent.getBroadcast(
                ctx,
                key.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            if (Build.VERSION.SDK_INT >= 31) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
                }
            } else {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
            }
        }
    }
}
