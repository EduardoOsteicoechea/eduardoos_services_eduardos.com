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
		"agentGuidance": "1) Require EDUARDOOS_API_KEY. 2) ALWAYS GET /api/v1/docs first. 3) Ordered eReport flow: access → orgs → orgs/{orgId}/reports → GET report → add only new open issues → POST. 4) API POST is additive for issues: cannot modify/delete existing items/sections; new items need non-empty incidencia + status reprobado. 5) Always print viewUrl after write. 6) There are no flat /reports/{ownerSafe}/{reportId} paths.",
		"routes": []map[string]any{
			{"method": http.MethodGet, "path": "/api/v1/docs", "auth": "none", "summary": "This catalog (public). Fetch first."},
			{"method": http.MethodGet, "path": "/api/v1/ereport/access", "auth": "api_key", "summary": "Step 1 — check eReport API access.", "requirements": "api + ereport (or admin). Returns allowed, email, ownerUserId, ownerSafe."},
			{"method": http.MethodGet, "path": "/api/v1/ereport/orgs", "auth": "api_key", "summary": "Step 2 — list owned organizations (hidden omitted)."},
			{"method": http.MethodGet, "path": "/api/v1/ereport/orgs/{orgId}/reports", "auth": "api_key", "summary": "Step 3 — list reports inside one org."},
			{"method": http.MethodGet, "path": "/api/v1/ereport/orgs/{orgId}/reports/{reportId}", "auth": "api_key", "summary": "Step 4a — read one org report (meta + payload + viewUrl)."},
			{"method": http.MethodPost, "path": "/api/v1/ereport/orgs/{orgId}/reports/{reportId}", "auth": "api_key", "summary": "Step 4b — additive write after confirmOverwrite:true.", "body": `{"confirmOverwrite":true,"tema":"optional","payload":{}}`},
			{"method": http.MethodGet, "path": "/api/v1/ereport/library", "auth": "api_key", "summary": "Alias for orgs (no legacy flat reports)."},
		},
		"payloadSchema": map[string]any{
			"description":     "Portable Issue Tracker / .ereport JSON stored as filesystem files under the report directory. Image refs are file ids/URLs, not new base64.",
			"writeSemantics":  "API-key POST is NOT a full client replace of issues. Server loads the stored report and merges: existing section/group/item ids cannot be modified or removed (400 if the client sends a changed copy of an existing item). Allowed: append new items; append new sections with new items. Every NEW item must have non-empty trimmed incidencia and status exactly \"reprobado\". Root meta fields may update. JWT web editor remains full-edit. confirmOverwrite:true still required. History snapshots are stored on the filesystem (max 50).",
			"postBody":        `{"confirmOverwrite":true,"tema":"optional string used as library title","payload":{}}`,
			"statusValues":    []string{"", "aprobado", "reprobado", "no_aplica"},
			"effectiveStatus": "If validationCriteria is empty or any criteriaStatus[label] is unset: use item.status. Else if every value is no_aplica → no_aplica; else if any is reprobado → reprobado; else if ≥1 aprobado and every non-aprobado is no_aplica → aprobado; else item.status.",
			"reportCodeRule":  "reportNumber is the Report Code. Dates fechaIncidencia/fechaSolucion round-trip as YYYY-MM-DD or YYYY-MM-DDTHH:mm.",
			"viewUrlTemplate": "{BASE}/ereport/workspace?user={ownerSafe}&org={orgId}&report={reportId} — user= is display-only and is ignored for authorization and filesystem paths.",
			"rootFields": map[string]string{
				"orgName":            "Organization display name",
				"reportName":         "Report name / tema",
				"reportDate":         "Report date",
				"reportNumber":       "Report code",
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
