package com.eduardoos.eeyes

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

/**
 * Runs a hub-scheduled photo (`capture:<taskId>` sync instruction): take one
 * picture, queue the upload (the first upload completes the task), ack the key.
 * Android only grants background camera access while LiveSyncService runs with
 * the camera type (started from the visible app); otherwise the user is asked
 * to open eEyes and the next sync retries.
 */
object ScheduledPhoto {
    private val inFlight: MutableSet<String> = ConcurrentHashMap.newKeySet<String>()

    fun start(ctx: Context, key: String, taskId: String, facing: String, title: String, done: (() -> Unit)? = null) {
        val app = ctx.applicationContext
        if (!inFlight.add(key)) {
            done?.invoke()
            return
        }
        Thread({
            try {
                run(app, key, taskId, facing, title)
            } finally {
                inFlight.remove(key)
                done?.invoke()
            }
        }, "eeyes-scheduled-photo").start()
    }

    private fun run(app: Context, key: String, taskId: String, facing: String, title: String) {
        val diag = DiagStore(app)
        if (diag.wasCaptured(key)) {
            ack(app, key)
            return
        }
        val result = PhotoCapturer.capture(app, facing)
        val jpeg = result.jpeg
        if (jpeg == null) {
            diag.recordCapture(key, facing, result.error ?: "camara_error")
            notify(app, key, CHANNEL_ALERTS, "Foto programada pendiente", "Abre eEyes para tomar \"$title\".", alert = true)
            return
        }
        MediaUploader.enqueue(app, taskId, "image", "image/jpeg", jpeg, 0)
        diag.markCaptured(key)
        diag.recordCapture(key, facing, null)
        val camera = if (facing == "front") "frontal" else "trasera"
        notify(app, key, CHANNEL_CAPTURE, "eEyes tomó una foto", "\"$title\" · cámara $camera", alert = false)
        ack(app, key)
    }

    private fun ack(app: Context, key: String) {
        val api = ApiClient(BuildConfig.EEYES_BASE_URL, TokenStore(app))
        val payload = JSONObject().put("keys", JSONArray().put(key)).toString()
        runCatching { api.request("POST", "/api/eeyes/device/notifications/ack", payload) }
    }

    private fun notify(app: Context, key: String, channel: String, title: String, body: String, alert: Boolean) {
        val nm = app.getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(
                channel,
                if (alert) "eEyes avisos" else "eEyes captura",
                if (alert) NotificationManager.IMPORTANCE_HIGH else NotificationManager.IMPORTANCE_LOW,
            ),
        )
        if (!NotificationManagerCompat.from(app).areNotificationsEnabled()) return
        val open = PendingIntent.getActivity(
            app,
            key.hashCode(),
            Intent(app, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_IMMUTABLE,
        )
        val n = NotificationCompat.Builder(app, channel)
            .setSmallIcon(R.drawable.ic_stat_eeyes)
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(open)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setPriority(if (alert) NotificationCompat.PRIORITY_HIGH else NotificationCompat.PRIORITY_LOW)
            .build()
        nm.notify(key.hashCode(), n)
    }

    private const val CHANNEL_ALERTS = "eeyes_alerts"
    private const val CHANNEL_CAPTURE = "eeyes_capture"
}
