This folder is a pointer. The eReport connector skill lives at:

- Site mirror: `/skills/eduardoos-ereport/` (deployed with the static frontend)
- Canonical connector: https://github.com/EduardoOsteicoechea/eduardoos-ereport-connector
- Live catalog: `GET https://eduardoos.com/api/v1/docs` → `payloadSchema.ereport.websiteRegistration` + `webConnector.features`
- Web embed: `https://eduardoos.com/ereport/embed.js` + theme → `EduardoOSEreport.mount({ orgId, reportId, menuSelector })` (prefer the hub **website registration** report; override `--eos-ereport-*` to match the host menu)
- eduardoos.com shell: Connector + header bug_report open the quick issue modal when `websiteRegistration` is set on cookie `/api/ereport/access`; gear opens the settings modal (section/subsection defaults)

Clone that repo as `.ereport/` in a consumer project. Set `EDUARDOOS_ORG_ID` / `EDUARDOOS_REPORT_ID` to the website-registration report. Do not point agents at S3 or flat `ownerSafe` report paths.
