/**
 * Mapa con cuadrícula modular — componente reutilizable.
 * La cuadrícula incluye las celdas de letras/números (tablero cols+2 × rows+2).
 * Modos: estados (16×16) | ciudades (32×32).
 */
(function () {
  "use strict";

  var MODES = {
    estados: { cols: 16, rows: 16, label: "Regional / estados" },
    ciudades: { cols: 32, rows: 32, label: "Ciudades" },
  };

  var BOUNDS = {
    north: 12.8,
    south: 0.4,
    west: 73.6,
    east: 59.6,
  };

  /* Acercamientos sobre venezuela.svg (origen % dentro del contorno) */
  var ZOOM_LEVELS = {
    pais: { scale: 1, originX: 50, originY: 50 },
    estado: { scale: 3.2, originX: 27, originY: 63 },
    ciudad: { scale: 6, originX: 25.5, originY: 64.5 },
    municipio: { scale: 10, originX: 25.2, originY: 64.8 },
    parroquia: { scale: 16, originX: 25, originY: 65 },
    sector: { scale: 26, originX: 24.8, originY: 65.2 },
  };

  function rowLetter(index) {
    var n = index;
    var label = "";
    while (n >= 0) {
      label = String.fromCharCode(97 + (n % 26)) + label;
      n = Math.floor(n / 26) - 1;
    }
    return label;
  }

  function resolveMode(mode) {
    return MODES[mode] ? mode : "estados";
  }

  function resolveCols(options) {
    if (options.cols) return options.cols;
    return MODES[resolveMode(options.mode)].cols;
  }

  function rowsForCols(cols, mode) {
    var resolved = resolveMode(mode);
    if (MODES[resolved] && MODES[resolved].rows) return MODES[resolved].rows;
    return cols;
  }

  function resolveMapUrl(host, options) {
    if (options.mapUrl) return options.mapUrl;
    if (options.referenceUrl) return options.referenceUrl;
    var reference = host.getAttribute("data-reference");
    if (reference) return reference;
    if (options.imageUrl) return options.imageUrl;
    if (options.svgUrl) return options.svgUrl;
    var svg = host.getAttribute("data-svg");
    if (svg) return svg;
    var image = host.getAttribute("data-image");
    if (image) return image;
    return "venezuela.svg";
  }

  function usesReference(host, options) {
    return !!(
      options.referenceUrl ||
      host.getAttribute("data-reference")
    );
  }

  function resolveZoom(host, options) {
    var zoom = options.zoom || host.getAttribute("data-zoom");
    return ZOOM_LEVELS[zoom] ? zoom : "pais";
  }

  function applyZoom(mapImg, zoomKey) {
    var zoom = ZOOM_LEVELS[zoomKey] || ZOOM_LEVELS.pais;
    mapImg.style.transformOrigin = zoom.originX + "% " + zoom.originY + "%";
    mapImg.style.transform = zoom.scale === 1 ? "none" : "scale(" + zoom.scale + ")";
  }

  function latLngToCell(lat, lng, cols, rows) {
    var x = (BOUNDS.west - lng) / (BOUNDS.west - BOUNDS.east);
    var y = (BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south);
    var col = Math.min(cols, Math.max(1, Math.round(x * cols) || 1));
    var row = Math.min(rows, Math.max(1, Math.round(y * rows) || 1));
    return {
      col: col,
      row: row,
      code: col + rowLetter(row - 1),
    };
  }

  function createCell(className, text) {
    var cell = document.createElement("div");
    cell.className = "map-grid__cell " + className;
    if (text != null) cell.textContent = text;
    return cell;
  }

  function mount(host, options) {
    if (!host) return null;

    options = options || {};
    var mode = resolveMode(options.mode || host.getAttribute("data-mode"));
    var cols = resolveCols({ mode: mode, cols: options.cols });
    var rows = rowsForCols(cols, mode);
    var mapUrl = resolveMapUrl(host, options);
    var isReference = usesReference(host, options);
    var zoomKey = resolveZoom(host, options);
    var totalCols = cols + 2;
    var totalRows = rows + 2;

    host.classList.add("map-grid");
    host.classList.add("map-grid--zoom-" + zoomKey);
    host.setAttribute("data-map-mode", mode);
    host.setAttribute("data-map-zoom", zoomKey);
    host.setAttribute("data-map-cols", String(cols));
    host.setAttribute("data-map-rows", String(rows));
    host.innerHTML = "";

    var board = document.createElement("div");
    board.className = "map-grid__board";
    board.style.setProperty("--map-cols", String(cols));
    board.style.setProperty("--map-rows", String(rows));
    board.style.setProperty("--total-cols", String(totalCols));
    board.style.setProperty("--total-rows", String(totalRows));
    board.setAttribute("role", "img");
    board.setAttribute("aria-label", "Mapa de Venezuela con cuadrícula " + cols + "×" + rows);

    var mapLayer = document.createElement("div");
    mapLayer.className = "map-grid__map-layer";
    mapLayer.setAttribute("aria-hidden", "true");

    var mapImg = document.createElement("img");
    mapImg.className = "map-grid__svg";
    mapImg.src = mapUrl;
    mapImg.alt = "";
    mapImg.draggable = false;
    if (isReference) {
      mapImg.classList.add("map-grid__reference");
      if (host.getAttribute("data-fit") === "height") {
        mapImg.classList.add("map-grid__reference--fit-height");
      }
    } else {
      applyZoom(mapImg, zoomKey);
    }
    mapLayer.appendChild(mapImg);

    var overlay = document.createElement("div");
    overlay.className = "map-grid__overlay";
    overlay.setAttribute("aria-hidden", "true");
    mapLayer.appendChild(overlay);

    board.appendChild(mapLayer);

    var r;
    var c;
    for (r = 0; r < totalRows; r++) {
      for (c = 0; c < totalCols; c++) {
        var isTop = r === 0;
        var isBottom = r === totalRows - 1;
        var isLeft = c === 0;
        var isRight = c === totalCols - 1;
        var isCorner = (isTop || isBottom) && (isLeft || isRight);
        var cell;

        if (isCorner) {
          cell = createCell("map-grid__cell--corner", "");
        } else if (isTop || isBottom) {
          cell = createCell("map-grid__cell--col", String(c));
        } else if (isLeft || isRight) {
          cell = createCell("map-grid__cell--row", rowLetter(r - 1));
        } else {
          cell = createCell("map-grid__cell--mod", "");
          cell.setAttribute("data-col", String(c));
          cell.setAttribute("data-row", rowLetter(r - 1));
          cell.title = c + rowLetter(r - 1);
        }

        if (isRight) cell.classList.add("map-grid__cell--edge-right");
        if (isBottom) cell.classList.add("map-grid__cell--edge-bottom");

        board.appendChild(cell);
      }
    }

    host.appendChild(board);

    return {
      mode: mode,
      cols: cols,
      rows: rows,
      latLngToCell: function (lat, lng) {
        return latLngToCell(lat, lng, cols, rows);
      },
    };
  }

  function autoMount() {
    var nodes = document.querySelectorAll("[data-map-grid]");
    var instances = [];
    nodes.forEach(function (node) {
      instances.push(
        mount(node, {
          mode: node.getAttribute("data-mode"),
          zoom: node.getAttribute("data-zoom"),
          referenceUrl: node.getAttribute("data-reference"),
          mapUrl:
            node.getAttribute("data-reference") ||
            node.getAttribute("data-svg") ||
            node.getAttribute("data-image"),
        })
      );
    });
    return instances;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoMount);
  } else {
    autoMount();
  }

  window.StudyMapGrid = {
    MODES: MODES,
    BOUNDS: BOUNDS,
    ZOOM_LEVELS: ZOOM_LEVELS,
    mount: mount,
    autoMount: autoMount,
    rowsForCols: rowsForCols,
    rowLetter: rowLetter,
    latLngToCell: latLngToCell,
  };
})();
