/**
 * eReport web connector loader for host websites (Mode W).
 *
 * Happy path — no eduardoos.com login, no Configure wizard:
 *
 *   <link rel="stylesheet" href="https://eduardoos.com/ereport/embed-theme.css" />
 *   <script src="https://eduardoos.com/ereport/embed.js"></script>
 *   <script>
 *     EduardoOSEreport.mount({
 *       // Preferred (A): short-lived token minted by the host backend via
 *       // POST /api/v1/ereport/embed-token with the site's eos_live_ key.
 *       token: "eos_embed_…",
 *       // Or local/dev (C): pass apiKey only in memory; never commit to public JS.
 *       // apiKey: "eos_live_…",
 *       orgId: "…",
 *       reportId: "…",
 *       menuSelector: "#app-main-nav",
 *       ui: { mode: "bug-icon-only" },
 *       baseUrl: "https://eduardoos.com"
 *     });
 *   </script>
 *
 * Click → cookie-less /ereport/embed-issue iframe. Writes require the page
 * origin to match connectorHosts on the website_registration report (hub).
 * Configure (/ereport/connector-config) is opt-in via ui.showConfigure: true.
 */
(function (global) {
  "use strict";

  var INIT_TYPE = "ereport-embed-issue-init";
  var READY_TYPE = "ereport-embed-issue-ready";
  var CLOSE_TYPE = "ereport-embed-close";
  var CONFIG_DONE_TYPE = "ereport-embed-config-done";
  var LEGACY_INIT_TYPE = "ereport-embed-init";
  var OVERLAY_ID = "eduardoos-ereport-embed-overlay";
  var THEME_ID = "eduardoos-ereport-embed-theme";
  var BINDING_KEY = "ereport.embed.binding";
  var activeMessageHandler = null;

  var BUG_SVG =
    '<svg class="eos-ereport-embed-bug-svg" viewBox="0 0 24 24" width="1.5rem" height="1.5rem" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5s-.96.06-1.42.17L8.41 3 7 4.41l1.63 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z"/>' +
    "</svg>";

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
    try {
      localStorage.setItem(BINDING_KEY, JSON.stringify(binding));
    } catch (e) {
      /* ignore */
    }
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
    overlay.setAttribute("aria-label", opts.label || "Report an issue");

    var frameWrap = document.createElement("div");
    frameWrap.className = "eos-ereport-embed-frame";

    var hideOuterClose = Boolean(opts.hideOuterClose);
    var closeBtn = null;
    if (!hideOuterClose) {
      closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "eos-ereport-embed-close";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.textContent = "×";
      closeBtn.addEventListener("click", closeOverlay);
    }

    var iframe = document.createElement("iframe");
    iframe.src = opts.src;
    iframe.title = opts.label || "eReport";
    iframe.setAttribute("allow", "clipboard-write");
    if (hideOuterClose) {
      frameWrap.className = "eos-ereport-embed-frame eos-ereport-embed-frame--bare";
    }

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

    if (closeBtn) frameWrap.appendChild(closeBtn);
    frameWrap.appendChild(iframe);
    overlay.appendChild(frameWrap);
    document.body.appendChild(overlay);
    document.documentElement.classList.add("ereport-connector-open");
    document.addEventListener("keydown", onEscape, true);
    if (closeBtn) closeBtn.focus();
    else iframe.focus();
  }

  function resolveIds(opts) {
    var stored = loadBinding();
    return {
      orgId: String((opts && opts.orgId) || (stored && stored.orgId) || "").trim(),
      reportId: String((opts && opts.reportId) || (stored && stored.reportId) || "").trim(),
      sectionId: String((opts && opts.sectionId) || (stored && stored.sectionId) || "").trim(),
      groupId: String((opts && opts.groupId) || (stored && stored.groupId) || "").trim(),
      token: String((opts && (opts.token || opts.connectorToken)) || "").trim(),
      apiKey: String((opts && opts.apiKey) || "").trim(),
    };
  }

  function hasAuth(ids) {
    return Boolean(ids.token || ids.apiKey);
  }

  function openQuickIssue(opts) {
    var baseUrl = ((opts && opts.baseUrl) || scriptBaseUrl() || "https://eduardoos.com").replace(/\/$/, "");
    var ids = resolveIds(opts || {});
    if (!ids.orgId || !ids.reportId) {
      showHostError("eReport mount needs orgId and reportId (from .ereport/.env / hub website registration).");
      return;
    }
    if (!hasAuth(ids)) {
      showHostError(
        "eReport mount needs token (preferred) or apiKey. Mint via POST /api/v1/ereport/embed-token from your host backend; do not rely on Configure.",
      );
      return;
    }
    var hostOrigin = "";
    try {
      hostOrigin = location.origin || "";
    } catch (e) {
      hostOrigin = "";
    }
    openIframeModal({
      baseUrl: baseUrl,
      label: "Website issues",
      src: baseUrl + "/ereport/embed-issue",
      hideOuterClose: true,
      initMessage: {
        type: INIT_TYPE,
        orgId: ids.orgId,
        reportId: ids.reportId,
        hostOrigin: hostOrigin,
        token: ids.token || undefined,
        apiKey: ids.token ? undefined : ids.apiKey || undefined,
      },
    });
  }

  function showHostError(message) {
    try {
      window.alert(message);
    } catch (e) {
      /* ignore */
    }
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

  /** Legacy session iframe (cookie on eduardoos.com). Kept for explicit opt-in. */
  function openLegacySessionModal(opts) {
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
      initMessage: { type: LEGACY_INIT_TYPE, orgId: ids.orgId, reportId: ids.reportId },
    });
  }

  function uiMode(opts) {
    var ui = (opts && opts.ui) || {};
    if (ui.mode === "labeled" || ui.mode === "label") return "labeled";
    return "bug-icon-only";
  }

  function showConfigureControl(opts) {
    var ui = (opts && opts.ui) || {};
    if (ui.showConfigure === true) return true;
    if (ui.showConfigure === false) return false;
    // Default: hide Configure when mount already has org+report (+ auth).
    var ids = resolveIds(opts || {});
    return !(ids.orgId && ids.reportId && hasAuth(ids));
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

    var mode = uiMode(opts);
    var withGear = showConfigureControl(opts);
    var aria = opts.ariaLabel || opts.label || "Report an issue";

    var open = function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      if (opts.legacySessionModal) {
        openLegacySessionModal(opts);
        return;
      }
      openQuickIssue(opts);
    };
    var configure = function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      openConfigure(opts);
    };

    function appendBugButton(parent) {
      var wrap = document.createElement("span");
      wrap.className = "eos-ereport-embed-controls";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        mode === "labeled" ? "eos-ereport-embed-menu-btn" : "eos-ereport-embed-bug-btn";
      btn.setAttribute("aria-label", aria);
      btn.setAttribute("title", aria);
      if (mode === "labeled") {
        btn.textContent = opts.label || "eReport";
      } else {
        btn.innerHTML = BUG_SVG;
      }
      btn.addEventListener("click", open);
      wrap.appendChild(btn);

      if (withGear) {
        var gear = document.createElement("button");
        gear.type = "button";
        gear.className = "eos-ereport-embed-config-btn";
        gear.textContent = "⚙";
        gear.setAttribute("aria-label", "Configure eReport target");
        gear.setAttribute("title", "Configure report, section, subsection (hub owners)");
        gear.addEventListener("click", configure);
        wrap.appendChild(gear);
      }

      parent.appendChild(wrap);
      return { open: open, configure: configure, close: closeOverlay, el: wrap, openBtn: btn };
    }

    if (opts.menuSelector) {
      var menu = document.querySelector(opts.menuSelector);
      if (menu) return appendBugButton(menu);
    }

    var fabWrap = document.createElement("div");
    fabWrap.className = "eos-ereport-embed-fab-wrap";
    var fab = document.createElement("button");
    fab.type = "button";
    fab.className = mode === "labeled" ? "eos-ereport-embed-fab" : "eos-ereport-embed-fab eos-ereport-embed-fab--bug";
    fab.setAttribute("aria-label", aria);
    fab.setAttribute("title", aria);
    if (mode === "labeled") {
      fab.textContent = opts.label || "eReport";
    } else {
      fab.innerHTML = BUG_SVG;
    }
    fab.addEventListener("click", open);
    fabWrap.appendChild(fab);
    if (withGear) {
      var fabGear = document.createElement("button");
      fabGear.type = "button";
      fabGear.className = "eos-ereport-embed-fab-config";
      fabGear.textContent = "⚙";
      fabGear.setAttribute("aria-label", "Configure eReport target");
      fabGear.setAttribute("title", "Configure report, section, subsection (hub owners)");
      fabGear.addEventListener("click", configure);
      fabWrap.appendChild(fabGear);
    }
    document.body.appendChild(fabWrap);
    return { open: open, configure: configure, close: closeOverlay, el: fabWrap };
  }

  global.EduardoOSEreport = {
    mount: mount,
    open: openQuickIssue,
    configure: openConfigure,
    close: closeOverlay,
  };
})(typeof window !== "undefined" ? window : this);
