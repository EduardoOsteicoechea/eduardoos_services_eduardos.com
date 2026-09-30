/**
 * eReport web connector loader for host websites.
 *
 * Auth: eduardoos.com cookie session + eReport subscription (no API key paste).
 * The host locks the modal to one report:
 *
 *   <link rel="stylesheet" href="https://eduardoos.com/ereport/embed-theme.css" />
 *   <script src="https://eduardoos.com/ereport/embed.js"></script>
 *   <script>
 *     EduardoOSEreport.mount({
 *       orgId: "…",
 *       reportId: "…",
 *       menuSelector: "#main-menu nav",
 *       label: "eReport",
 *       baseUrl: "https://eduardoos.com"
 *     });
 *   </script>
 *
 * Override --eos-ereport-* so the menu control matches the host chrome.
 */
(function (global) {
  "use strict";

  var INIT_TYPE = "ereport-embed-init";
  var READY_TYPE = "ereport-embed-ready";
  var CLOSE_TYPE = "ereport-embed-close";
  var OVERLAY_ID = "eduardoos-ereport-embed-overlay";
  var THEME_ID = "eduardoos-ereport-embed-theme";
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

  function openModal(opts) {
    var baseUrl = (opts.baseUrl || scriptBaseUrl() || "https://eduardoos.com").replace(/\/$/, "");
    var orgId = String(opts.orgId || "").trim();
    var reportId = String(opts.reportId || "").trim();
    if (!orgId || !reportId) {
      throw new Error("EduardoOSEreport.open requires orgId and reportId");
    }
    ensureTheme(baseUrl);
    closeOverlay();

    var params = new URLSearchParams();
    params.set("org", orgId);
    params.set("report", reportId);

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
    iframe.src = baseUrl + "/ereport/web-connector?" + params.toString();
    iframe.title = opts.label || "eReport connector";
    iframe.setAttribute("allow", "clipboard-write");

    var sent = false;
    function sendInit() {
      if (sent || !iframe.contentWindow) return;
      try {
        iframe.contentWindow.postMessage({ type: INIT_TYPE, orgId: orgId, reportId: reportId }, baseUrl);
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

  function mount(options) {
    var opts = options || {};
    if (!opts.orgId || !opts.reportId) {
      throw new Error("EduardoOSEreport.mount requires orgId and reportId");
    }
    var baseUrl = (opts.baseUrl || scriptBaseUrl() || "https://eduardoos.com").replace(/\/$/, "");
    ensureTheme(baseUrl);

    var label = opts.label || "eReport";
    var open = function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      openModal(opts);
    };

    if (opts.menuSelector) {
      var menu = document.querySelector(opts.menuSelector);
      if (menu) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "eos-ereport-embed-menu-btn";
        btn.textContent = label;
        btn.setAttribute("aria-label", label);
        btn.setAttribute("title", label);
        btn.addEventListener("click", open);
        menu.appendChild(btn);
        return { open: open, close: closeOverlay, el: btn };
      }
    }

    var fab = document.createElement("button");
    fab.type = "button";
    fab.className = "eos-ereport-embed-fab";
    fab.textContent = label;
    fab.setAttribute("aria-label", label);
    fab.addEventListener("click", open);
    document.body.appendChild(fab);
    return { open: open, close: closeOverlay, el: fab };
  }

  global.EduardoOSEreport = {
    mount: mount,
    open: openModal,
    close: closeOverlay,
  };
})(typeof window !== "undefined" ? window : this);
