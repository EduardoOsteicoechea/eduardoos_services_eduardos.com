This folder is a pointer. The eReport connector skill lives at:

- Site mirror: `/skills/eduardoos-ereport/` (deployed with the static frontend)
- Canonical connector: https://github.com/EduardoOsteicoechea/eduardoos-ereport-connector
- Live catalog: `GET https://eduardoos.com/api/v1/docs` → `payloadSchema.ereport.websiteRegistration` + `webConnector.features`
- Web embed (Mode W): `https://eduardoos.com/ereport/embed.js` → `EduardoOSEreport.mount({ token|apiKey, orgId, reportId, menuSelector, ui:{mode:'bug-icon-only'} })` — bug icon only; mint `POST /api/v1/ereport/embed-token` from the host backend (prefer) using the same `.ereport/.env` binding; origin must match hub `connectorHosts`
- eduardoos.com shell: Connector + header bug_report open the quick issue modal when `websiteRegistration` is set on cookie `/api/ereport/access`; gear opens the settings modal (section/subsection defaults)

Clone that repo as `.ereport/` in a consumer project. Set `EDUARDOOS_ORG_ID` / `EDUARDOOS_REPORT_ID` to the website-registration report. Do not point agents at S3 or flat `ownerSafe` report paths.
