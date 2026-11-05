package com.eduardoos.eeyes

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class ApiClient(
    private val baseUrl: String,
    private val tokenStore: TokenStore,
) {
    private val http = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    data class Response(val code: Int, val body: String, val errorCode: String?)

    fun request(method: String, path: String, jsonBody: String? = null, authed: Boolean = true): Response {
        require(path.startsWith("/api/eeyes/device/")) { "path_not_allowlisted" }
        val builder = Request.Builder().url(baseUrl.trimEnd('/') + path)
        if (authed) {
            val token = tokenStore.getToken() ?: return Response(401, "", "unauthorized")
            builder.header("Authorization", "Bearer $token")
        }
        when (method.uppercase()) {
            "GET" -> builder.get()
            "POST" -> builder.post((jsonBody ?: "{}").toRequestBody("application/json".toMediaType()))
            else -> error("method_not_allowed")
        }
        http.newCall(builder.build()).execute().use { resp ->
            val body = resp.body?.string().orEmpty()
            val err = runCatching { JSONObject(body).optString("error").ifBlank { null } }.getOrNull()
            return Response(resp.code, body, err)
        }
    }

    /** One pairing step; step 3 stores the issued device token. */
    fun pairStep(
        step: Int,
        code1: String,
        code: String,
        session: String?,
        shellVersion: String,
        installId: String,
    ): Response {
        val payload = JSONObject()
            .put("step", step)
            .put("code1", code1)
            .put("code", code)
            .put("session", session ?: "")
            .put("platform", "android")
            .put("model", android.os.Build.MODEL)
            .put("shellVersion", shellVersion)
            .put("installId", installId)
            .toString()
        val builder = Request.Builder()
            .url(baseUrl.trimEnd('/') + "/api/eeyes/device/pair")
            .post(payload.toRequestBody("application/json".toMediaType()))
        http.newCall(builder.build()).execute().use { resp ->
            val body = resp.body?.string().orEmpty()
            val err = runCatching { JSONObject(body).optString("error").ifBlank { null } }.getOrNull()
            if (resp.isSuccessful) {
                val token = JSONObject(body).optString("token")
                if (token.isNotBlank()) tokenStore.setToken(token)
            }
            return Response(resp.code, body, err)
        }
    }
}
