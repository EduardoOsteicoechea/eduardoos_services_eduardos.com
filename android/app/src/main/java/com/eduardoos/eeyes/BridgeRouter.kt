package com.eduardoos.eeyes

import org.json.JSONObject

/** Shared allowlist + message parsing for Android/Desktop parity. */
object BridgeRouter {
    private val allowPaths = setOf(
        "/api/eeyes/device/sync",
        "/api/eeyes/device/notifications/ack",
    )

    fun isAllowlistedPath(path: String): Boolean {
        if (path in allowPaths) return true
        val media = Regex("^/api/eeyes/device/tasks/[A-Za-z0-9_-]+/(start|media|complete)$")
        val mediaGet = Regex("^/api/eeyes/device/media/[A-Za-z0-9_-]+$")
        return media.matches(path) || mediaGet.matches(path)
    }

    fun parse(raw: String): JSONObject = JSONObject(raw)

    fun reply(id: String?, type: String, payload: JSONObject = JSONObject(), error: String? = null): String {
        val o = JSONObject().put("type", type).put("payload", payload)
        if (!id.isNullOrBlank()) o.put("id", id)
        if (!error.isNullOrBlank()) o.put("error", error)
        return o.toString()
    }
}
