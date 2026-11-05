(function () {
  "use strict";

  var state = {
    paired: false,
    platform: "",
    shellVersion: "",
    tasks: [],
    activeTaskId: null,
    capturing: false,
    codes: [],
    update: null,
  };

  var pending = {};
  var msgId = 0;

  function qs(name) {
    try {
      return new URLSearchParams(location.search).get(name) || "";
    } catch (_) {
      return "";
    }
  }

  function post(type, payload) {
    return new Promise(function (resolve, reject) {
      var id = "m" + (++msgId);
      pending[id] = { resolve: resolve, reject: reject };
      var msg = JSON.stringify({ id: id, type: type, payload: payload || {} });
      try {
        if (window.eeyesBridge && typeof window.eeyesBridge.postMessage === "function") {
          window.eeyesBridge.postMessage(msg);
        } else if (window.chrome && window.chrome.webview && typeof window.chrome.webview.postMessage === "function") {
          window.chrome.webview.postMessage(msg);
        } else {
          reject(new Error("bridge_unavailable"));
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  function onNativeMessage(raw) {
    var data;
    try {
      data = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (_) {
      return;
    }
    if (!data || !data.type) return;
    if (data.id && pending[data.id]) {
      var p = pending[data.id];
      delete pending[data.id];
      if (data.error) p.reject(new Error(data.error));
      else p.resolve(data.payload || {});
      return;
    }
    switch (data.type) {
      case "state":
        applyState(data.payload || {});
        break;
      case "captureQueued":
        addQueueItem(data.payload || {});
        break;
      case "uploadProgress":
        break;
      case "notificationTapped":
        if (data.payload && data.payload.taskId) {
          openTask(data.payload.taskId);
        }
        break;
      case "updateAvailable":
        state.update = data.payload || null;
        show("update");
        break;
      case "revoked":
        state.paired = false;
        state.tasks = [];
        show("pair");
        setStatus("Dispositivo revocado. Vuelve a vincular.");
        break;
      default:
        break;
    }
  }

  window.__eeyesOnNative = onNativeMessage;
  if (window.eeyesBridge) {
    // Android WebMessageListener replies arrive on the injected object, not on window.
    window.eeyesBridge.onmessage = function (ev) {
      onNativeMessage(ev && ev.data);
    };
  }
  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.addEventListener("message", function (ev) {
      onNativeMessage(ev.data);
    });
  }

  function applyState(payload) {
    state.paired = !!payload.paired;
    state.platform = payload.platform || state.platform;
    state.shellVersion = payload.shellVersion || state.shellVersion;
    state.tasks = payload.tasks || [];
    state.update = payload.update || null;
    if (state.update && state.update.force) {
      show("update");
      return;
    }
    if (!state.paired) {
      show("pair");
      setStatus("Sin vincular");
      return;
    }
    if (state.activeTaskId) {
      openTask(state.activeTaskId);
      return;
    }
    renderTasks();
    show("tasks");
    setStatus(state.platform + " · vinculado");
  }

  function setStatus(text) {
    var el = document.getElementById("status-line");
    if (el) el.textContent = text || "";
  }

  function show(name) {
    ["pair", "tasks", "active", "update"].forEach(function (v) {
      var el = document.getElementById("view-" + v);
      if (el) el.hidden = v !== name;
    });
  }

  function renderTasks() {
    var list = document.getElementById("task-list");
    var empty = document.getElementById("tasks-empty");
    list.innerHTML = "";
    var tasks = state.tasks || [];
    empty.hidden = tasks.length > 0;
    tasks.forEach(function (t) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = t.title || "Tarea";
      btn.addEventListener("click", function () {
        openTask(t.id);
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
  }

  function findTask(id) {
    for (var i = 0; i < state.tasks.length; i++) {
      if (state.tasks[i].id === id) return state.tasks[i];
    }
    return null;
  }

  function openTask(id) {
    var t = findTask(id);
    if (!t) return;
    state.activeTaskId = id;
    document.getElementById("active-title").textContent = t.title || "";
    document.getElementById("active-instructions").textContent = t.instructions || "";
    var started = t.status === "in_progress";
    document.getElementById("btn-start").hidden = started;
    document.getElementById("btn-photo").hidden = !started;
    document.getElementById("btn-audio").hidden = !started || !(t.audioSeconds > 0);
    document.getElementById("btn-complete").hidden = !started;
    document.getElementById("capture-banner").hidden = !state.capturing;
    document.getElementById("media-queue").innerHTML = "";
    show("active");
  }

  function addQueueItem(payload) {
    var list = document.getElementById("media-queue");
    var li = document.createElement("li");
    li.className = "card";
    li.textContent = (payload.kind || "media") + " · " + (payload.clientMediaId || "");
    list.appendChild(li);
  }

  function wirePair() {
    var step = 1;
    var input = document.getElementById("pair-input");
    var stepEl = document.getElementById("pair-step");
    var err = document.getElementById("pair-error");
    document.getElementById("pair-next").addEventListener("click", function () {
      err.hidden = true;
      var code = (input.value || "").replace(/\D/g, "");
      if (code.length !== 4) {
        err.textContent = "Escribe 4 dígitos.";
        err.hidden = false;
        return;
      }
      state.codes[step - 1] = code;
      input.value = "";
      if (step < 3) {
        step += 1;
        stepEl.textContent = String(step);
        return;
      }
      post("pair", {
        code1: state.codes[0],
        code2: state.codes[1],
        code3: state.codes[2],
        platform: state.platform || qs("platform"),
        shellVersion: state.shellVersion || qs("shellVersion"),
      })
        .then(function () {
          return post("getState", {});
        })
        .then(function (payload) {
          applyState(payload);
        })
        .catch(function () {
          err.textContent = "Códigos inválidos. Intenta de nuevo.";
          err.hidden = false;
          step = 1;
          state.codes = [];
          stepEl.textContent = "1";
        });
    });
  }

  function wireActive() {
    document.getElementById("btn-start").addEventListener("click", function () {
      if (!state.activeTaskId) return;
      post("startTask", { taskId: state.activeTaskId }).then(function () {
        return post("getState", {});
      }).then(function (payload) {
        applyState(payload);
        openTask(state.activeTaskId);
        var t = findTask(state.activeTaskId);
        if (t && t.photoIntervalSec > 0) {
          state.capturing = true;
          document.getElementById("capture-banner").hidden = false;
          post("startAutoCapture", {
            taskId: state.activeTaskId,
            intervalSec: t.photoIntervalSec,
            maxPhotos: t.maxPhotos,
          });
        }
      });
    });
    document.getElementById("btn-photo").addEventListener("click", function () {
      post("capturePhoto", { taskId: state.activeTaskId });
    });
    document.getElementById("btn-audio").addEventListener("click", function () {
      var t = findTask(state.activeTaskId);
      post("recordAudio", {
        taskId: state.activeTaskId,
        seconds: (t && t.audioSeconds) || 15,
      });
    });
    document.getElementById("btn-complete").addEventListener("click", function () {
      post("stopAutoCapture", { taskId: state.activeTaskId });
      post("completeTask", { taskId: state.activeTaskId }).then(function () {
        state.activeTaskId = null;
        state.capturing = false;
        return post("getState", {});
      }).then(applyState);
    });
    document.getElementById("btn-update").addEventListener("click", function () {
      post("request", { method: "GET", path: "/api/eeyes/device/sync" });
      post("openExternal", { url: "eeyes://update" });
    });
  }

  state.platform = qs("platform");
  state.shellVersion = qs("shellVersion");
  wirePair();
  wireActive();
  post("getState", {})
    .then(applyState)
    .catch(function () {
      show("pair");
      setStatus("Esperando bridge nativo");
    });
})();
