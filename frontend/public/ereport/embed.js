/**
 * eReport web connector loader for host websites.
 * Usage:
 *   <script src="https://eduardoos.com/ereport/embed.js"></script>
 *   <script>
 *     EduardoOSEreport.mount({
 *       apiKey: "eos_live_…",
 *       menuSelector: "#main-menu nav", // optional
 *       label: "eReport",
 *       baseUrl: "https://eduardoos.com"
 *     });
 *   </script>
 *
 * The API key is for the key owner’s own projects. Do not embed third-party keys
 * on public anonymous sites.
 */
(function (global) {
  "use strict";

  var INIT_TYPE = "ereport-embed-init";
  var READY_TYPE = "ereport-embed-ready";
  var OVERLAY_ID = "eduardoos-ereport-embed-overlay";
  var STYLE_ID = "eduardoos-ereport-embed-style";
  var activeMessageHandler = null;

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "#" + OVERLAY_ID + "{",
      "position:fixed;inset:0;z-index:2147483646;",
      "display:flex;align-items:center;justify-content:center;",
      "background:rgba(0,0,0,0.45);",
      "padding:1rem;box-sizing:border-box;",
      "}",
      "#" + OVERLAY_ID + " .eos-ereport-embed-frame{",
      "position:relative;width:min(40rem,100%);height:min(48rem,100%);",
      "border:0;border-radius:0.25rem;background:#121212;",
      "box-shadow:0 0.5rem 2rem rgba(0,0,0,0.35);",
      "}",
      "#" + OVERLAY_ID + " iframe{",
      "width:100%;height:100%;border:0;border-radius:0.25rem;display:block;",
      "}",
      "#" + OVERLAY_ID + " .eos-ereport-embed-close{",
      "position:absolute;top:0.5rem;right:0.5rem;z-index:2;",
      "width:2.5rem;height:2.5rem;border-radius:50%;border:0;",
      "cursor:pointer;background:rgba(255,255,255,0.12);color:#f5f5f5;",
      "font-size:1.25rem;line-height:1;",
      "}",
      ".eos-ereport-embed-menu-btn{cursor:pointer;}",
      ".eos-ereport-embed-fab{",
      "position:fixed;bottom:1rem;right:1rem;z-index:2147483645;",
      "padding:0.5rem 1rem;border-radius:0.25rem;border:0.0625rem solid currentColor;",
      "background:#121212;color:#f5f5f5;cursor:pointer;font:inherit;",
      "}",
    ].join("");
    document.head.appendChild(style);
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
    ensureStyles();
    closeOverlay();

    var baseUrl = (opts.baseUrl || "https://eduardoos.com").replace(/\/$/, "");
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
    ensureStyles();

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
