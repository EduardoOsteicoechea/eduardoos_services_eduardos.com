package com.eduardoos.eeyes

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import kotlin.concurrent.thread

/**
 * Persistent foreground service holding a long-poll on /api/eeyes/device/wait.
 * The server answers as soon as the hub changes this device's tasks (or after
 * ~50 s); the CPU may sleep while the request is open and is woken by the reply.
 */
class LiveSyncService : Service() {
    @Volatile private var running = false
    private var worker: Thread? = null
    private var cameraReady = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startInForeground(intent?.getBooleanExtra(EXTRA_FROM_UI, false) == true)
        if (!running) {
            running = true
            worker = thread(name = "eeyes-live") { loop() }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        running = false
        worker?.interrupt()
        DiagStore(this).recordLive("detenido", 0)
        super.onDestroy()
    }

    /**
     * The camera type is only granted while the app is visible; once held, it keeps
     * background camera access for scheduled photos. Restarts from boot or the
     * system get the connection type alone.
     */
    private fun startInForeground(fromUi: Boolean) {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL, "eEyes conexión", NotificationManager.IMPORTANCE_MIN),
        )
        val open = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE,
        )
        val n: Notification = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_eeyes)
            .setContentTitle("eEyes activo")
            .setContentText("Recibiendo avisos al instante")
            .setOngoing(true)
            .setContentIntent(open)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
        val withCamera = (fromUi || cameraReady) &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        cameraReady = withCamera && runCatching { startTyped(n, true) }.isSuccess
        if (!cameraReady) startTyped(n, false)
        DiagStore(this).recordLiveCamera(cameraReady)
    }

    private fun startTyped(n: Notification, withCamera: Boolean) {
        when {
            Build.VERSION.SDK_INT >= 34 -> {
                val camera = if (withCamera) ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA else 0
                startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE or camera)
            }
            Build.VERSION.SDK_INT >= 30 && withCamera ->
                startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA)
            else -> startForeground(NOTIFICATION_ID, n)
        }
    }

    private fun loop() {
        val ctx = applicationContext
        val tokenStore = TokenStore(ctx)
        val api = ApiClient(BuildConfig.EEYES_BASE_URL, tokenStore)
        val diag = DiagStore(ctx)
        val wake = getSystemService(PowerManager::class.java)
            .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "eeyes:live")
            .apply { setReferenceCounted(false) }
        var version = ""
        var lastSync = 0L
        var backoffMs = MIN_BACKOFF_MS
        while (running) {
            if (tokenStore.getToken().isNullOrBlank()) break
            val res = runCatching {
                api.request("GET", "/api/eeyes/device/wait?v=" + Uri.encode(version))
            }.getOrNull()
            var pauseMs = 0L
            var unpaired = false
            wake.acquire(WAKE_MS)
            try {
                if (res != null && res.code in 200..299) {
                    backoffMs = MIN_BACKOFF_MS
                    val body = JSONObject(res.body)
                    version = body.optString("v")
                    val now = System.currentTimeMillis()
                    if (body.optBoolean("changed") || now - lastSync > FORCED_SYNC_MS) {
                        when (DeviceSync.run(ctx, "live")) {
                            DeviceSync.Outcome.UNPAIRED -> unpaired = true
                            DeviceSync.Outcome.OK -> lastSync = now
                            DeviceSync.Outcome.RETRY -> Unit
                        }
                    }
                    diag.recordLive("conectado", res.code)
                } else if (res?.errorCode == "device_revoked" || res?.errorCode == "device_expired") {
                    DeviceSync.run(ctx, "live")
                    unpaired = true
                } else {
                    diag.recordLive("error " + (res?.errorCode ?: "red"), res?.code ?: 0)
                    pauseMs = backoffMs
                    backoffMs = minOf(backoffMs * 2, MAX_BACKOFF_MS)
                }
            } finally {
                if (wake.isHeld) wake.release()
            }
            if (unpaired) break
            if (pauseMs > 0) {
                try {
                    Thread.sleep(pauseMs)
                } catch (e: InterruptedException) {
                    break
                }
            }
        }
        running = false
        stopSelf()
    }

    companion object {
        private const val CHANNEL = "eeyes_live"
        private const val NOTIFICATION_ID = 7001
        private const val WAKE_MS = 30_000L
        private const val FORCED_SYNC_MS = 5 * 60_000L
        private const val MIN_BACKOFF_MS = 5_000L
        private const val MAX_BACKOFF_MS = 60_000L
        private const val EXTRA_FROM_UI = "fromUi"

        /** [fromUi] = called while an eEyes activity is visible (grants the camera type). */
        fun start(ctx: Context, fromUi: Boolean = false) {
            if (TokenStore(ctx).getToken().isNullOrBlank()) return
            runCatching {
                ContextCompat.startForegroundService(
                    ctx,
                    Intent(ctx, LiveSyncService::class.java).putExtra(EXTRA_FROM_UI, fromUi),
                )
            }.onFailure { DiagStore(ctx).recordLive("no se pudo iniciar: " + it.javaClass.simpleName, 0) }
        }

        fun stop(ctx: Context) {
            ctx.stopService(Intent(ctx, LiveSyncService::class.java))
        }
    }
}
