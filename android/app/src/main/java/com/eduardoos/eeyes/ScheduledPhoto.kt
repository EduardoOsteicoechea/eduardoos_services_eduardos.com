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
 * Runs a hub-scheduled photo (`capture:<taskId>` sync instruction). One shot
 * when maxPhotos is 1. A burst takes a picture every intervalSec until
 * maxPhotos, then asks the server to close the pack. Android only grants
 * background camera access while LiveSyncService runs with the camera type
 * (started from the visible app); otherwise the user is asked to open eEyes
 * and the next sync retries.
 */
object ScheduledPhoto {
    private val inFlight: MutableSet<String> = ConcurrentHashMap.newKeySet<String>()

    fun start(
        ctx: Context,
        key: String,
        taskId: String,
        facing: String,
        title: String,
        intervalSec: Int = 0,
        maxPhotos: Int = 1,
        done: (() -> Unit)? = null,
    ) {
        val app = ctx.applicationContext
        if (!inFlight.add(key)) {
            done?.invoke()
            return
        }
        Thread({
            try {
                run(app, key, taskId, facing, title, intervalSec, maxPhotos)
            } finally {
                inFlight.remove(key)
                done?.invoke()
            }
        }, "eeyes-scheduled-photo").start()
    }

    private fun run(
        app: Context,
        key: String,
        taskId: String,
        facing: String,
        title: String,
        intervalSec: Int,
        maxPhotos: Int,
    ) {
        val diag = DiagStore(app)
        if (diag.wasCaptured(key)) {
            ack(app, key)
            return
        }
        val shots = if (maxPhotos > 1) maxPhotos else 1
        val gapMs = if (shots > 1) intervalSec.coerceAtLeast(1) * 1000L else 0L
        var taken = 0
        for (i in 0 until shots) {
            if (i > 0 && gapMs > 0L) Thread.sleep(gapMs)
            var jpeg: ByteArray? = null
            var lastError: String? = null
            for (attempt in 0 until 3) {
                if (attempt > 0) Thread.sleep(1_000L)
                val result = PhotoCapturer.capture(app, facing)
                jpeg = result.jpeg
                lastError = result.error
                if (jpeg != null) break
            }
            val bytes = jpeg
            if (bytes == null) {
                diag.recordCapture(key, facing, lastError ?: "camara_error")
                if (taken == 0) {
                    notify(app, key, CHANNEL_ALERTS, "Foto programada pendiente", "Abre eEyes para tomar \"$title\".", alert = true)
                    return
                }
                break
            }
            if (!MediaUploader.uploadNow(app, taskId, "image", "image/jpeg", bytes, 0)) {
                diag.recordCapture(key, facing, "subida_fallida")
                break
            }
            taken += 1
            diag.recordCapture(key, facing, null)
        }
        if (taken == 0) return
        if (taken < shots) {
            // Leave the key unacked. The next sync reports imagesStored and takes only the missing shots.
            return
        }
        if (shots > 1) {
            runCatching {
                ApiClient(BuildConfig.EEYES_BASE_URL, TokenStore(app))
                    .request("POST", "/api/eeyes/device/tasks/$taskId/complete", "{}")
            }
        }
        diag.markCaptured(key)
        val camera = if (facing == "front") "frontal" else "trasera"
        val headline = if (shots > 1) "eEyes tomó $taken fotos" else "eEyes tomó una foto"
        notify(app, key, CHANNEL_CAPTURE, headline, "\"$title\" · cámara $camera", alert = false)
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
