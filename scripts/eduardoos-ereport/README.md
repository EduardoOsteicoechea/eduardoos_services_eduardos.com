This folder is a pointer. The eReport connector skill lives at:

- Site mirror: `/skills/eduardoos-ereport/` (deployed with the static frontend)
- Canonical connector: https://github.com/EduardoOsteicoechea/eduardoos-ereport-connector
- Web embed loader: `https://eduardoos.com/ereport/embed.js` + theme `https://eduardoos.com/ereport/embed-theme.css` → `EduardoOSEreport.mount({ apiKey, menuSelector })` (override `--eos-ereport-*` to match the host menu)

Clone that repo as `.ereport/` in a consumer project. Do not point agents at S3 or flat `ownerSafe` report paths.
