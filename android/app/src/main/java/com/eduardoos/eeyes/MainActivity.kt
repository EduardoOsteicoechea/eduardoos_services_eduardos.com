package com.eduardoos.eeyes

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlarmManager
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.net.Uri
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var tokenStore: TokenStore
    private lateinit var api: ApiClient
    private lateinit var queue: MediaQueue
    private val baseUrl = BuildConfig.EEYES_BASE_URL
    @Volatile private var pairCode1: String? = null
    @Volatile private var pairSession: String? = null
    @Volatile private var uiReady = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()
        super.onCreate(savedInstanceState)
        // Keep the favicon splash until the embedded UI has painted (capped so a slow network never blocks).
        splash.setKeepOnScreenCondition { !uiReady }
        window.decorView.postDelayed({ uiReady = true }, 5000)
        tokenStore = TokenStore(this)
        api = ApiClient(baseUrl, tokenStore)
        queue = MediaQueue(this)
        ensurePermissions()

        webView = WebView(this)
        webView.setBackgroundColor(ContextCompat.getColor(this, R.color.eeyes_bg))
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

            override fun onPageFinished(view: WebView?, url: String?) {
                uiReady = true
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
        requestBatteryExemption()
    }

    override fun onResume() {
        super.onResume()
        LiveSyncService.start(this, fromUi = true)
        // Scheduled photos blocked in the background are retried while the app is visible.
        if (!tokenStore.getToken().isNullOrBlank()) thread { DeviceSync.run(this, "app") }
    }

    /** Without the exemption many OEMs kill the live connection service in the background. */
    @SuppressLint("BatteryLife")
    private fun requestBatteryExemption() {
        if (tokenStore.getToken().isNullOrBlank()) return
        if (getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(packageName)) return
        if (!DiagStore(this).firstBatteryPrompt()) return
        runCatching {
            startActivity(
                Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")),
            )
        }
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

    /** Shows the system biometric / screen-lock prompt; returns null on success or an error code. */
    private fun authenticateUser(): String? {
        val authenticators = BiometricManager.Authenticators.BIOMETRIC_WEAK or
            BiometricManager.Authenticators.DEVICE_CREDENTIAL
        if (BiometricManager.from(this).canAuthenticate(authenticators) != BiometricManager.BIOMETRIC_SUCCESS) {
            return "biometric_unavailable"
        }
        val latch = CountDownLatch(1)
        var result: String? = "biometric_failed"
        runOnUiThread {
            val prompt = BiometricPrompt(
                this,
                ContextCompat.getMainExecutor(this),
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(r: BiometricPrompt.AuthenticationResult) {
                        result = null
                        latch.countDown()
                    }

                    override fun onAuthenticationError(code: Int, msg: CharSequence) {
                        latch.countDown()
                    }
                },
            )
            prompt.authenticate(
                BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Vincular eEyes")
                    .setSubtitle("Confirma que eres tú para vincular este teléfono")
                    .setAllowedAuthenticators(authenticators)
                    .build(),
            )
        }
        latch.await(2, TimeUnit.MINUTES)
        return result
    }

    @SuppressLint("HardwareIds")
    private fun installId(): String =
        Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID).orEmpty()

    private fun handlePairStep(id: String?, payload: JSONObject, reply: (String) -> Unit) {
        val step = payload.optInt("step")
        val code = payload.optString("code").trim()
        if (step == 1) {
            pairCode1 = null
            pairSession = null
            val authError = authenticateUser()
            if (authError != null) {
                reply(BridgeRouter.reply(id, "state", error = authError))
                return
            }
            pairCode1 = code
        }
        val code1 = pairCode1
        if (code1.isNullOrBlank() || step !in 1..3) {
            reply(BridgeRouter.reply(id, "state", error = "pairing_invalid"))
            return
        }
        val res = api.pairStep(step, code1, code, pairSession, BuildConfig.VERSION_NAME, installId())
        if (res.code !in 200..299) {
            if (step == 1) pairCode1 = null
            reply(BridgeRouter.reply(id, "state", error = res.errorCode ?: "pairing_invalid"))
            return
        }
        if (step == 1) pairSession = runCatching { JSONObject(res.body).optString("session") }.getOrNull()
        if (step == 3) {
            pairCode1 = null
            pairSession = null
            LiveSyncService.start(this, fromUi = true)
            runOnUiThread { requestBatteryExemption() }
            reply(BridgeRouter.reply(id, "state", buildState()))
            return
        }
        reply(BridgeRouter.reply(id, "state", JSONObject().put("step", step)))
    }

    private fun diagnostics(): JSONObject {
        val out = DiagStore(this).toJson()
        out.put("version", BuildConfig.VERSION_NAME)
        out.put("versionCode", BuildConfig.VERSION_CODE)
        out.put("paired", !tokenStore.getToken().isNullOrBlank())
        out.put("notificationsEnabled", NotificationManagerCompat.from(this).areNotificationsEnabled())
        val alarms = getSystemService(AlarmManager::class.java)
        out.put("exactAlarms", if (Build.VERSION.SDK_INT >= 31) alarms.canScheduleExactAlarms() else true)
        out.put("server", baseUrl)
        out.put(
            "batteryOptimizationIgnored",
            getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(packageName),
        )
        return out
    }

    private fun handleBridge(raw: String, reply: (String) -> Unit) {
        thread {
            var id: String? = null
            try {
                val msg = BridgeRouter.parse(raw)
                id = msg.optString("id")
                val type = msg.optString("type")
                val payload = msg.optJSONObject("payload") ?: JSONObject()
                when (type) {
                    "getState" -> reply(BridgeRouter.reply(id, "state", buildState()))
                    "pairStep" -> handlePairStep(id, payload, reply)
                    "getDiagnostics" -> reply(BridgeRouter.reply(id, "state", diagnostics()))
                    "testNotification" -> {
                        val shown = NotificationAlarmReceiver.show(
                            this,
                            "test:${System.currentTimeMillis()}",
                            "eEyes · prueba",
                            "Si ves esto, las notificaciones funcionan.",
                            "",
                        )
                        DiagStore(this).recordNotification("test", shown)
                        reply(BridgeRouter.reply(id, "state", JSONObject().put("shown", shown)))
                    }
                    "startTask" -> {
                        val taskId = payload.optString("taskId")
                        val res = api.request("POST", "/api/eeyes/device/tasks/$taskId/start", "{}")
                        reply(BridgeRouter.reply(id, "state", buildState(), if (res.code >= 400) res.errorCode else null))
                    }
                    "capturePhoto" -> {
                        CaptureForegroundService.startPhoto(
                            this,
                            payload.optString("taskId"),
                            payload.optString("facing").ifBlank { "back" },
                        )
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
                reply(BridgeRouter.reply(id, "state", error = "bridge_error"))
            }
        }
    }

    private fun handleAuthErrors(res: ApiClient.Response) {
        if (res.errorCode == "device_revoked" || res.errorCode == "device_expired") {
            tokenStore.clear()
            queue.clear()
            LiveSyncService.stop(this)
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
            if (res.code !in 200..299) DiagStore(this).recordSync("app", res.code, res.errorCode, null)
            if (res.code in 200..299) {
                val root = JSONObject(res.body)
                val arr = root.optJSONArray("tasks") ?: JSONArray()
                for (i in 0 until arr.length()) tasks.put(arr.getJSONObject(i))
                val notifications = root.optJSONArray("notifications")
                DiagStore(this).recordSync("app", res.code, null, notifications)
                NotificationScheduler.scheduleFromSync(this, notifications)
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
