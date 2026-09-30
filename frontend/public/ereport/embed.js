/**
 * eReport web connector loader for host websites.
 *
 * Default look: /ereport/embed-theme.css (CSS variables --eos-ereport-*).
 * Host sites SHOULD override those variables (and .eos-ereport-embed-menu-btn)
 * so the control matches the site menu — see that file’s header comments.
 *
 * Usage:
 *   <link rel="stylesheet" href="https://eduardoos.com/ereport/embed-theme.css" />
 *   <script src="https://eduardoos.com/ereport/embed.js"></script>
 *   <script>
 *     EduardoOSEreport.mount({
 *       apiKey: "eos_live_…",
 *       menuSelector: "#main-menu nav",
 *       label: "eReport",
 *       baseUrl: "https://eduardoos.com"
 *     });
 *   </script>
 */
(function (global) {
  "use strict";

  var INIT_TYPE = "ereport-embed-init";
  var READY_TYPE = "ereport-embed-ready";
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
    if (ev.key === "Escape") {
      closeOverlay();
    }
  }

  function closeOverlay() {
    var existing = document.getElementById(OVERLAY_ID);
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    document.removeEventListener("keydown", onEscape, true);
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
    iframe.src = baseUrl + "/ereport/web-connector";
    iframe.title = opts.label || "eReport connector";
    iframe.setAttribute("allow", "clipboard-write");

    var apiKey = opts.apiKey || "";
    var sent = false;

    function sendInit() {
      if (sent || !apiKey || !iframe.contentWindow) return;
      try {
        iframe.contentWindow.postMessage({ type: INIT_TYPE, apiKey: apiKey }, baseUrl);
        sent = true;
      } catch (e) {
        /* ignore */
      }
    }

    iframe.addEventListener("load", sendInit);

    activeMessageHandler = function (ev) {
      if (!ev || !ev.data || typeof ev.data !== "object") return;
      if (!sameHost(ev.origin, baseUrl)) return;
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
    document.addEventListener("keydown", onEscape, true);
    closeBtn.focus();
  }

  function mount(options) {
    var opts = options || {};
    if (!opts.apiKey || typeof opts.apiKey !== "string") {
      throw new Error("EduardoOSEreport.mount requires apiKey (eos_live_…)");
    }
    var baseUrl = (opts.baseUrl || scriptBaseUrl() || "https://eduardoos.com").replace(/\/$/, "");
    ensureTheme(baseUrl);

    var label = opts.label || "eReport";
    var open = function (ev) {
      if (ev && ev.preventDefault) ev.preventDefault();
      openModal(opts);
    };

    var menuSelector = opts.menuSelector;
    if (menuSelector) {
      var menu = document.querySelector(menuSelector);
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
    open: function (opts) {
      openModal(opts || {});
    },
    close: closeOverlay,
  };
})(typeof window !== "undefined" ? window : this);
