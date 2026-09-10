package main

import "net/http"

func (a *App) v1DocsHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"version":  "1",
		"title":    "Eduardo OS external API",
		"baseHint": "https://eduardoos.com (or your deployed origin); all paths are absolute from that host",
		"auth": map[string]any{
			"header":    "Authorization",
			"scheme":    "Bearer",
			"keyPrefix": apiKeyPrefix,
			"notes":     "Create keys only in the signed-in UI after subscribing to api. Secret shown once. Never create/revoke keys from external API clients.",
		},
		"rateLimit": map[string]any{
			"requestsPerMinute": apiKeyRatePerMin,
			"onExceed":          "HTTP 429 with Retry-After",
		},
		"entitlements": map[string]any{
			"apiProduct": productAPI,
			"notes":      "Non-admin: active api entitlement plus ereport. Writes only for reports owned by the key owner. Storage is VPS filesystem under media/ereport/<ownerUserId>/ — never S3.",
		},
		"ownerSafe": "Display metadata only (lowercase email with @ replaced by _at_). Filesystem ownership uses immutable ownerUserId from the API key owner.",
		"keyPolicy": "API keys are created, listed, and revoked only in the Eduardo OS UI. Key lifecycle is not part of the external API.",
		"skill":     "https://github.com/EduardoOsteicoechea/eduardoos-ereport-connector — clone as .ereport/ sidecar. Mirror: https://eduardoos.com/skills/eduardoos-ereport/",
		"agentGuidance": "1) Require EDUARDOOS_API_KEY. 2) ALWAYS GET /api/v1/docs first. 3) Ordered eReport flow: access → orgs → orgs/{orgId}/reports → GET report → write → POST. 4) POST mode defaults to append (safe): cannot modify/delete existing ids; new items need non-empty incidencia + status reprobado. 5) For full seed/bootstrap use mode:\"replace\" with confirmOverwrite:true (owned reports only; snapshots history). 6) Always print viewUrl after write. 7) There are no flat /reports/{ownerSafe}/{reportId} paths. 8) List only returns reports whose payload meta is loadable; GET/POST for a listed id must not 404 for stale ownerUserId in meta (path ownership heals it). True missing storage returns error report_storage_missing with orgId/reportId/reason. 9) Execution/analytics logging lives in the .ereport connector (local files under .ereport/execution/), not on this API.",
		"routes": []map[string]any{
			{"method": http.MethodGet, "path": "/api/v1/docs", "auth": "none", "summary": "This catalog (public). Fetch first."},
			{"method": http.MethodGet, "path": "/api/v1/ereport/access", "auth": "api_key", "summary": "Step 1 — check eReport API access.", "requirements": "api + ereport (or admin). Returns allowed, email, ownerUserId, ownerSafe."},
			{"method": http.MethodGet, "path": "/api/v1/ereport/orgs", "auth": "api_key", "summary": "Step 2 — list owned organizations (hidden omitted)."},
			{"method": http.MethodGet, "path": "/api/v1/ereport/orgs/{orgId}/reports", "auth": "api_key", "summary": "Step 3 — list loadable reports inside one org (orphans without readable meta are omitted and pruned from library.json)."},
			{"method": http.MethodGet, "path": "/api/v1/ereport/orgs/{orgId}/reports/{reportId}", "auth": "api_key", "summary": "Step 4a — read one org report (meta + payload + viewUrl). Heals stale meta.ownerUserId when files live under this key owner's tree."},
			{"method": http.MethodPost, "path": "/api/v1/ereport/orgs/{orgId}/reports/{reportId}", "auth": "api_key", "summary": "Step 4b — write after confirmOverwrite:true. mode append (default) or replace.", "body": `{"confirmOverwrite":true,"mode":"append|replace","tema":"optional","payload":{}}`},
			{"method": http.MethodGet, "path": "/api/v1/ereport/library", "auth": "api_key", "summary": "Alias for orgs (no legacy flat reports)."},
		},
		"errors": map[string]any{
			"report_storage_missing":         "GET/POST when meta/payload cannot be read under media/ereport/<owner>/orgs/{orgId}/reports/{reportId}. Body includes orgId, reportId, reason.",
			"not_found":                      "Unknown org or generic missing resource.",
			"append_existing_item_modified":  "mode append tried to change an existing section/group/item id.",
			"append_invalid_new_item_status": "mode append new item missing incidencia or status was not reprobado.",
			"replace_confirm_required":       "mode replace without confirmOverwrite:true.",
		},
		"payloadSchema": map[string]any{
			"description": "Portable Issue Tracker / .ereport JSON stored as filesystem files under the report directory. Image refs are file ids/URLs, not new base64.",
			"writeSemantics": "API-key POST supports mode append (default) and mode replace. Both require confirmOverwrite:true. append: server merges; existing section/group/item ids are immutable (400 append_existing_item_modified); new items need non-empty incidencia and status exactly \"reprobado\" (400 append_invalid_new_item_status); root meta fields may update. replace: full payload replace for that owned report (like JWT editor), including removing stub template items; statuses may be aprobado|reprobado|no_aplica|empty; history snapshot before write (max 50). JWT web editor remains full-edit. Host execution/analytics logs are NOT stored here — use the eduardoos-ereport-connector local .ereport/execution/ ledger, then POST issues with append|replace.",
			"postBody": `{"confirmOverwrite":true,"mode":"append","tema":"optional string used as library title","payload":{}}`,
			"postBodyReplaceExample": `{"confirmOverwrite":true,"mode":"replace","tema":"Model Checker 1.1","payload":{"appTitle":"Issue Tracker","orgName":"…","reportName":"…","reportDate":"YYYY-MM-DD","reportNumber":"…","theme":"dark","validationCriteria":[],"sections":[]}}`,
			"modes": map[string]any{
				"append":  "Default. Additive merge only. Conservative for agents.",
				"replace": "Full bootstrap/sync. Requires confirmOverwrite:true. Owned reports only.",
			},
			"statusValues":        []string{"", "aprobado", "reprobado", "no_aplica"},
			"appendNewItemStatus": "reprobado only",
			"replaceItemStatus":   "aprobado|reprobado|no_aplica|empty",
			"effectiveStatus":     "If validationCriteria is empty or any criteriaStatus[label] is unset: use item.status. Else if every value is no_aplica → no_aplica; else if any is reprobado → reprobado; else if ≥1 aprobado and every non-aprobado is no_aplica → aprobado; else item.status.",
			"reportCodeRule":      "reportNumber is the Report Code. Dates fechaIncidencia/fechaSolucion round-trip as YYYY-MM-DD or YYYY-MM-DDTHH:mm.",
			"viewUrlTemplate":     "{BASE}/ereport/workspace?user={ownerSafe}&org={orgId}&report={reportId} — user= is display-only and is ignored for authorization and filesystem paths.",
			"rootFields": map[string]string{
				"appTitle":           "App title (default Issue Tracker)",
				"orgName":            "Organization display name",
				"reportName":         "Report name / tema",
				"reportDate":         "Report date",
				"reportNumber":       "Report code",
				"theme":              "UI theme hint (e.g. dark|light)",
				"collapse":           "Collapse state blob (opaque JSON)",
				"validationCriteria": "string[] of criteria labels",
				"sections":           "sections[].groups[].items[]",
			},
			"itemFields": map[string]string{
				"id":               "stable item id",
				"status":           "aprobado|reprobado|no_aplica|empty",
				"incidencia":       "issue text",
				"fechaIncidencia":  "YYYY-MM-DD or datetime-local",
				"fechaSolucion":    "YYYY-MM-DD or datetime-local",
				"criteriaStatus":   "map of label → status",
				"imagesIncidencia": "{id,mime,name,url} file refs (legacy dataUrl left untouched on import)",
			},
		},
	})
}
