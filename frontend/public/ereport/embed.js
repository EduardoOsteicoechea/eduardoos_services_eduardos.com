/**
 * eReport web connector loader for host websites.
 *
 * Auth: eduardoos.com cookie session + eReport subscription (no API key paste).
 *
 *   <link rel="stylesheet" href="https://eduardoos.com/ereport/embed-theme.css" />
 *   <script src="https://eduardoos.com/ereport/embed.js"></script>
 *   <script>
 *     EduardoOSEreport.mount({
 *       orgId: "…",           // optional if Configure has been saved
 *       reportId: "…",        // optional if Configure has been saved
 *       menuSelector: "#main-menu nav",
 *       label: "eReport",
 *       baseUrl: "https://eduardoos.com"
 *     });
 *   </script>
 *
 * Hosts without the full eReport hub use Configure to pick report / section / subsection.
 * Override --eos-ereport-* so the menu control matches the host chrome.
 */
(function (global) {
  "use strict";

  var INIT_TYPE = "ereport-embed-init";
  var READY_TYPE = "ereport-embed-ready";
  var CLOSE_TYPE = "ereport-embed-close";
  var CONFIG_DONE_TYPE = "ereport-embed-config-done";
  var OVERLAY_ID = "eduardoos-ereport-embed-overlay";
  var THEME_ID = "eduardoos-ereport-embed-theme";
  var BINDING_KEY = "ereport.embed.binding";
  var activeMessageHandler = null;

  function scriptBaseUrl() {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || "";
      if (src.indexOf("/ereport/embed.js") !== -1) {
        return src.replace(/\/ereport\/embed\.js(?:\?.*)?$/, "");
      }
    }
    return "https://eduardoos.com";
  }

  function ensureTheme(baseUrl) {
    if (document.getElementById(THEME_ID)) return;
    var link = document.createElement("link");
    link.id = THEME_ID;
    link.rel = "stylesheet";
    link.href = (baseUrl || scriptBaseUrl()).replace(/\/$/, "") + "/ereport/embed-theme.css";
    document.head.appendChild(link);
  }

  function loadBinding() {
    try {
      var raw = localStorage.getItem(BINDING_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.orgId || !parsed.reportId) return null;
      return {
        orgId: String(parsed.orgId),
        reportId: String(parsed.reportId),
        sectionId: parsed.sectionId ? String(parsed.sectionId) : "",
        groupId: parsed.groupId ? String(parsed.groupId) : "",
        tema: parsed.tema ? String(parsed.tema) : "",
      };
    } catch (e) {
      return null;
    }
  }

  function saveBinding(binding) {
    localStorage.setItem(BINDING_KEY, JSON.stringify(binding));
  }

  function onEscape(ev) {
    if (ev.key === "Escape") closeOverlay();
  }

  function closeOverlay() {
    var existing = document.getElementById(OVERLAY_ID);
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    document.removeEventListener("keydown", onEscape, true);
    document.documentElement.classList.remove("ereport-connector-open");
    if (activeMessageHandler) {
      window.removeEventListener("message", activeMessageHandler);
      activeMessageHandler = null;
    }
  }

  function sameHost(origin, baseUrl) {
    try {
      return new URL(origin).host === new URL(baseUrl).host;
    } catch (e) {
      return false;
    }
  }

  function openIframeModal(opts) {
    var baseUrl = (opts.baseUrl || scriptBaseUrl() || "https://eduardoos.com").replace(/\/$/, "");
    ensureTheme(baseUrl);
    closeOverlay();

    var overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", opts.label || "eReport");

    var frameWrap = document.createElement("div");
    frameWrap.className = "eos-ereport-embed-frame";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "eos-ereport-embed-close";
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", closeOverlay);

    var iframe = document.createElement("iframe");
    iframe.src = opts.src;
    iframe.title = opts.label || "eReport connector";
    iframe.setAttribute("allow", "clipboard-write");

    var sent = false;
    function sendInit() {
      if (!opts.initMessage || sent || !iframe.contentWindow) return;
      try {
        iframe.contentWindow.postMessage(opts.initMessage, baseUrl);
        sent = true;
      } catch (e) {
        /* ignore */
      }
    }
    iframe.addEventListener("load", sendInit);

    activeMessageHandler = function (ev) {
      if (!ev || !ev.data || typeof ev.data !== "object") return;
      if (!sameHost(ev.origin, baseUrl)) return;
      if (ev.data.type === CLOSE_TYPE) {
        closeOverlay();
        return;
      }
      if (ev.data.type === READY_TYPE) {
        sent = false;
        sendInit();
        return;
      }
      if (ev.data.type === CONFIG_DONE_TYPE && opts.onConfigDone) {
        opts.onConfigDone(ev.data);
        closeOverlay();
      }
    };
    window.addEventListener("message", activeMessageHandler);

    overlay.addEventListener("click", function (ev) {
      if (ev.target === overlay) closeOverlay();
    });

    frameWrap.appendChild(closeBtn);
    frameWrap.appendChild(iframe);
    overlay.appendChild(frameWrap);
    document.body.appendChild(overlay);
    document.documentElement.classList.add("ereport-connector-open");
    document.addEventListener("keydown", onEscape, true);
    closeBtn.focus();
  }

  function resolveIds(opts) {
    var stored = loadBinding();
    return {
      orgId: String((opts && opts.orgId) || (stored && stored.orgId) || "").trim(),
      reportId: String((opts && opts.reportId) || (stored && stored.reportId) || "").trim(),
      sectionId: String((opts && opts.sectionId) || (stored && stored.sectionId) || "").trim(),
      groupId: String((opts && opts.groupId) || (stored && stored.groupId) || "").trim(),
    };
  }

  function openModal(opts) {
    var baseUrl = ((opts && opts.baseUrl) || scriptBaseUrl() || "https://eduardoos.com").replace(/\/$/, "");
    var ids = resolveIds(opts || {});
    if (!ids.orgId || !ids.reportId) {
      openConfigure(opts || {});
      return;
    }
    var params = new URLSearchParams();
    params.set("org", ids.orgId);
    params.set("report", ids.reportId);
    openIframeModal({
      baseUrl: baseUrl,
      label: (opts && opts.label) || "eReport",
      src: baseUrl + "/ereport/web-connector?" + params.toString(),
      initMessage: { type: INIT_TYPE, orgId: ids.orgId, reportId: ids.reportId },
    });
  }

  function openConfigure(opts) {
    var baseUrl = ((opts && opts.baseUrl) || scriptBaseUrl() || "https://eduardoos.com").replace(/\/$/, "");
    openIframeModal({
      baseUrl: baseUrl,
      label: "Configure eReport",
      src: baseUrl + "/ereport/connector-config",
      onConfigDone: function (data) {
        var binding = {
          orgId: String(data.orgId || ""),
          reportId: String(data.reportId || ""),
          sectionId: String(data.sectionId || ""),
          groupId: String(data.groupId || ""),
          tema: String(data.tema || ""),
        };
        if (!binding.orgId || !binding.reportId) return;
        saveBinding(binding);
        if (opts && typeof opts.onConfigured === "function") {
          opts.onConfigured(binding);
        }
      },
    });
  }

  function mount(options) {
    var opts = options || {};
    var baseUrl = (opts.baseUrl || scriptBaseUrl() || "https://eduardoos.com").replace(/\/$/, "");
    ensureTheme(baseUrl);

    if (opts.orgId && opts.reportId) {
      saveBinding({
        orgId: String(opts.orgId),
        reportId: String(opts.reportId),
        sectionId: opts.sectionId ? String(opts.sectionId) : "",
        groupId: opts.groupId ? String(opts.groupId) : "",
        tema: opts.tema ? String(opts.tema) : "",
      });
    }

    var label = opts.label || "eReport";
    var open = function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      openModal(opts);
    };
    var configure = function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      openConfigure(opts);
    };

    function appendControls(parent) {
      var wrap = document.createElement("span");
      wrap.className = "eos-ereport-embed-controls";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "eos-ereport-embed-menu-btn";
      btn.textContent = label;
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
      btn.addEventListener("click", open);

      var gear = document.createElement("button");
      gear.type = "button";
      gear.className = "eos-ereport-embed-config-btn";
      gear.textContent = "⚙";
      gear.setAttribute("aria-label", "Configure eReport target");
      gear.setAttribute("title", "Configure report, section, subsection");
      gear.addEventListener("click", configure);

      wrap.appendChild(btn);
      wrap.appendChild(gear);
      parent.appendChild(wrap);
      return { open: open, configure: configure, close: closeOverlay, el: wrap, openBtn: btn, configBtn: gear };
    }

    if (opts.menuSelector) {
      var menu = document.querySelector(opts.menuSelector);
      if (menu) return appendControls(menu);
    }

    var fabWrap = document.createElement("div");
    fabWrap.className = "eos-ereport-embed-fab-wrap";
    var fab = document.createElement("button");
    fab.type = "button";
    fab.className = "eos-ereport-embed-fab";
    fab.textContent = label;
    fab.setAttribute("aria-label", label);
    fab.addEventListener("click", open);
    var fabGear = document.createElement("button");
    fabGear.type = "button";
    fabGear.className = "eos-ereport-embed-fab-config";
    fabGear.textContent = "⚙";
    fabGear.setAttribute("aria-label", "Configure eReport target");
    fabGear.setAttribute("title", "Configure report, section, subsection");
    fabGear.addEventListener("click", configure);
    fabWrap.appendChild(fab);
    fabWrap.appendChild(fabGear);
    document.body.appendChild(fabWrap);
    return { open: open, configure: configure, close: closeOverlay, el: fabWrap };
  }

  global.EduardoOSEreport = {
    mount: mount,
    open: openModal,
    configure: openConfigure,
    close: closeOverlay,
  };
})(typeof window !== "undefined" ? window : this);
