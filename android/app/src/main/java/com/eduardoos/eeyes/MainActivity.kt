package com.eduardoos.eeyes

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var tokenStore: TokenStore
    private lateinit var api: ApiClient
    private lateinit var queue: MediaQueue
    private val baseUrl = BuildConfig.EEYES_BASE_URL

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tokenStore = TokenStore(this)
        api = ApiClient(baseUrl, tokenStore)
        queue = MediaQueue(this)
        ensurePermissions()

        webView = WebView(this)
        setContentView(webView)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = false
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString().orEmpty()
                if (url.startsWith("$baseUrl/api/eeyes/ui")) return false
                startActivity(Intent(Intent.ACTION_VIEW, request?.url))
                return true
            }
        }

        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(
                webView,
                "eeyesBridge",
                setOf(baseUrl),
            ) { _, message, _, _, replyProxy ->
                handleBridge(message.data.orEmpty()) { reply ->
                    replyProxy.postMessage(reply)
                }
            }
        }

        val version = BuildConfig.VERSION_NAME
        webView.loadUrl("$baseUrl/api/eeyes/ui?platform=android&shellVersion=$version")
        scheduleSync()
    }

    private fun ensurePermissions() {
        val needed = mutableListOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= 33) needed += Manifest.permission.POST_NOTIFICATIONS
        val missing = needed.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), 42)
        }
    }

    private fun scheduleSync() {
        val req = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES).build()
        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "eeyes-sync",
            ExistingPeriodicWorkPolicy.KEEP,
            req,
        )
    }

    private fun handleBridge(raw: String, reply: (String) -> Unit) {
        thread {
            try {
                val msg = BridgeRouter.parse(raw)
                val id = msg.optString("id")
                val type = msg.optString("type")
                val payload = msg.optJSONObject("payload") ?: JSONObject()
                when (type) {
                    "getState" -> reply(BridgeRouter.reply(id, "state", buildState()))
                    "pair" -> {
                        val res = api.pair(
                            payload.optString("code1"),
                            payload.optString("code2"),
                            payload.optString("code3"),
                            BuildConfig.VERSION_NAME,
                        )
                        if (res.code in 200..299) reply(BridgeRouter.reply(id, "state", buildState()))
                        else reply(BridgeRouter.reply(id, "state", error = res.errorCode ?: "pairing_invalid"))
                    }
                    "startTask" -> {
                        val taskId = payload.optString("taskId")
                        val res = api.request("POST", "/api/eeyes/device/tasks/$taskId/start", "{}")
                        reply(BridgeRouter.reply(id, "state", buildState(), if (res.code >= 400) res.errorCode else null))
                    }
                    "capturePhoto" -> {
                        CaptureForegroundService.startPhoto(this, payload.optString("taskId"))
                        reply(BridgeRouter.reply(id, "state", JSONObject().put("ok", true)))
                    }
                    "startAutoCapture" -> {
                        CaptureForegroundService.startAuto(
                            this,
                            payload.optString("taskId"),
                            payload.optInt("intervalSec"),
                            payload.optInt("maxPhotos"),
                        )
                        reply(BridgeRouter.reply(id, "state", JSONObject().put("ok", true)))
                    }
                    "stopAutoCapture" -> {
                        CaptureForegroundService.stop(this)
                        reply(BridgeRouter.reply(id, "state", JSONObject().put("ok", true)))
                    }
                    "recordAudio" -> {
                        CaptureForegroundService.startAudio(
                            this,
                            payload.optString("taskId"),
                            payload.optInt("seconds", 15),
                        )
                        reply(BridgeRouter.reply(id, "state", JSONObject().put("ok", true)))
                    }
                    "completeTask" -> {
                        val taskId = payload.optString("taskId")
                        CaptureForegroundService.stop(this)
                        val res = api.request("POST", "/api/eeyes/device/tasks/$taskId/complete", "{}")
                        reply(BridgeRouter.reply(id, "state", buildState(), if (res.code >= 400) res.errorCode else null))
                    }
                    "request" -> {
                        val path = payload.optString("path")
                        if (!BridgeRouter.isAllowlistedPath(path)) {
                            reply(BridgeRouter.reply(id, "state", error = "forbidden"))
                        } else {
                            val res = api.request(payload.optString("method", "GET"), path, payload.optString("body").ifBlank { null })
                            handleAuthErrors(res)
                            reply(BridgeRouter.reply(id, "state", JSONObject().put("status", res.code).put("body", res.body), res.errorCode))
                        }
                    }
                    "openExternal" -> {
                        val url = payload.optString("url")
                        if (url == "eeyes://update") UpdateHelper.checkAndInstall(this, api)
                        reply(BridgeRouter.reply(id, "state", JSONObject().put("ok", true)))
                    }
                    else -> reply(BridgeRouter.reply(id, "state", error = "unknown_type"))
                }
            } catch (e: Exception) {
                reply(BridgeRouter.reply(null, "state", error = "bridge_error"))
            }
        }
    }

    private fun handleAuthErrors(res: ApiClient.Response) {
        if (res.errorCode == "device_revoked" || res.errorCode == "device_expired") {
            tokenStore.clear()
            queue.clear()
            runOnUiThread {
                webView.evaluateJavascript(
                    "window.__eeyesOnNative && window.__eeyesOnNative(${JSONObject().put("type", "revoked")})",
                    null,
                )
            }
        }
    }

    private fun buildState(): JSONObject {
        val paired = !tokenStore.getToken().isNullOrBlank()
        val tasks = JSONArray()
        if (paired) {
            val res = api.request("GET", "/api/eeyes/device/sync")
            handleAuthErrors(res)
            if (res.code in 200..299) {
                val root = JSONObject(res.body)
                val arr = root.optJSONArray("tasks") ?: JSONArray()
                for (i in 0 until arr.length()) tasks.put(arr.getJSONObject(i))
                NotificationScheduler.scheduleFromSync(this, root.optJSONArray("notifications"))
                val update = root.optJSONObject("update")
                if (update != null && update.optInt("versionCode") > BuildConfig.VERSION_CODE) {
                    runOnUiThread {
                        webView.evaluateJavascript(
                            "window.__eeyesOnNative && window.__eeyesOnNative(${JSONObject().put("type", "updateAvailable").put("payload", update)})",
                            null,
                        )
                    }
                }
            }
        }
        return JSONObject()
            .put("paired", paired)
            .put("platform", "android")
            .put("shellVersion", BuildConfig.VERSION_NAME)
            .put("tasks", tasks)
    }
}
