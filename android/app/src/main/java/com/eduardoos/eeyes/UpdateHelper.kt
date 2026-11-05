package com.eduardoos.eeyes

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest
import kotlin.concurrent.thread

object UpdateHelper {
    fun checkAndInstall(ctx: Context, api: ApiClient) {
        thread {
            val res = api.request("GET", "/api/eeyes/device/sync")
            if (res.code !in 200..299) return@thread
            val update = JSONObject(res.body).optJSONObject("update") ?: return@thread
            val versionCode = update.optInt("versionCode")
            if (versionCode <= BuildConfig.VERSION_CODE) return@thread
            val sha = update.optString("sha256")
            val downloadPath = update.optString("downloadPath").ifBlank {
                "/api/eeyes/downloads/android"
            }
            // Downloads require cookie entitlement; device token sync only signals availability.
            // Shell opens the hub download URL in the browser when signed session is needed.
            if (!downloadPath.startsWith("/api/eeyes/")) return@thread
            val url = BuildConfig.EEYES_BASE_URL.trimEnd('/') + downloadPath
            val client = OkHttpClient()
            val req = Request.Builder().url(url).build()
            client.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) return@thread
                val bytes = resp.body?.bytes() ?: return@thread
                val got = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
                if (sha.isNotBlank() && got != sha) return@thread
                val apk = File(ctx.cacheDir, "updates/eeyes.apk").also { it.parentFile?.mkdirs() }
                apk.writeBytes(bytes)
                installApk(ctx, apk)
            }
        }
    }

    private fun installApk(ctx: Context, apk: File) {
        val installer = ctx.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        val sessionId = installer.createSession(params)
        installer.openSession(sessionId).use { session ->
            apk.inputStream().use { input ->
                session.openWrite("eeyes", 0, apk.length()).use { out ->
                    input.copyTo(out)
                    session.fsync(out)
                }
            }
            val callback = PendingIntent.getBroadcast(
                ctx,
                sessionId,
                Intent(ctx, NotificationAlarmReceiver::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            ).intentSender
            session.commit(callback)
        }
    }
}
