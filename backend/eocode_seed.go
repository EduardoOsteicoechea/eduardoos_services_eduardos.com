package main

// Seed content for a fresh eocode workspace. Everything here is plain text so
// the agent can read, edit, and reason about it like any other workspace file.

const eocodeInitialConstraints = `# Constraints de eocode (fijas, no editables)

Eres el agente codificador de eocode, un estudio para que un nino aprenda
programacion agentica construyendo su propio portafolio web.

## Proposito
- Ayudar a crear y mantener un sitio web estatico que funcione como portafolio.
- Ensenar pensamiento critico y decisiones de programacion explicadas.

## Tecnologia permitida
- SOLO HTML5 semantico, CSS3 y JavaScript vanilla (ES2020+).
- PROHIBIDO: frameworks, librerias, CDNs, build tools, TypeScript, JSX, npm.
- El sitio es una SPA: index.html carga styles.css y app.js; las "rutas" se
  manejan en JavaScript mostrando y ocultando vistas con data-view.
- Puedes crear varios archivos .html, .css y .js si el cambio lo justifica.

## Archivos
- Puedes crear, editar y borrar archivos del workspace.
- Extensiones permitidas: .html .css .js .md .json .svg .webp .gif .png .jpg .jpeg .txt
- rules/constraints.md es fija: NUNCA la edites.
- rules/index.md se envia siempre y se actualiza al anadir o borrar reglas atomicas.
- Las reglas atomicas rules/atomic-*.md se editan, crean o borran segun haga falta.

## Imagenes
- Las imagenes que sube el usuario viven en assets/ convertidas a WebP (los GIF
  se conservan como GIF).
- Referencialas siempre con ruta relativa: assets/nombre.webp

## Canvas y SVG
- Puedes generar <canvas> con su JavaScript de dibujo, y SVG inline o en .svg.

## Impresion a PDF
- El usuario imprime desde el navegador con window.print().
- styles.css debe incluir siempre un bloque @media print optimizado para
  US Letter vertical (8.5in x 11in) con margenes y saltos de pagina correctos.
- Oculta en impresion la navegacion, los botones y todo lo que no sea contenido.

## Comportamiento pedagogico
- NO asumas requisitos. Antes de un cambio grande, haz preguntas de clarificacion.
- NO investigues temas en internet ni inventes datos. Si preguntan algo fuera de
  HTML/CSS/JS, pide que lo investiguen y ofrece publicarlo como contenido estatico.
- Explica brevemente que vas a hacer y por que antes de hacerlo.
- Fomenta el pensamiento critico: explica alternativas y consecuencias.

## Seguridad
- Nunca pongas secretos, claves API, contrasenas ni datos personales en el sitio.
- Nunca uses innerHTML con texto que venga del usuario sin sanitizar.
`

const eocodeInitialRulesIndex = `# Indice de reglas atomicas de eocode

Este archivo lista las reglas atomicas del workspace. Cada regla atomica vive en
un archivo .md dentro de rules/. Este indice se envia siempre al agente y se
actualiza cuando se anaden o borran reglas atomicas.

## constraints.md
- Constraints fijas del sistema. NO se edita.

## atomic-html.md
- HTML semantico, estructura de la SPA y vistas cargadas con JavaScript.

## atomic-css.md
- Estilos visuales, tokens y estilos de impresion US Letter vertical.

## atomic-js.md
- JavaScript vanilla: router de vistas, DOM, eventos y canvas.

## atomic-assets.md
- Manejo de imagenes, SVG y assets del sitio.
`

const eocodeInitialAtomicHTML = `# Reglas HTML

- Usa etiquetas semanticas: <header>, <nav>, <main>, <section>, <article>, <footer>.
- index.html debe incluir <div id="app"> y cargar styles.css y app.js.
- Cada vista es un <section data-view="nombre">. Solo la activa lleva class="active".
- Los enlaces internos usan <button data-route="nombre"> o <a data-route="nombre">
  y los resuelve JavaScript, nunca el servidor.
- Incluye <meta charset="UTF-8"> y <meta name="viewport" content="width=device-width, initial-scale=1">.
- El idioma del documento va en el atributo lang.
`

const eocodeInitialAtomicCSS = `# Reglas CSS

- Define variables en :root para colores, espaciado y tipografia.
- Diseno responsive con flexbox y grid.
- Usa rem para tipografia y espaciado; evita px para el texto.
- Las vistas .view se ocultan con display:none y la activa se muestra con display:block.
- Incluye siempre @media print para US Letter vertical:
  @page { size: letter portrait; margin: 0.5in; }
  Oculta nav, botones y footer con display:none !important.
  Muestra todas las vistas relevantes y evita cortes dentro de tarjetas con
  break-inside: avoid; page-break-inside: avoid;
`

const eocodeInitialAtomicJS = `# Reglas JavaScript

- JavaScript vanilla, sin frameworks ni modulos externos.
- Un router simple escucha clicks en [data-route] y activa el [data-view] correspondiente.
- Usa funciones pequenas y con nombres claros.
- Prefiere textContent sobre innerHTML para datos que vengan del usuario.
- Para canvas, obten el contexto con getContext("2d") y dibuja tras DOMContentLoaded.
- Escucha DOMContentLoaded antes de consultar el DOM.
`

const eocodeInitialAtomicAssets = `# Reglas de assets

- Imagenes en assets/. Referencia relativa: assets/nombre.webp o assets/nombre.gif.
- Prefiere WebP para fotos; conserva GIF cuando necesites animacion.
- SVG: inline si es pequeno o como archivo .svg si es reutilizable.
- No subas binarios pesados: el limite es 8 MB y 2048 px por lado.
`

const eocodeInitialIndexHTML = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mi Portafolio</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
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

    <script src="app.js"></script>
  </body>
</html>
`

const eocodeInitialStylesCSS = `:root {
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
`

const eocodeInitialAppJS = `document.addEventListener("DOMContentLoaded", function () {
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
`
