# Currículo MPPE Homescool — integración E2E

## Flujo

1. Usuario con entitlement Homescool abre `/eoschool/requirements/curriculum` (menú **Currículo 40 sem**).
2. Astro sirve plan `MPPE_40WEEK_CURRICULUM` (40×5 = 200 días).
3. `initCurriculumProgress` → `GET /api/eoschool/curriculum/progress?studentKey=elias-osteicoechea`.
   - **200**: banner “Progreso de Elías…” + checks desde Mongo.
   - **401/403**: banner invitado (sin modal).
   - **404**: banner “API aún no disponible” (sin modal) — indica API antigua en el VPS.
4. Clic en tarjeta de día → modal → manifiesto `plan-classes-manifest.json` → JSON estático `plan-d{N}/*.eoschool.json`.
5. `POST /api/homescool/preview` (cookie + CSRF) → PDF; 401/403 abren modal de error, **no** cierran sesión.
6. Checkbox área → `PATCH /api/eoschool/curriculum/progress/sections` `{ studentKey, dayId, sectionId, completed }` → `sectionsDone` como `d{N}:bib|ide|len|mat|cie`.

## Estudiante por defecto

| Campo | Valor |
| --- | --- |
| `student_key` | `elias-osteicoechea` |
| Nombre | Elías Osteicoechea |
| Edad | 8 |
| Grado | 3er grado |

## Verificación prod

```bash
curl -s -o /dev/null -w "%{http_code}" \
  "https://eduardoos.com/api/eoschool/curriculum/progress?studentKey=elias-osteicoechea"
# Sin cookie: 401 (ruta viva). 404 = API sin rutas → redeploy backend.
```

## Path-scoped deploy

| Cambio | CI |
| --- | --- |
| Solo `frontend/**` | Astro + rsync html — **no** reinicia API |
| `backend/**` (código) | `go test` + binario + restart API |
| Solo Calvin pack | ignorado (congelado en VPS) |

Tras añadir rutas Go, hace falta un push con `backend/**` o `workflow_dispatch` manual.
