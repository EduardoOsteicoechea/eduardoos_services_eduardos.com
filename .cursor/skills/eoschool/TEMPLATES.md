# Plantillas HTML

## Clase + quiz

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Clase — Tema</title>
  <link rel="stylesheet" href="../../../../web_assets/styles.css">
  <script src="../../../../web_assets/print.js" defer></script>
</head>
<body>
  <section class="page">
    <header class="sheet-header">
      <h1>Título</h1>
      <p class="meta">Ciclo N · Materia · Clase</p>
      <div class="student-line"><span>Nombre:</span><span>Fecha:</span></div>
    </header>
    <div class="lesson">
      <h2 class="section-title">Explicación</h2>
      <p class="lesson-text">…</p>
    </div>
  </section>
  <section class="page page--quiz">
    <header class="sheet-header sheet-header--compact">
      <h1>Preguntas</h1>
    </header>
    <div class="quiz-section">
      <h2 class="section-title">Preguntas</h2>
      <ol class="quiz quiz--grid3">
        <li class="question">
          <p><span class="q-num">1.</span> …</p>
          <div class="options">
            <div class="option"><span class="opt-key">A</span><span class="opt-text">…</span></div>
            <div class="option"><span class="opt-key">B</span><span class="opt-text">…</span></div>
            <div class="option"><span class="opt-key">C</span><span class="opt-text">…</span></div>
            <div class="option"><span class="opt-key">D</span><span class="opt-text">…</span></div>
          </div>
        </li>
      </ol>
    </div>
  </section>
</body>
</html>
```

## Checklist

```html
<section class="page page--checklist">
  <header class="sheet-header sheet-header--compact"><h1>Revisión</h1></header>
  <div class="checklist-section">
    <ul class="checklist checklist--grid2">
      <li class="checklist__item">
        <span class="checklist__box"></span>
        <span class="checklist__text">…</span>
      </li>
    </ul>
  </div>
</section>
```

Copia de referencia de assets: `.eoschool/web_assets/`.
