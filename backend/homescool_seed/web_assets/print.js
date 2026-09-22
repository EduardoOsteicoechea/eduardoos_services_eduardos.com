/**
 * Materiales de estudio — botón de impresión (icono fijo, esquina superior derecha).
 * Si el documento mezcla vertical + horizontal, ofrece dos modos de impresión
 * (los navegadores no respetan bien orientaciones mixtas en un solo print).
 * Expone window.StudyPrint.
 */
(function () {
  "use strict";

  var STYLE_ID = "study-print-orientation";
  var FILTER_PORTRAIT = "print-filter-portrait";
  var FILTER_LANDSCAPE = "print-filter-landscape";

  function hasPortrait() {
    return !!document.querySelector(".page:not(.page--landscape)");
  }

  function hasLandscape() {
    return !!document.querySelector(".page--landscape");
  }

  function isMixed() {
    return hasPortrait() && hasLandscape();
  }

  function setOrientationStyle(orientation) {
    var el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    var size =
      orientation === "landscape" ? "letter landscape" : "letter portrait";
    el.textContent = "@page { size: " + size + "; margin: 0; }";
  }

  function clearOrientationStyle() {
    var el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  function clearFilters() {
    document.body.classList.remove(FILTER_PORTRAIT, FILTER_LANDSCAPE);
  }

  function printOrientation(orientation) {
    clearFilters();
    if (orientation === "landscape") {
      document.body.classList.add(FILTER_LANDSCAPE);
      setOrientationStyle("landscape");
    } else {
      document.body.classList.add(FILTER_PORTRAIT);
      setOrientationStyle("portrait");
    }

    var cleaned = false;
    function cleanup() {
      if (cleaned) return;
      cleaned = true;
      clearFilters();
      clearOrientationStyle();
      window.removeEventListener("afterprint", cleanup);
    }

    window.addEventListener("afterprint", cleanup);
    window.print();
    // Fallback si afterprint no dispara (algunos motores)
    setTimeout(cleanup, 2000);
  }

  function printSheet() {
    if (isMixed()) {
      // Por defecto imprime solo verticales; el menú ofrece ambas.
      openMenu();
      return;
    }
    if (hasLandscape() && !hasPortrait()) {
      printOrientation("landscape");
      return;
    }
    printOrientation("portrait");
  }

  function openMenu() {
    var existing = document.querySelector(".print-menu");
    if (existing) {
      existing.remove();
      return;
    }

    var menu = document.createElement("div");
    menu.className = "print-menu no-print";
    menu.setAttribute("role", "menu");

    function addItem(label, orientation) {
      var item = document.createElement("button");
      item.type = "button";
      item.className = "print-menu__item";
      item.setAttribute("role", "menuitem");
      item.textContent = label;
      item.addEventListener("click", function () {
        menu.remove();
        printOrientation(orientation);
      });
      menu.appendChild(item);
    }

    addItem("Imprimir verticales", "portrait");
    addItem("Imprimir horizontales", "landscape");

    document.body.appendChild(menu);

    function onDocClick(ev) {
      if (menu.contains(ev.target)) return;
      if (ev.target.closest && ev.target.closest(".print-fab")) return;
      menu.remove();
      document.removeEventListener("click", onDocClick, true);
    }
    setTimeout(function () {
      document.addEventListener("click", onDocClick, true);
    }, 0);
  }

  function mountPrintBar() {
    if (document.querySelector(".print-fab")) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "print-fab no-print";
    var label = isMixed() ? "Imprimir (elige orientación)" : "Imprimir hoja";
    btn.setAttribute("aria-label", label);
    btn.setAttribute("title", label);
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
      '<path fill="currentColor" d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>' +
      "</svg>";
    btn.addEventListener("click", printSheet);

    document.body.appendChild(btn);
  }

  function init() {
    // Documento solo-horizontal: orientación correcta sin menú
    if (hasLandscape() && !hasPortrait()) {
      document.body.classList.add("sheets-landscape");
    }
    mountPrintBar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.StudyPrint = {
    print: printSheet,
    printOrientation: printOrientation,
    mount: mountPrintBar,
  };
})();
