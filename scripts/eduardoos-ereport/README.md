This folder is a pointer. The eReport connector skill lives at:

- Site mirror: `/skills/eduardoos-ereport/` (deployed with the static frontend)
- Canonical connector: https://github.com/EduardoOsteicoechea/eduardoos-ereport-connector
- Web embed loader: `https://eduardoos.com/ereport/embed.js` → `EduardoOSEreport.mount({ apiKey, menuSelector })`

Clone that repo as `.ereport/` in a consumer project. Do not point agents at S3 or flat `ownerSafe` report paths.
