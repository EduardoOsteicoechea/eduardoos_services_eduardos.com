package main

// Seed content for a fresh eocode workspace. The site is an SSR engine written
// in Python: site.py composes head + body + bottom component generators. The
// agent edits only Python files, never HTML/CSS/JS directly.

const eocodeInitialConstraints = `# Constraints de eocode (fijas, no editables)

Eres el agente codificador de eocode, un estudio para que un nino aprenda
programacion agentica construyendo su propio portafolio web.

## Arquitectura fija (motor SSR en Python) - NO LA CAMBIES
El sitio no tiene HTML, CSS ni JS editables por separado. Es un motor SSR:
- site.py SOLO concatena tres generadores:
    render_head() + render_body() + render_bottom()
  site.py es inmutable: no lo edites ni le anadas mas concatenaciones.
- components/head.py -> render_head(): devuelve <!DOCTYPE html><html><head>...
  Es el UNICO lugar donde vive el CSS, dentro de <style>.
- components/body.py -> render_body(): arma el <body>, el nav y envuelve cada
  vista en <section data-view="...">.
- components/bottom.py -> render_bottom(): devuelve <script>...</script></body></html>
  Es el UNICO lugar donde vive el JavaScript.
- views/<nombre>.py -> NAME, LABEL, render(): HTML INTERIOR de UNA vista.
  Sin <html>, <head>, <body>, nav ni script. Una vista = una "ruta" de la SPA.
El backend ejecuta site.py y sirve su salida (stdout) como el HTML del sitio.

## Archivos
- SOLO se trabaja con archivos .py (ademas de rules/*.md, .json, .svg y assets/).
- NO crees ni edites .html, .css ni .js.
- Para una vista/ruta nueva: crea views/<nombre>.py y actualiza VIEWS en
  components/body.py. NUNCA concatenes esa vista en site.py.
- site.py, components/head.py, components/body.py y components/bottom.py no se borran.
- rules/constraints.md es fija: NUNCA la edites.
- rules/index.md se envia siempre y se actualiza al anadir o borrar generadores/reglas.

## Seguridad del motor Python
- Prohibido importar o usar: os, sys, subprocess, socket, shutil, pathlib,
  importlib, ctypes, pickle, marshal, urllib, requests, http, platform.
- Prohibido eval, exec, compile, open, input, __import__, __builtins__ y cualquier
  atributo __dunder__ (__class__, __globals__, __subclasses__, etc.).
- Los generadores solo manipulan strings y devuelven HTML. Nada de archivos ni red.

## HTML, CSS y JS generados
- HTML5 semantico: <header>, <nav>, <main>, <section>, <article>, <footer>.
- El sitio es una SPA: cada vista es <section data-view="nombre" class="view">.
  Solo la activa lleva class="active". El CSS oculta las demas.
- Los enlaces internos son <button type="button" data-route="nombre"> o
  <a href="#nombre">. Prohibido <a href="/pagina"> y archivos .html de ruta.
- CSS con variables en :root, rem para tipografia y espaciado, flexbox/grid.
- Incluye SIEMPRE un bloque @media print para US Letter vertical (8.5in x 11in)
  con margenes y saltos de pagina correctos (es un portafolio que se imprime).
- JavaScript vanilla (ES2020+). Sin frameworks, sin librerias, sin CDNs.

## Imagenes
- Las imagenes que sube el usuario viven en assets/, convertidas a WebP (GIF se
  conserva). Referencialas como assets/nombre.webp en el HTML generado.

## Comportamiento pedagogico
- NO asumas requisitos. Antes de un cambio grande, haz preguntas de clarificacion.
- NO investigues temas externos. Si preguntan algo fuera de esto, pide que lo
  investiguen y ofrece publicarlo como contenido estatico generado por Python.
- Explica brevemente que vas a hacer y por que antes de hacerlo.
- Fomenta el pensamiento critico: explica alternativas y consecuencias.

## Seguridad del sitio
- Nunca pongas secretos, claves API, contrasenas ni datos personales.
- Nunca imprimas texto no confiable del usuario sin escaparlo.
`

const eocodeInitialRulesIndex = `# Indice de generadores HTML (SSR Python)

Este archivo documenta los generadores del sitio. Es la arquitectura fija: no la
cambies. Cada generador es un archivo .py que devuelve un string de HTML. Este
indice se envia siempre al agente y se actualiza cuando se anaden o borran
generadores o reglas.

## site.py
- Punto de entrada del SSR. Importa y concatena SOLO:
  render_head() + render_body() + render_bottom().
- Inmutable. El backend lo restaura si se modifica.
- El backend ejecuta site.py y devuelve su salida como HTML.

## components/head.py
- render_head(): devuelve <!DOCTYPE html><html><head>...</head>.
- UNICO lugar donde vive el CSS (dentro de <style>).
- Debe ocultar .view { display:none } y mostrar .view.active { display:block }.

## components/body.py
- render_body(): devuelve <body> con nav y las secciones data-view.
- Importa cada vista de views/ y las envuelve. No apila paginas completas.

## components/bottom.py
- render_bottom(): devuelve <script>...</script></body></html>.
- UNICO lugar donde vive el JavaScript. Router por hash (#nombre).

## views/
- Un archivo por vista/ruta: NAME, LABEL, render().
- render() devuelve solo el HTML interior (titulos, textos, imagenes).
- Sin <html>, <body>, nav, <style> ni <script>.

## assets/
- Imagenes del usuario (WebP/GIF). Referencia relativa: assets/nombre.webp.

## rules/atomic-ssr.md
- Reglas de la arquitectura SSR y de los generadores Python.

## rules/atomic-styles.md
- Reglas de CSS, que se escribe solo en components/head.py.

## rules/atomic-content.md
- Reglas del contenido HTML, que se escribe solo en components/body.py.

## rules/atomic-scripts.md
- Reglas de JavaScript, que se escribe solo en components/bottom.py.

## rules/atomic-assets.md
- Manejo de imagenes, SVG y assets.
`

const eocodeInitialAtomicSSR = `# Reglas del motor SSR (Python)

- El sitio es Python puro que genera HTML. No hay archivos .html/.css/.js.
- site.py es el punto de entrada y SOLO concatena head + body + bottom.
- NUNCA importes ni concatenes vistas extra en site.py: eso apila todo en una pagina.
- Cada vista es un modulo en views/ con NAME, LABEL y render().
- body.py importa las vistas y las envuelve en <section data-view>.
- Devuelve SIEMPRE strings completos y validos; nada de escribir archivos.
- Prohibido os, sys, subprocess, socket, file I/O, red, eval, exec y __dunder__.
`

const eocodeInitialAtomicStyles = `# Reglas CSS (solo en components/head.py)

- Todo el CSS vive en components/head.py dentro de un bloque <style>.
- Define variables en :root para colores, espaciado y tipografia.
- Usa rem para tipografia y espaciado; evita px para el texto.
- Diseno responsive con flexbox y grid.
- Las vistas .view se ocultan con display:none y la activa con display:block.
- Incluye siempre @media print para US Letter vertical:
  @page { size: letter portrait; margin: 0.5in; }
  Oculta nav, botones y footer con display:none !important.
  Evita cortes con break-inside: avoid; page-break-inside: avoid;
`

const eocodeInitialAtomicContent = `# Reglas de contenido (solo en components/body.py y views/)

- render_body() arma <body>, el nav y las secciones de la SPA.
- Cada vista vive en views/<nombre>.py y solo devuelve el HTML interior.
- Cada vista es un <section data-view="nombre" class="view">; solo la activa
  lleva class="active".
- Los enlaces internos usan <button type="button" data-route="nombre">.
  Prohibido <a href="/ruta"> y .html de navegacion.
- Usa etiquetas semanticas: <header>, <nav>, <main>, <section>, <article>, <footer>.
- Referencia imagenes como assets/nombre.webp.
- Para datos dinamicos usa formato de strings de Python (f-strings) con cuidado.
`

const eocodeInitialAtomicScripts = `# Reglas JavaScript (solo en components/bottom.py)

- Todo el JavaScript vive en components/bottom.py dentro de un <script>.
- render_bottom() devuelve <script>...</script></body></html>.
- Vanilla JS (ES2020+), sin frameworks ni imports externos.
- El router escucha clicks en [data-route] y <a href="#nombre">, activa el
  [data-view] correcto y escribe location.hash.
- Nunca uses location.pathname ni archivos .html para navegar: el preview
  solo tiene un documento.
- Usa funciones pequenas y con nombres claros; usa textContent, no innerHTML.
- Escucha DOMContentLoaded antes de consultar el DOM.
- Para canvas, obten el contexto con getContext("2d") y dibuja tras DOMContentLoaded.
`

const eocodeInitialAtomicAssets = `# Reglas de assets

- Imagenes en assets/. Referencia relativa: assets/nombre.webp o assets/nombre.gif.
- Prefiere WebP para fotos; conserva GIF cuando necesites animacion.
- SVG: inline en el HTML generado o como archivo .svg si es reutilizable.
- No subas binarios pesados: el limite es 8 MB y 2048 px por lado.
`

const eocodeInitialSitePy = `"""SSR entry point for the portfolio site.

This module is immutable: it concatenates head + body + bottom only.
Never import views here. Extra views belong in views/*.py and body.py.
"""
from components.head import render_head
from components.body import render_body
from components.bottom import render_bottom


def render_page():
    return render_head() + render_body() + render_bottom()


if __name__ == "__main__":
    print(render_page())
`

const eocodeInitialComponentsInit = `"""HTML component generators for the eocode SSR site."""
`

const eocodeInitialHeadPy = `"""Head generator. This is the only place where CSS lives."""

STYLES = """
:root {
  --color-bg: #ffffff;
  --color-surface: #f4f4f5;
  --color-text: #18181b;
  --color-muted: #52525b;
  --color-accent: #2563eb;
  --color-border: #e4e4e7;
  --space: 1rem;
  --radius: 0.5rem;
  --max-width: 56rem;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.6;
}

.site-header,
main,
.site-footer {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: var(--space);
}

.site-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space);
  border-bottom: 0.0625rem solid var(--color-border);
}

.site-title {
  margin: 0;
  font-size: 1.5rem;
}

.site-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.site-nav button {
  font: inherit;
  padding: 0.5rem 0.75rem;
  border: 0.0625rem solid var(--color-border);
  border-radius: var(--radius);
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.site-nav button.active,
.site-nav button:hover {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #ffffff;
}

.view {
  display: none;
}

.view.active {
  display: block;
}

.site-footer {
  color: var(--color-muted);
  font-size: 0.875rem;
}

@media print {
  @page {
    size: letter portrait;
    margin: 0.5in;
  }

  body {
    font-size: 12pt;
    color: #000000;
  }

  .site-header,
  .site-nav,
  .site-footer,
  button {
    display: none !important;
  }

  .view {
    display: block !important;
  }

  main {
    max-width: none;
    padding: 0;
  }
}
"""


def render_head():
    return (
        "<!DOCTYPE html>"
        '<html lang="es">'
        "<head>"
        '<meta charset="UTF-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        "<title>Mi Portafolio</title>"
        "<style>" + STYLES + "</style>"
        "</head>"
    )
`

const eocodeInitialBodyPy = `"""Body generator. Assembles SPA views; it never concatenates full pages."""

from views.contacto import LABEL as CONTACTO_LABEL
from views.contacto import NAME as CONTACTO_NAME
from views.contacto import render as render_contacto
from views.inicio import LABEL as INICIO_LABEL
from views.inicio import NAME as INICIO_NAME
from views.inicio import render as render_inicio
from views.proyectos import LABEL as PROYECTOS_LABEL
from views.proyectos import NAME as PROYECTOS_NAME
from views.proyectos import render as render_proyectos
from views.sobre_mi import LABEL as SOBRE_LABEL
from views.sobre_mi import NAME as SOBRE_NAME
from views.sobre_mi import render as render_sobre

VIEWS = [
    (INICIO_NAME, INICIO_LABEL, render_inicio),
    (SOBRE_NAME, SOBRE_LABEL, render_sobre),
    (PROYECTOS_NAME, PROYECTOS_LABEL, render_proyectos),
    (CONTACTO_NAME, CONTACTO_LABEL, render_contacto),
]


def render_nav():
    parts = []
    for i, (name, label, _) in enumerate(VIEWS):
        active = ' class="active"' if i == 0 else ""
        parts.append(
            '<button type="button" data-route="'
            + name
            + '"'
            + active
            + ">"
            + label
            + "</button>"
        )
    return "".join(parts)


def render_sections():
    parts = []
    for i, (name, _, fn) in enumerate(VIEWS):
        cls = "view active" if i == 0 else "view"
        parts.append(
            '<section data-view="' + name + '" class="' + cls + '">' + fn() + "</section>"
        )
    return "".join(parts)


def render_body():
    return (
        "<body>"
        '<header class="site-header">'
        '<h1 class="site-title">Mi Portafolio</h1>'
        '<nav class="site-nav" aria-label="Principal">'
        + render_nav()
        + "</nav></header>"
        '<main id="app">'
        + render_sections()
        + "</main>"
        '<footer class="site-footer"><p>Hecho con eocode</p></footer>'
    )
`

const eocodeInitialBottomPy = `"""Bottom generator. This is the only place where JavaScript lives."""

SCRIPTS = """
document.addEventListener("DOMContentLoaded", function () {
  var views = Array.prototype.slice.call(document.querySelectorAll("[data-view]"));
  var buttons = document.querySelectorAll("[data-route]");

  function showView(name) {
    name = String(name || "").replace(/^#/, "").replace(/^\//, "");
    var found = false;
    views.forEach(function (view) {
      var match = view.getAttribute("data-view") === name;
      view.classList.toggle("active", match);
      if (match) found = true;
    });
    if (!found && views[0]) {
      views.forEach(function (view, i) { view.classList.toggle("active", i === 0); });
      name = views[0].getAttribute("data-view");
    }
    buttons.forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-route") === name);
    });
    if (name && location.hash !== "#" + name) {
      try { history.replaceState(null, "", "#" + name); } catch (err) {}
    }
  }

  document.addEventListener("click", function (ev) {
    var raw = ev.target;
    if (raw && raw.nodeType !== 1) raw = raw.parentElement;
    if (!raw || !raw.closest) return;
    var el = raw.closest("[data-route], a[href^='#']");
    if (!el) return;
    var route = el.getAttribute("data-route");
    if (!route && el.getAttribute("href")) route = el.getAttribute("href").replace(/^#/, "");
    if (!route) return;
    ev.preventDefault();
    showView(route);
  });

  window.addEventListener("hashchange", function () { showView(location.hash); });
  showView(location.hash || (views[0] && views[0].getAttribute("data-view")) || "inicio");
});
"""


def render_bottom():
    return "<script>" + SCRIPTS + "</script></body></html>"
`

const eocodeInitialViewsInit = `"""SPA view generators. Each module exposes NAME, LABEL, and render()."""
`

const eocodeInitialViewInicio = `"""Vista de inicio."""

NAME = "inicio"
LABEL = "Inicio"


def render():
    return """
      <h2>Bienvenido</h2>
      <p>Este es mi portafolio. Pidele al agente que lo construya contigo.</p>
    """
`

const eocodeInitialViewSobreMi = `"""Vista sobre mi."""

NAME = "sobre-mi"
LABEL = "Sobre mi"


def render():
    return """
      <h2>Sobre mi</h2>
      <p>Aqui puedes contar quien eres y que te gusta.</p>
    """
`

const eocodeInitialViewProyectos = `"""Vista de proyectos."""

NAME = "proyectos"
LABEL = "Proyectos"


def render():
    return """
      <h2>Proyectos</h2>
      <p>Aqui van tus proyectos con imagenes y descripciones.</p>
    """
`

const eocodeInitialViewContacto = `"""Vista de contacto."""

NAME = "contacto"
LABEL = "Contacto"


def render():
    return """
      <h2>Contacto</h2>
      <p>Aqui puedes poner como contactarte.</p>
    """
`

var eocodeInitialFiles = map[string]string{
	"site.py":                 eocodeInitialSitePy,
	"components/__init__.py":  eocodeInitialComponentsInit,
	"components/head.py":      eocodeInitialHeadPy,
	"components/body.py":      eocodeInitialBodyPy,
	"components/bottom.py":    eocodeInitialBottomPy,
	"views/__init__.py":       eocodeInitialViewsInit,
	"views/inicio.py":         eocodeInitialViewInicio,
	"views/sobre_mi.py":       eocodeInitialViewSobreMi,
	"views/proyectos.py":      eocodeInitialViewProyectos,
	"views/contacto.py":       eocodeInitialViewContacto,
	"rules/constraints.md":    eocodeInitialConstraints,
	"rules/index.md":          eocodeInitialRulesIndex,
	"rules/atomic-ssr.md":     eocodeInitialAtomicSSR,
	"rules/atomic-styles.md":  eocodeInitialAtomicStyles,
	"rules/atomic-content.md": eocodeInitialAtomicContent,
	"rules/atomic-scripts.md": eocodeInitialAtomicScripts,
	"rules/atomic-assets.md":  eocodeInitialAtomicAssets,
}
