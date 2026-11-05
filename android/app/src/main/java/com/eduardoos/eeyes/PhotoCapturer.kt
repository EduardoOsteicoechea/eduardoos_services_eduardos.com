package com.eduardoos.eeyes

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CaptureRequest
import android.media.ImageReader
import android.os.Handler
import android.os.HandlerThread
import android.util.Size
import androidx.core.content.ContextCompat
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Single JPEG still via Camera2, usable from a service (no preview UI).
 * A small YUV stream runs first so auto exposure / white balance converge.
 * Blocking: call from a background thread.
 */
object PhotoCapturer {
    class Result(val jpeg: ByteArray?, val error: String?)

    private const val WARMUP_MS = 1_200L
    private const val MAX_EDGE = 2_048

    @SuppressLint("MissingPermission")
    fun capture(ctx: Context, facing: String): Result {
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            return Result(null, "sin_permiso_camara")
        }
        val manager = ctx.getSystemService(CameraManager::class.java) ?: return Result(null, "sin_camara")
        val cameraId = pickCamera(manager, facing) ?: return Result(null, "sin_camara")
        val chars = manager.getCameraCharacteristics(cameraId)
        val map = chars.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
            ?: return Result(null, "sin_camara")
        val jpegSize = pickSize(map.getOutputSizes(ImageFormat.JPEG), MAX_EDGE) ?: return Result(null, "sin_camara")
        val previewSize = pickSize(map.getOutputSizes(ImageFormat.YUV_420_888), 640) ?: jpegSize

        val thread = HandlerThread("eeyes-photo").apply { start() }
        val handler = Handler(thread.looper)
        val jpegReader = ImageReader.newInstance(jpegSize.width, jpegSize.height, ImageFormat.JPEG, 1)
        val previewReader = ImageReader.newInstance(previewSize.width, previewSize.height, ImageFormat.YUV_420_888, 2)
        previewReader.setOnImageAvailableListener({ r -> r.acquireLatestImage()?.close() }, handler)
        var device: CameraDevice? = null
        var session: CameraCaptureSession? = null
        try {
            val opened = CountDownLatch(1)
            var openError: String? = null
            manager.openCamera(
                cameraId,
                object : CameraDevice.StateCallback() {
                    override fun onOpened(d: CameraDevice) {
                        device = d
                        opened.countDown()
                    }

                    override fun onDisconnected(d: CameraDevice) {
                        openError = "camara_desconectada"
                        d.close()
                        opened.countDown()
                    }

                    override fun onError(d: CameraDevice, code: Int) {
                        openError = if (code == CameraDevice.StateCallback.ERROR_CAMERA_DISABLED) {
                            "camara_bloqueada_en_segundo_plano"
                        } else {
                            "camara_error_$code"
                        }
                        d.close()
                        opened.countDown()
                    }
                },
                handler,
            )
            if (!opened.await(5, TimeUnit.SECONDS)) return Result(null, "camara_sin_respuesta")
            val cam = device ?: return Result(null, openError ?: "camara_error")

            val configured = CountDownLatch(1)
            @Suppress("DEPRECATION")
            cam.createCaptureSession(
                listOf(previewReader.surface, jpegReader.surface),
                object : CameraCaptureSession.StateCallback() {
                    override fun onConfigured(s: CameraCaptureSession) {
                        session = s
                        configured.countDown()
                    }

                    override fun onConfigureFailed(s: CameraCaptureSession) {
                        configured.countDown()
                    }
                },
                handler,
            )
            if (!configured.await(5, TimeUnit.SECONDS)) return Result(null, "camara_sin_respuesta")
            val s = session ?: return Result(null, "camara_sesion_fallida")

            val preview = cam.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW).apply {
                addTarget(previewReader.surface)
                set(CaptureRequest.CONTROL_MODE, CaptureRequest.CONTROL_MODE_AUTO)
                set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE)
            }.build()
            s.setRepeatingRequest(preview, null, handler)
            Thread.sleep(WARMUP_MS)

            val shot = CountDownLatch(1)
            var bytes: ByteArray? = null
            jpegReader.setOnImageAvailableListener({ r ->
                val img = r.acquireLatestImage()
                if (img != null) {
                    try {
                        val buf = img.planes[0].buffer
                        bytes = ByteArray(buf.remaining()).also { buf.get(it) }
                    } finally {
                        img.close()
                    }
                }
                shot.countDown()
            }, handler)
            val still = cam.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE).apply {
                addTarget(jpegReader.surface)
                set(CaptureRequest.CONTROL_MODE, CaptureRequest.CONTROL_MODE_AUTO)
                set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE)
                set(CaptureRequest.JPEG_ORIENTATION, 0)
                set(CaptureRequest.JPEG_QUALITY, 90.toByte())
            }.build()
            s.capture(still, null, handler)
            if (!shot.await(5, TimeUnit.SECONDS)) return Result(null, "camara_sin_foto")
            val out = bytes ?: return Result(null, "camara_sin_foto")
            // Upright for a phone held in portrait; recompression drops EXIF, so rotate pixels.
            val rotation = chars.get(CameraCharacteristics.SENSOR_ORIENTATION) ?: 0
            return Result(MediaCompressor.compressJpegBytes(out, rotation), null)
        } catch (e: SecurityException) {
            return Result(null, "camara_bloqueada_en_segundo_plano")
        } catch (e: Exception) {
            return Result(null, "camara_" + e.javaClass.simpleName)
        } finally {
            runCatching { session?.close() }
            runCatching { device?.close() }
            runCatching { jpegReader.close() }
            runCatching { previewReader.close() }
            thread.quitSafely()
        }
    }

    private fun pickCamera(manager: CameraManager, facing: String): String? {
        val want = if (facing == "front") CameraCharacteristics.LENS_FACING_FRONT else CameraCharacteristics.LENS_FACING_BACK
        val ids = manager.cameraIdList
        return ids.firstOrNull { manager.getCameraCharacteristics(it).get(CameraCharacteristics.LENS_FACING) == want }
            ?: ids.firstOrNull()
    }

    /** Largest size whose long edge fits [maxEdge]; smallest available otherwise. */
    private fun pickSize(sizes: Array<Size>?, maxEdge: Int): Size? {
        if (sizes.isNullOrEmpty()) return null
        val fitting = sizes.filter { maxOf(it.width, it.height) <= maxEdge }
        return fitting.maxByOrNull { it.width.toLong() * it.height }
            ?: sizes.minByOrNull { it.width.toLong() * it.height }
    }
}
