package com.eduardoos.eeyes

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.MessageDigest

object MediaCompressor {
    fun compressJpeg(src: File, maxEdge: Int = 1600, quality: Int = 70): ByteArray {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(src.absolutePath, bounds)
        var sample = 1
        val maxSide = maxOf(bounds.outWidth, bounds.outHeight).coerceAtLeast(1)
        while (maxSide / sample > maxEdge) sample *= 2
        val opts = BitmapFactory.Options().apply { inSampleSize = sample }
        val bmp = BitmapFactory.decodeFile(src.absolutePath, opts) ?: error("decode_failed")
        val scaled = scaleToMaxEdge(bmp, maxEdge)
        val out = ByteArrayOutputStream()
        scaled.compress(Bitmap.CompressFormat.JPEG, quality, out)
        if (scaled !== bmp) scaled.recycle()
        bmp.recycle()
        return out.toByteArray()
    }

    fun compressJpegBytes(src: ByteArray, rotationDegrees: Int, maxEdge: Int = 1600, quality: Int = 80): ByteArray {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(src, 0, src.size, bounds)
        var sample = 1
        val maxSide = maxOf(bounds.outWidth, bounds.outHeight).coerceAtLeast(1)
        while (maxSide / sample > maxEdge * 2) sample *= 2
        val opts = BitmapFactory.Options().apply { inSampleSize = sample }
        val bmp = BitmapFactory.decodeByteArray(src, 0, src.size, opts) ?: error("decode_failed")
        val scaled = scaleToMaxEdge(bmp, maxEdge)
        val rotated = if (rotationDegrees % 360 != 0) {
            val m = Matrix().apply { postRotate(rotationDegrees.toFloat()) }
            Bitmap.createBitmap(scaled, 0, 0, scaled.width, scaled.height, m, true)
        } else {
            scaled
        }
        val out = ByteArrayOutputStream()
        rotated.compress(Bitmap.CompressFormat.JPEG, quality, out)
        if (rotated !== scaled) rotated.recycle()
        if (scaled !== bmp) scaled.recycle()
        bmp.recycle()
        return out.toByteArray()
    }

    fun scaleToMaxEdge(bmp: Bitmap, maxEdge: Int): Bitmap {
        val maxSide = maxOf(bmp.width, bmp.height)
        if (maxSide <= maxEdge) return bmp
        val scale = maxEdge.toFloat() / maxSide.toFloat()
        val w = (bmp.width * scale).toInt().coerceAtLeast(1)
        val h = (bmp.height * scale).toInt().coerceAtLeast(1)
        return Bitmap.createScaledBitmap(bmp, w, h, true)
    }

    fun sha256Hex(bytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        return digest.joinToString("") { "%02x".format(it) }
    }
}
