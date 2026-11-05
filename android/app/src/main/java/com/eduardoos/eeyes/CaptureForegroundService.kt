package com.eduardoos.eeyes

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Base64
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.io.File
import java.time.Instant
import java.util.concurrent.atomic.AtomicInteger
import kotlin.concurrent.thread

class CaptureForegroundService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private var photosTaken = AtomicInteger(0)
    private var maxPhotos = 10
    private var taskId: String = ""
    private var autoRunnable: Runnable? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_STOP
        when (action) {
            ACTION_PHOTO, ACTION_AUTO, ACTION_AUDIO -> {
                startForeground(42, buildNotification("Captura eEyes activa"))
            }
        }
        when (action) {
            ACTION_PHOTO -> {
                taskId = intent?.getStringExtra(EXTRA_TASK_ID).orEmpty()
                captureOnePhoto()
            }
            ACTION_AUTO -> {
                taskId = intent?.getStringExtra(EXTRA_TASK_ID).orEmpty()
                maxPhotos = intent?.getIntExtra(EXTRA_MAX, 10) ?: 10
                val intervalSec = (intent?.getIntExtra(EXTRA_INTERVAL, 5) ?: 5).coerceAtLeast(1)
                photosTaken.set(0)
                autoRunnable = object : Runnable {
                    override fun run() {
                        if (photosTaken.get() >= maxPhotos) {
                            stopSelf()
                            return
                        }
                        captureOnePhoto()
                        handler.postDelayed(this, intervalSec * 1000L)
                    }
                }
                handler.post(autoRunnable!!)
            }
            ACTION_AUDIO -> {
                taskId = intent?.getStringExtra(EXTRA_TASK_ID).orEmpty()
                val seconds = intent?.getIntExtra(EXTRA_SECONDS, 15) ?: 15
                recordAudio(seconds)
            }
            ACTION_STOP -> {
                autoRunnable?.let { handler.removeCallbacks(it) }
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    private fun buildNotification(text: String): Notification {
        val channelId = "eeyes_capture"
        val nm = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(
                NotificationChannel(channelId, "eEyes captura", NotificationManager.IMPORTANCE_LOW),
            )
        }
        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("eEyes")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_stat_eeyes)
            .setOngoing(true)
            .build()
    }

    private fun captureOnePhoto() {
        // CameraX full pipeline needs a bound lifecycle; for shell v1 we accept a
        // placeholder JPEG from cache that MediaCompressor can still process when
        // a real capture file is written by a future CameraX bind. Here we create
        // a minimal valid JPEG so the upload path is exercised end-to-end.
        thread {
            val dir = File(cacheDir, "media").also { it.mkdirs() }
            val file = File(dir, "photo-${System.currentTimeMillis()}.jpg")
            file.writeBytes(byteArrayOf(0xff.toByte(), 0xd8.toByte(), 0xff.toByte(), 0xd9.toByte()))
            enqueueUpload(file, "image", "image/jpeg", 0)
            photosTaken.incrementAndGet()
        }
    }

    private fun recordAudio(seconds: Int) {
        thread {
            val dir = File(cacheDir, "media").also { it.mkdirs() }
            val file = File(dir, "audio-${System.currentTimeMillis()}.m4a")
            val recorder = if (Build.VERSION.SDK_INT >= 31) {
                MediaRecorder(this)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }
            try {
                recorder.setAudioSource(MediaRecorder.AudioSource.MIC)
                recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                recorder.setAudioEncodingBitRate(64_000)
                recorder.setAudioSamplingRate(44_100)
                recorder.setAudioChannels(1)
                recorder.setOutputFile(file.absolutePath)
                recorder.prepare()
                recorder.start()
                Thread.sleep((seconds.coerceIn(1, 300)) * 1000L)
                recorder.stop()
            } catch (_: Exception) {
            } finally {
                runCatching { recorder.release() }
            }
            if (file.exists() && file.length() > 0) {
                enqueueUpload(file, "audio", "audio/mp4", seconds * 1000)
            }
            stopSelf()
        }
    }

    private fun enqueueUpload(file: File, kind: String, mime: String, durationMs: Int) {
        val bytes = if (kind == "image") MediaCompressor.compressJpeg(file) else file.readBytes()
        val sha = MediaCompressor.sha256Hex(bytes)
        val out = File(cacheDir, "media/${MediaQueue.newClientId()}.bin")
        out.writeBytes(bytes)
        val item = QueueItem(
            clientMediaId = MediaQueue.newClientId(),
            taskId = taskId,
            kind = kind,
            mime = mime,
            filePath = out.absolutePath,
            sha256 = sha,
            durationMs = durationMs,
            capturedAt = Instant.now().toString(),
        )
        MediaQueue(this).enqueue(item)
        UploadWorker.enqueue(this)
        // Also try immediate upload
        thread { flushOne(item) }
    }

    private fun flushOne(item: QueueItem) {
        val tokenStore = TokenStore(this)
        val api = ApiClient(BuildConfig.EEYES_BASE_URL, tokenStore)
        val bytes = File(item.filePath).readBytes()
        val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
        val body = JSONObject()
            .put("clientMediaId", item.clientMediaId)
            .put("kind", item.kind)
            .put("mime", item.mime)
            .put("capturedAt", item.capturedAt)
            .put("durationMs", item.durationMs)
            .put("sha256", item.sha256)
            .put("dataBase64", b64)
            .toString()
        val res = api.request("POST", "/api/eeyes/device/tasks/${item.taskId}/media", body)
        if (res.code in 200..299) {
            MediaQueue(this).remove(item.clientMediaId)
            File(item.filePath).delete()
        } else {
            MediaQueue(this).bumpAttempt(item.clientMediaId)
        }
    }

    companion object {
        const val ACTION_PHOTO = "photo"
        const val ACTION_AUTO = "auto"
        const val ACTION_AUDIO = "audio"
        const val ACTION_STOP = "stop"
        const val EXTRA_TASK_ID = "taskId"
        const val EXTRA_INTERVAL = "interval"
        const val EXTRA_MAX = "max"
        const val EXTRA_SECONDS = "seconds"

        fun startPhoto(ctx: Context, taskId: String) {
            val i = Intent(ctx, CaptureForegroundService::class.java).setAction(ACTION_PHOTO)
                .putExtra(EXTRA_TASK_ID, taskId)
            ContextCompat.startForegroundService(ctx, i)
        }

        fun startAuto(ctx: Context, taskId: String, intervalSec: Int, maxPhotos: Int) {
            val i = Intent(ctx, CaptureForegroundService::class.java).setAction(ACTION_AUTO)
                .putExtra(EXTRA_TASK_ID, taskId)
                .putExtra(EXTRA_INTERVAL, intervalSec)
                .putExtra(EXTRA_MAX, maxPhotos)
            ContextCompat.startForegroundService(ctx, i)
        }

        fun startAudio(ctx: Context, taskId: String, seconds: Int) {
            val i = Intent(ctx, CaptureForegroundService::class.java).setAction(ACTION_AUDIO)
                .putExtra(EXTRA_TASK_ID, taskId)
                .putExtra(EXTRA_SECONDS, seconds)
            ContextCompat.startForegroundService(ctx, i)
        }

        fun stop(ctx: Context) {
            ctx.startService(Intent(ctx, CaptureForegroundService::class.java).setAction(ACTION_STOP))
        }
    }
}
