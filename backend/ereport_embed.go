package main

import (
	"context"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	embedTokenAudience = "ereport-embed"
	embedTokenTTL      = 15 * time.Minute
	embedTokenPrefix   = "eos_embed_"
)

type embedTokenClaims struct {
	OrgID      string `json:"orgId"`
	ReportID   string `json:"reportId"`
	OriginHost string `json:"originHost"`
	jwt.RegisteredClaims
}

type embedAuthContextKey string

const (
	embedOrgContextKey    embedAuthContextKey = "embed-org"
	embedReportContextKey embedAuthContextKey = "embed-report"
	embedHostContextKey   embedAuthContextKey = "embed-host"
	embedViaContextKey    embedAuthContextKey = "embed-via" // "api_key" | "embed_token"
)

// normalizeEmbedOriginHost turns an absolute origin URL or host tag into the
// same host[:port] form used by connectorHosts.
func normalizeEmbedOriginHost(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if strings.Contains(raw, "://") {
		if parsed, err := url.Parse(raw); err == nil && parsed.Host != "" {
			return normalizeConnectorHost(parsed.Host)
		}
	}
	return normalizeConnectorHost(raw)
}

func connectorHostsAllowOrigin(hosts []string, requestHost string) bool {
	req := normalizeConnectorHost(requestHost)
	if req == "" {
		return false
	}
	for _, h := range hosts {
		if connectorHostMatches(h, req) {
			return true
		}
	}
	for _, h := range hosts {
		if connectorHostMatchesLoose(h, req) {
			return true
		}
	}
	return false
}

func parseIssueTextServer(raw string) (nombre, incidencia string) {
	text := strings.TrimSpace(raw)
	if text == "" {
		return "", ""
	}
	i := strings.Index(text, ".")
	if i < 0 {
		return text, text
	}
	nombre = strings.TrimSpace(text[:i])
	incidencia = strings.TrimSpace(text[i+1:])
	if nombre == "" {
		nombre = text
	}
	if incidencia == "" {
		incidencia = text
	}
	return nombre, incidencia
}

func (a *App) signEmbedToken(userID, orgID, reportID, originHost string) (string, time.Time, error) {
	now := time.Now().UTC()
	exp := now.Add(embedTokenTTL)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, embedTokenClaims{
		OrgID:      orgID,
		ReportID:   reportID,
		OriginHost: originHost,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    a.cfg.JWTIssuer,
			Subject:   userID,
			Audience:  jwt.ClaimStrings{embedTokenAudience},
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	})
	raw, err := token.SignedString([]byte(a.cfg.JWTSecret))
	if err != nil {
		return "", time.Time{}, err
	}
	return embedTokenPrefix + raw, exp, nil
}

func (a *App) parseEmbedToken(raw string) (*embedTokenClaims, error) {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, embedTokenPrefix)
	token, err := jwt.ParseWithClaims(raw, &embedTokenClaims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(a.cfg.JWTSecret), nil
	}, jwt.WithIssuer(a.cfg.JWTIssuer), jwt.WithAudience(embedTokenAudience))
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*embedTokenClaims)
	if !ok || !token.Valid || claims.Subject == "" || claims.OrgID == "" || claims.ReportID == "" || claims.OriginHost == "" {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
}

// withEreportEmbedAuth accepts a long-lived API key (eos_live_…) or a short-lived
// embed token (eos_embed_…). Embed tokens are scoped to org+report+originHost.
func (a *App) withEreportEmbedAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		header := strings.TrimSpace(r.Header.Get("Authorization"))
		if !strings.HasPrefix(strings.ToLower(header), "bearer ") {
			a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
			return
		}
		secret := strings.TrimSpace(header[7:])
		if strings.HasPrefix(secret, apiKeyPrefix) {
			a.withAPIKey(productEreport, func(w http.ResponseWriter, r *http.Request) {
				ctx := context.WithValue(r.Context(), embedViaContextKey, "api_key")
				next(w, r.WithContext(ctx))
			})(w, r)
			return
		}
		if strings.HasPrefix(secret, embedTokenPrefix) || (!strings.HasPrefix(secret, apiKeyPrefix) && secret != "") {
			claims, err := a.parseEmbedToken(secret)
			if err != nil {
				a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
				return
			}
			user, err := a.store.UserByID(r.Context(), claims.Subject)
			if err != nil || user.Status != statusVerified {
				a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
				return
			}
			ok, unavailable := a.hasProductEntitlement(r, user, productAPI)
			if unavailable || !ok {
				a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
				return
			}
			ok, unavailable = a.hasProductEntitlement(r, user, productEreport)
			if unavailable || !ok {
				a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
				return
			}
			ctx := context.WithValue(r.Context(), apiUserContextKey, user)
			ctx = context.WithValue(ctx, embedOrgContextKey, claims.OrgID)
			ctx = context.WithValue(ctx, embedReportContextKey, claims.ReportID)
			ctx = context.WithValue(ctx, embedHostContextKey, claims.OriginHost)
			ctx = context.WithValue(ctx, embedViaContextKey, "embed_token")
			next(w, r.WithContext(ctx))
			return
		}
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
	}
}

func embedViaFrom(r *http.Request) string {
	v, _ := r.Context().Value(embedViaContextKey).(string)
	return v
}

func embedHostOriginFromRequest(r *http.Request) string {
	if h := strings.TrimSpace(r.Header.Get("X-Ereport-Host-Origin")); h != "" {
		return h
	}
	return strings.TrimSpace(r.URL.Query().Get("hostOrigin"))
}

// enforceEmbedTokenReportAccess restricts embed_token callers to the bound
// website_registration report and an allowed connector host. API-key callers
// (via withEreportEmbedAuth) skip this — they keep full owner-scoped v1 access.
func (a *App) enforceEmbedTokenReportAccess(w http.ResponseWriter, r *http.Request, orgID, reportID string) bool {
	if embedViaFrom(r) != "embed_token" {
		return true
	}
	user := apiUserFrom(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return false
	}
	boundOrg, _ := r.Context().Value(embedOrgContextKey).(string)
	boundRep, _ := r.Context().Value(embedReportContextKey).(string)
	if orgID != boundOrg || reportID != boundRep {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return false
	}
	meta, _, err := a.loadOwnedWebsiteRegistration(user, orgID, reportID)
	if err != nil {
		if apiErr := asAPIWriteErr(err); apiErr.Code == "forbidden" {
			writeJSON(w, http.StatusForbidden, map[string]any{
				"error":      "forbidden",
				"message":    "Use a website registration report for the site connector.",
				"request_id": requestIDFrom(r, w),
			})
			return false
		}
		a.writeEreportNotFound(w, r, orgID, reportID, ereportMissingReason(err))
		return false
	}
	if _, ok := a.requireEmbedHostAllowed(w, r, meta, embedHostOriginFromRequest(r)); !ok {
		return false
	}
	return true
}

// withEreportV1OrEmbed accepts eos_live_… or eos_embed_…. Embed tokens must
// target the bound website_registration org/report and pass host origin.
func (a *App) withEreportV1OrEmbed(next http.HandlerFunc) http.HandlerFunc {
	return a.withEreportEmbedAuth(func(w http.ResponseWriter, r *http.Request) {
		orgID := strings.TrimSpace(r.PathValue("orgId"))
		reportID := strings.TrimSpace(r.PathValue("reportId"))
		if orgID != "" && reportID != "" {
			if !a.enforceEmbedTokenReportAccess(w, r, orgID, reportID) {
				return
			}
		}
		next(w, r)
	})
}

func (a *App) loadOwnedWebsiteRegistration(user *User, orgID, reportID string) (ereportMeta, map[string]any, error) {
	meta, payload, err := a.ereport.loadReport(user.ID, orgID, reportID)
	if err != nil {
		return ereportMeta{}, nil, err
	}
	if normalizeEreportPurpose(meta.Purpose) != ereportPurposeWebsite {
		return ereportMeta{}, nil, apiWriteErr("forbidden", "report is not a website registration")
	}
	return meta, payload, nil
}

func resolveEmbedSectionGroup(meta ereportMeta, payload map[string]any) (sectionID, groupID string, err error) {
	sectionID = strings.TrimSpace(meta.ConnectorSectionID)
	groupID = strings.TrimSpace(meta.ConnectorGroupID)
	if sectionID != "" && groupID != "" {
		if _, _, e := findSection(payload, sectionID); e == nil {
			if sec, _, e2 := findSection(payload, sectionID); e2 == nil {
				if _, _, e3 := findGroup(sec, groupID); e3 == nil {
					return sectionID, groupID, nil
				}
			}
		}
	}
	secs := asMapSlice(payload["sections"])
	if len(secs) == 0 {
		return "", "", apiWriteErr("bad_targets", "report has no sections")
	}
	sec := secs[0]
	sectionID = asString(sec["id"])
	groups := asMapSlice(sec["groups"])
	if len(groups) == 0 {
		return "", "", apiWriteErr("bad_targets", "report has no subsections")
	}
	groupID = asString(groups[0]["id"])
	if sectionID == "" || groupID == "" {
		return "", "", apiWriteErr("bad_targets", "connector section/subsection missing")
	}
	return sectionID, groupID, nil
}

func (a *App) requireEmbedHostAllowed(w http.ResponseWriter, r *http.Request, meta ereportMeta, hostOrigin string) (host string, ok bool) {
	host = normalizeEmbedOriginHost(hostOrigin)
	if host == "" {
		writeJSON(w, http.StatusForbidden, map[string]any{
			"error":      "forbidden",
			"message":    "Host origin is required for the site connector.",
			"request_id": requestIDFrom(r, w),
		})
		return "", false
	}
	hosts := normalizeConnectorHosts(meta.ConnectorHosts)
	if len(hosts) == 0 {
		writeJSON(w, http.StatusForbidden, map[string]any{
			"error":      "forbidden",
			"message":    "This website registration has no connector hosts. Set them in the eReport hub (Assign to site).",
			"request_id": requestIDFrom(r, w),
		})
		return "", false
	}
	if !connectorHostsAllowOrigin(hosts, host) {
		writeJSON(w, http.StatusForbidden, map[string]any{
			"error":      "forbidden",
			"message":    "This site origin is not authorized for the website registration report.",
			"request_id": requestIDFrom(r, w),
		})
		return "", false
	}
	if via := embedViaFrom(r); via == "embed_token" {
		bound, _ := r.Context().Value(embedHostContextKey).(string)
		if bound != "" && normalizeConnectorHost(bound) != host {
			writeJSON(w, http.StatusForbidden, map[string]any{
				"error":      "forbidden",
				"message":    "Embed token origin does not match this site.",
				"request_id": requestIDFrom(r, w),
			})
			return "", false
		}
	}
	return host, true
}

// POST /api/v1/ereport/embed-token — mint a short-lived token scoped to org/report/origin.
func (a *App) ereportV1EmbedTokenHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	var body struct {
		OrgID    string `json:"orgId"`
		ReportID string `json:"reportId"`
		Origin   string `json:"origin"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	orgID := strings.TrimSpace(body.OrgID)
	reportID := strings.TrimSpace(body.ReportID)
	origin := strings.TrimSpace(body.Origin)
	if orgID == "" || reportID == "" || origin == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	meta, payload, err := a.loadOwnedWebsiteRegistration(user, orgID, reportID)
	if err != nil {
		if apiErr := asAPIWriteErr(err); apiErr.Code == "forbidden" {
			writeJSON(w, http.StatusForbidden, map[string]any{
				"error":      "forbidden",
				"message":    "Use a website registration report for the site connector.",
				"request_id": requestIDFrom(r, w),
			})
			return
		}
		a.writeEreportNotFound(w, r, orgID, reportID, ereportMissingReason(err))
		return
	}
	host, ok := a.requireEmbedHostAllowed(w, r, meta, origin)
	if !ok {
		return
	}
	sectionID, groupID, sgErr := resolveEmbedSectionGroup(meta, payload)
	if sgErr != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":      "bad_targets",
			"message":    "Connector section or subsection is missing on this report.",
			"request_id": requestIDFrom(r, w),
		})
		return
	}
	token, exp, signErr := a.signEmbedToken(user.ID, orgID, reportID, host)
	if signErr != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "ereport_embed_token", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"token":          token,
		"expiresAt":      exp.Format(time.RFC3339),
		"orgId":          orgID,
		"reportId":       reportID,
		"tema":           meta.Tema,
		"sectionId":      sectionID,
		"groupId":        groupID,
		"connectorHosts": normalizeConnectorHosts(meta.ConnectorHosts),
		"originHost":     host,
	})
}

// GET /api/v1/ereport/embed/state — list open issues + defaults for the host quick modal.
func (a *App) ereportV1EmbedStateHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	orgID := strings.TrimSpace(r.URL.Query().Get("orgId"))
	reportID := strings.TrimSpace(r.URL.Query().Get("reportId"))
	hostOrigin := strings.TrimSpace(r.URL.Query().Get("hostOrigin"))
	if via := embedViaFrom(r); via == "embed_token" {
		boundOrg, _ := r.Context().Value(embedOrgContextKey).(string)
		boundRep, _ := r.Context().Value(embedReportContextKey).(string)
		if orgID == "" {
			orgID = boundOrg
		}
		if reportID == "" {
			reportID = boundRep
		}
		if orgID != boundOrg || reportID != boundRep {
			a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
			return
		}
	}
	if orgID == "" || reportID == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	meta, payload, err := a.loadOwnedWebsiteRegistration(user, orgID, reportID)
	if err != nil {
		if apiErr := asAPIWriteErr(err); apiErr.Code == "forbidden" {
			writeJSON(w, http.StatusForbidden, map[string]any{
				"error":      "forbidden",
				"message":    "Use a website registration report for the site connector.",
				"request_id": requestIDFrom(r, w),
			})
			return
		}
		a.writeEreportNotFound(w, r, orgID, reportID, ereportMissingReason(err))
		return
	}
	if _, ok := a.requireEmbedHostAllowed(w, r, meta, hostOrigin); !ok {
		return
	}
	sectionID, groupID, sgErr := resolveEmbedSectionGroup(meta, payload)
	if sgErr != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":      "bad_targets",
			"message":    "Connector section or subsection is missing on this report.",
			"request_id": requestIDFrom(r, w),
		})
		return
	}
	secTitle, grpTitle := "", ""
	itemsOut := make([]map[string]any, 0)
	if sec, _, e := findSection(payload, sectionID); e == nil {
		secTitle = asString(sec["title"])
		if grp, _, e2 := findGroup(sec, groupID); e2 == nil {
			grpTitle = asString(grp["title"])
			for _, it := range asMapSlice(grp["items"]) {
				status := strings.TrimSpace(asString(it["status"]))
				if status == ereportNodeStatusAprobado {
					continue
				}
				if checklistAllChecked(it["checklist"]) {
					continue
				}
				itemsOut = append(itemsOut, map[string]any{
					"id":               asString(it["id"]),
					"nombre":           asString(it["nombre"]),
					"incidencia":       asString(it["incidencia"]),
					"solucion":         asString(it["solucion"]),
					"status":           status,
					"fechaIncidencia":  asString(it["fechaIncidencia"]),
					"fechaSolucion":    asString(it["fechaSolucion"]),
					"checklist":        it["checklist"],
					"imagesIncidencia": it["imagesIncidencia"],
					"imagesSolucion":   it["imagesSolucion"],
				})
			}
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"orgId":        orgID,
		"reportId":     reportID,
		"tema":         meta.Tema,
		"sectionId":    sectionID,
		"groupId":      groupID,
		"sectionTitle": secTitle,
		"groupTitle":   grpTitle,
		"items":        itemsOut,
		"viewUrl":      a.ereportViewURL(r, displayOwnerSafe(user.Email), orgID, reportID),
	})
}

func checklistAllChecked(raw any) bool {
	list, ok := raw.([]any)
	if !ok || len(list) == 0 {
		// also accept []map from BSON-ish shapes via asMapSlice
		maps := asMapSlice(raw)
		if len(maps) == 0 {
			return false
		}
		for _, m := range maps {
			checked, _ := m["checked"].(bool)
			if !checked {
				return false
			}
		}
		return true
	}
	for _, entry := range list {
		m, ok := entry.(map[string]any)
		if !ok {
			return false
		}
		checked, _ := m["checked"].(bool)
		if !checked {
			return false
		}
	}
	return true
}

// POST /api/v1/ereport/embed/quick-issue — create one issue locked to a website registration.
func (a *App) ereportV1EmbedQuickIssueHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	var body struct {
		OrgID      string `json:"orgId"`
		ReportID   string `json:"reportId"`
		Text       string `json:"text"`
		HostOrigin string `json:"hostOrigin"`
		Nombre     string `json:"nombre"`
		Incidencia string `json:"incidencia"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	orgID := strings.TrimSpace(body.OrgID)
	reportID := strings.TrimSpace(body.ReportID)
	if via := embedViaFrom(r); via == "embed_token" {
		boundOrg, _ := r.Context().Value(embedOrgContextKey).(string)
		boundRep, _ := r.Context().Value(embedReportContextKey).(string)
		if orgID == "" {
			orgID = boundOrg
		}
		if reportID == "" {
			reportID = boundRep
		}
		if orgID != boundOrg || reportID != boundRep {
			a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
			return
		}
	}
	if orgID == "" || reportID == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	meta, payload, err := a.loadOwnedWebsiteRegistration(user, orgID, reportID)
	if err != nil {
		if apiErr := asAPIWriteErr(err); apiErr.Code == "forbidden" {
			writeJSON(w, http.StatusForbidden, map[string]any{
				"error":      "forbidden",
				"message":    "Use a website registration report for the site connector.",
				"request_id": requestIDFrom(r, w),
			})
			return
		}
		a.writeEreportNotFound(w, r, orgID, reportID, ereportMissingReason(err))
		return
	}
	if _, ok := a.requireEmbedHostAllowed(w, r, meta, body.HostOrigin); !ok {
		return
	}
	sectionID, groupID, sgErr := resolveEmbedSectionGroup(meta, payload)
	if sgErr != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":      "bad_targets",
			"message":    "Connector section or subsection is missing on this report.",
			"request_id": requestIDFrom(r, w),
		})
		return
	}
	nombre := strings.TrimSpace(body.Nombre)
	incidencia := strings.TrimSpace(body.Incidencia)
	if nombre == "" && incidencia == "" {
		nombre, incidencia = parseIssueTextServer(body.Text)
	}
	if nombre == "" && incidencia == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	itemBody := map[string]any{
		"nombre":     nombre,
		"incidencia": incidencia,
		"status":     ereportNodeStatusReprobado,
	}

	lock := ereportReportNodeLock(user.ID, orgID, reportID)
	lock.Lock()
	defer lock.Unlock()

	meta2, payload2, loadErr := a.ereport.loadReport(user.ID, orgID, reportID)
	if loadErr != nil {
		a.writeEreportNotFound(w, r, orgID, reportID, ereportMissingReason(loadErr))
		return
	}
	working := deepCloneMap(payload2)
	node, mutErr := mutateCreateItem(sectionID, groupID)(working, itemBody)
	if mutErr != nil {
		apiErr := asAPIWriteErr(mutErr)
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":      apiErr.Code,
			"message":    safeErrorMessage(apiErr.Code),
			"request_id": requestIDFrom(r, w),
		})
		return
	}
	var snapshotID string
	if sid, snapErr := a.ereport.saveSnapshot(user.ID, orgID, reportID, meta2.Tema, "embed-quick", apiKeyPrefixFrom(r), payload2); snapErr == nil {
		snapshotID = sid
	}
	now := nowRFC3339()
	meta2.UpdatedAt = now
	if d, ok := working["reportDate"].(string); ok {
		meta2.ReportDate = strings.TrimSpace(d)
	}
	meta2 = displayMeta(user, meta2)
	if err := a.ereport.saveReport(user.ID, meta2, working); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.touchLibrary(user.ID, meta2)
	a.auditEvent(r, "ereport_embed_quick_issue", "ok", user.ID)
	ownerSafe := displayOwnerSafe(user.Email)
	out := map[string]any{
		"node":       node,
		"orgId":      orgID,
		"reportId":   reportID,
		"sectionId":  sectionID,
		"groupId":    groupID,
		"viewUrl":    a.ereportViewURL(r, ownerSafe, orgID, reportID),
		"meta":       meta2,
	}
	if snapshotID != "" {
		out["snapshotId"] = snapshotID
	}
	writeJSON(w, http.StatusCreated, out)
}
