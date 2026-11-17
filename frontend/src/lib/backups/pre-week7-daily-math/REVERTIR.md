# Revertir: Matemática diaria desde semana 7

Copia de seguridad del plan 40 semanas **antes** de:

1. Matemática lun–jue desde la semana 7.
2. Viernes solo exposición (sin saber nuevo).
3. Redistribución de `mat:2`…`mat:17` desde la semana 7.

## Restaurar

Desde la raíz del repo `eduardoos.com`:

```bash
cp frontend/src/lib/backups/pre-week7-daily-math/eoschool-mppe-40week-curriculum.json frontend/src/lib/eoschool-mppe-40week-curriculum.json
cp frontend/src/lib/backups/pre-week7-daily-math/build-40week-mppe-curriculum.mjs frontend/scripts/build-40week-mppe-curriculum.mjs
cp frontend/src/lib/backups/pre-week7-daily-math/build-mppe-day-sheets.mjs frontend/scripts/build-mppe-day-sheets.mjs
node frontend/scripts/build-40week-mppe-curriculum.mjs
node frontend/scripts/build-mppe-day-sheets.mjs
```

En PowerShell:

```powershell
Copy-Item frontend\src\lib\backups\pre-week7-daily-math\eoschool-mppe-40week-curriculum.json frontend\src\lib\eoschool-mppe-40week-curriculum.json -Force
Copy-Item frontend\src\lib\backups\pre-week7-daily-math\build-40week-mppe-curriculum.mjs frontend\scripts\build-40week-mppe-curriculum.mjs -Force
Copy-Item frontend\src\lib\backups\pre-week7-daily-math\build-mppe-day-sheets.mjs frontend\scripts\build-mppe-day-sheets.mjs -Force
node frontend\scripts\build-40week-mppe-curriculum.mjs
node frontend\scripts\build-mppe-day-sheets.mjs
```

Tras restaurar el JSON y los scripts, regenerar las fichas con `build-mppe-day-sheets.mjs` (si restauras el JSON ya generado, basta con ese script; si restauras solo el builder, corre ambos).
