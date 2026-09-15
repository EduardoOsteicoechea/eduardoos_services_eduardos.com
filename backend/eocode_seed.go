package main

// Seed content for a fresh eocode workspace. The site is an SSR engine written
// in Python: site.py composes head + body + bottom component generators. The
// agent edits only Python files, never HTML/CSS/JS directly.

const eocodeInitialConstraints = `# Constraints de eocode (fijas, no editables)

Eres el agente codificador de eocode, un estudio para que un nino aprenda
programacion agentica construyendo su propio portafolio web.

## Arquitectura fija (motor SSR en Python) - NO LA CAMBIES
El sitio no tiene HTML, CSS ni JS editables por separado. Es un motor SSR:
- site.py importa y concatena los generadores:
    render_head() + render_body() + render_bottom()
- components/head.py -> render_head(): devuelve <!DOCTYPE html><html><head>...
  Es el UNICO lugar donde vive el CSS, dentro de <style>.
- components/body.py -> render_body(): devuelve <body> con el contenido.
- components/bottom.py -> render_bottom(): devuelve <script>...</script></body></html>
  Es el UNICO lugar donde vive el JavaScript.
El backend ejecuta site.py y sirve su salida (stdout) como el HTML del sitio.

## Archivos
- SOLO se trabaja con archivos .py (ademas de rules/*.md, .json, .svg y assets/).
- NO crees ni edites .html, .css ni .js.
- Puedes crear nuevos componentes .py, pero site.py debe seguir concatenando
  head + body + bottom y debes documentar el nuevo generador en rules/index.md.
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
- El sitio es una SPA: el HTML trae las vistas como <section data-view="..."> y
  el JS (en bottom.py) muestra y oculta la vista activa.
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
- Punto de entrada del SSR. Importa y concatena:
  render_head() + render_body() + render_bottom().
- El backend ejecuta site.py y devuelve su salida como HTML.

## components/head.py
- render_head(): devuelve <!DOCTYPE html><html><head>...</head>.
- UNICO lugar donde vive el CSS (dentro de <style>).

## components/body.py
- render_body(): devuelve <body> con el contenido y las vistas de la SPA.

## components/bottom.py
- render_bottom(): devuelve <script>...</script></body></html>.
- UNICO lugar donde vive el JavaScript.

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
- site.py es el punto de entrada y solo concatena head + body + bottom.
- Cada componente define una funcion que retorna un string de HTML.
- Devuelve SIEMPRE strings completos y validos; nada de escribir archivos.
- Para anadir contenido nuevo, crea un componente .py y documentalo en
  rules/index.md, luego impórtalo y concatenalo donde corresponda.
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

const eocodeInitialAtomicContent = `# Reglas de contenido (solo en components/body.py)

- render_body() devuelve <body> con el contenido de la SPA.
- Usa etiquetas semanticas: <header>, <nav>, <main>, <section>, <article>, <footer>.
- Cada vista es un <section data-view="nombre">; solo la activa lleva class="active".
- Los enlaces internos usan <button data-route="nombre"> y los resuelve el JS.
- Referencia imagenes como assets/nombre.webp.
- Para datos dinamicos usa formato de strings de Python (f-strings) con cuidado.
`

const eocodeInitialAtomicScripts = `# Reglas JavaScript (solo en components/bottom.py)

- Todo el JavaScript vive en components/bottom.py dentro de un <script>.
- render_bottom() devuelve <script>...</script></body></html>.
- Vanilla JS (ES2020+), sin frameworks ni imports externos.
- Un router simple escucha clicks en [data-route] y activa el [data-view] correcto.
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

This module is the fixed entry: it imports the HTML component generators and
returns the complete document as their concatenation. Do not change the
architecture; add new components under components/ and document them in
rules/index.md.
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

const eocodeInitialBodyPy = `"""Body generator. It returns the page content and SPA views."""


def render_body():
    return """
<body>
  <header class="site-header">
    <h1 class="site-title">Mi Portafolio</h1>
    <nav class="site-nav" aria-label="Principal">
      <button type="button" data-route="inicio" class="active">Inicio</button>
      <button type="button" data-route="sobre-mi">Sobre mi</button>
      <button type="button" data-route="proyectos">Proyectos</button>
      <button type="button" data-route="contacto">Contacto</button>
    </nav>
  </header>

  <main id="app">
    <section data-view="inicio" class="view active">
      <h2>Bienvenido</h2>
      <p>Este es mi portafolio. Pidele al agente que lo construya contigo.</p>
    </section>

    <section data-view="sobre-mi" class="view">
      <h2>Sobre mi</h2>
      <p>Aqui puedes contar quien eres y que te gusta.</p>
    </section>

    <section data-view="proyectos" class="view">
      <h2>Proyectos</h2>
      <p>Aqui van tus proyectos con imagenes y descripciones.</p>
    </section>

    <section data-view="contacto" class="view">
      <h2>Contacto</h2>
      <p>Aqui puedes poner como contactarte.</p>
    </section>
  </main>

  <footer class="site-footer">
    <p>Hecho con eocode</p>
  </footer>
"""
`

const eocodeInitialBottomPy = `"""Bottom generator. This is the only place where JavaScript lives."""

SCRIPTS = """
document.addEventListener("DOMContentLoaded", function () {
  var buttons = document.querySelectorAll("[data-route]");
  var views = document.querySelectorAll("[data-view]");

  function showView(name) {
    views.forEach(function (view) {
      view.classList.toggle("active", view.getAttribute("data-view") === name);
    });
    buttons.forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-route") === name);
    });
  }

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      showView(button.getAttribute("data-route"));
    });
  });

  showView("inicio");
});
"""


def render_bottom():
    return "<script>" + SCRIPTS + "</script></body></html>"
`

var eocodeInitialFiles = map[string]string{
	"site.py":                 eocodeInitialSitePy,
	"components/__init__.py":  eocodeInitialComponentsInit,
	"components/head.py":      eocodeInitialHeadPy,
	"components/body.py":      eocodeInitialBodyPy,
	"components/bottom.py":    eocodeInitialBottomPy,
	"rules/constraints.md":    eocodeInitialConstraints,
	"rules/index.md":          eocodeInitialRulesIndex,
	"rules/atomic-ssr.md":     eocodeInitialAtomicSSR,
	"rules/atomic-styles.md":  eocodeInitialAtomicStyles,
	"rules/atomic-content.md": eocodeInitialAtomicContent,
	"rules/atomic-scripts.md": eocodeInitialAtomicScripts,
	"rules/atomic-assets.md":  eocodeInitialAtomicAssets,
}
