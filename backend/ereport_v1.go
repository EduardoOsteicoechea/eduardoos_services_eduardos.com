package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

type apiKeyContextKey string

const apiUserContextKey apiKeyContextKey = "api-user"
const apiKeyIDContextKey apiKeyContextKey = "api-key-id"

func (a *App) withAPIKey(product string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		header := strings.TrimSpace(r.Header.Get("Authorization"))
		if !strings.HasPrefix(strings.ToLower(header), "bearer ") {
			a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
			return
		}
		secret := strings.TrimSpace(header[7:])
		if !strings.HasPrefix(secret, apiKeyPrefix) {
			a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
			return
		}
		hash := a.hashOpaque("api-key", secret)
		key, err := a.store.APIKeyByHash(r.Context(), hash)
		if err != nil || key.RevokedAt != nil {
			a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
			return
		}
		if !a.apiKeyLimit.allow(key.ID) {
			w.Header().Set("Retry-After", "60")
			a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
			return
		}
		user, err := a.store.UserByID(r.Context(), key.UserID)
		if err != nil || user.Status != statusVerified {
			a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
			return
		}
		if product != "" {
			ok, unavailable := a.hasProductEntitlement(r, user, productAPI)
			if unavailable || !ok {
				a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
				return
			}
			ok, unavailable = a.hasProductEntitlement(r, user, product)
			if unavailable || !ok {
				a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
				return
			}
		}
		now := time.Now().UTC()
		key.LastUsedAt = &now
		_ = a.store.UpdateAPIKey(r.Context(), key)
		ctx := context.WithValue(r.Context(), apiUserContextKey, user)
		ctx = context.WithValue(ctx, apiKeyIDContextKey, key.ID)
		next(w, r.WithContext(ctx))
	}
}

func apiUserFrom(r *http.Request) *User {
	user, _ := r.Context().Value(apiUserContextKey).(*User)
	return user
}

func apiKeyPrefixFrom(r *http.Request) string {
	id, _ := r.Context().Value(apiKeyIDContextKey).(string)
	if len(id) > 8 {
		return id[:8]
	}
	return id
}

func (a *App) ereportV1AccessHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	writeJSON(w, http.StatusOK, map[string]any{
		"allowed":     true,
		"service":     productEreport,
		"email":       user.Email,
		"ownerUserId": user.ID,
		"ownerSafe":   displayOwnerSafe(user.Email),
	})
}

func (a *App) ereportV1OrgsHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	idx, err := a.ereport.loadOrgsIndex(user.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	sortOrgCards(idx.Orgs)
	out := make([]ereportOrgCard, 0, len(idx.Orgs))
	for _, org := range idx.Orgs {
		if !org.Hidden {
			out = append(out, org)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ownerUserId": user.ID,
		"ownerSafe":   displayOwnerSafe(user.Email),
		"orgs":        out,
	})
}

func (a *App) ereportV1OrgReportsHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	orgID := r.PathValue("orgId")
	orgMeta, err := a.ereport.loadOrgMeta(user.ID, orgID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	lib, err := a.ereport.loadOrgLibrary(user.ID, orgID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ownerUserId": user.ID,
		"ownerSafe":   displayOwnerSafe(user.Email),
		"orgId":       orgMeta.ID,
		"orgName":     orgMeta.Name,
		"reports":     lib.Reports,
	})
}

func (a *App) ereportV1LibraryHandler(w http.ResponseWriter, r *http.Request) {
	a.ereportV1OrgsHandler(w, r)
}

func (a *App) ereportV1GetReportHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	orgID := r.PathValue("orgId")
	reportID := r.PathValue("reportId")
	meta, payload, err := a.ereport.loadReport(user.ID, orgID, reportID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	ownerSafe := displayOwnerSafe(user.Email)
	writeJSON(w, http.StatusOK, map[string]any{
		"orgId":       orgID,
		"reportId":    reportID,
		"ownerUserId": user.ID,
		"ownerSafe":   ownerSafe,
		"viewUrl":     a.ereportViewURL(r, ownerSafe, orgID, reportID),
		"meta":        displayMeta(user, meta),
		"payload":     payload,
	})
}

func (a *App) ereportV1PostReportHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	orgID := r.PathValue("orgId")
	reportID := r.PathValue("reportId")
	meta, current, err := a.ereport.loadReport(user.ID, orgID, reportID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, a.cfg.EreportMaxPayloadBytes)
	var body struct {
		ConfirmOverwrite bool           `json:"confirmOverwrite"`
		Tema             *string        `json:"tema"`
		Payload          map[string]any `json:"payload"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if !body.ConfirmOverwrite {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":      "invalid_request",
			"message":    "confirmOverwrite must be true to replace the latest web version",
			"request_id": requestIDFrom(r, w),
		})
		return
	}
	if body.Payload == nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	payload, mergeErr := mergeAPIPayload(current, body.Payload)
	if mergeErr != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":      "invalid_request",
			"message":    "Check the form and try again.",
			"request_id": requestIDFrom(r, w),
			"hint":       "API posts are additive only; new issues need incidencia text and status reprobado.",
		})
		return
	}
	var snapshotID string
	if current != nil {
		sid, snapErr := a.ereport.saveSnapshot(user.ID, orgID, reportID, meta.Tema, "api", apiKeyPrefixFrom(r), current)
		if snapErr != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		snapshotID = sid
	}
	now := nowRFC3339()
	if body.Tema != nil {
		tema := strings.TrimSpace(*body.Tema)
		if tema == "" {
			tema = "Sin tema"
		}
		meta.Tema = tema
	}
	if n, ok := payload["reportNumber"].(string); ok {
		meta.ReportNumber = n
	}
	if d, ok := payload["reportDate"].(string); ok {
		meta.ReportDate = d
	}
	meta.UpdatedAt = now
	meta = displayMeta(user, meta)
	if err := a.ereport.saveReport(user.ID, meta, payload); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.touchLibrary(user.ID, meta)
	ownerSafe := displayOwnerSafe(user.Email)
	out := map[string]any{
		"orgId":       orgID,
		"reportId":    reportID,
		"ownerUserId": user.ID,
		"ownerSafe":   ownerSafe,
		"viewUrl":     a.ereportViewURL(r, ownerSafe, orgID, reportID),
		"meta":        meta,
		"payload":     payload,
	}
	if snapshotID != "" {
		out["snapshotId"] = snapshotID
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) listAPIKeysHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportUser(w, r)
	if user == nil {
		return
	}
	if !a.requireAPIKeyManagement(w, r, user) {
		return
	}
	keys, err := a.store.APIKeysByUser(r.Context(), user.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	out := make([]map[string]any, 0, len(keys))
	for _, key := range keys {
		if key.RevokedAt != nil {
			continue
		}
		row := map[string]any{
			"id":        key.ID,
			"label":     key.Label,
			"prefix":    key.Prefix,
			"createdAt": key.CreatedAt.UTC().Format(time.RFC3339),
		}
		if key.LastUsedAt != nil {
			row["lastUsedAt"] = key.LastUsedAt.UTC().Format(time.RFC3339)
		}
		out = append(out, row)
	}
	writeJSON(w, http.StatusOK, map[string]any{"keys": out})
}

func (a *App) createAPIKeyHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportOwnerWrite(w, r)
	if user == nil {
		return
	}
	if !a.requireAPIKeyManagement(w, r, user) {
		return
	}
	var body struct {
		Label string `json:"label"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	label := strings.TrimSpace(body.Label)
	if label == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	secret := apiKeyPrefix + randomID(24)
	now := time.Now().UTC()
	rec := &APIKeyRecord{
		ID:         randomID(16),
		UserID:     user.ID,
		Label:      label,
		Prefix:     secret[:12] + "…",
		SecretHash: a.hashOpaque("api-key", secret),
		CreatedAt:  now,
	}
	if err := a.store.InsertAPIKey(r.Context(), rec); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "apikey_create", "ok", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{
		"id":        rec.ID,
		"label":     rec.Label,
		"prefix":    rec.Prefix,
		"createdAt": rec.CreatedAt.Format(time.RFC3339),
		"key":       secret,
	})
}

func (a *App) deleteAPIKeyHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportOwnerWrite(w, r)
	if user == nil {
		return
	}
	if !a.requireAPIKeyManagement(w, r, user) {
		return
	}
	key, err := a.store.APIKeyByID(r.Context(), r.PathValue("id"))
	if err != nil || key.UserID != user.ID {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	now := time.Now().UTC()
	key.RevokedAt = &now
	if err := a.store.UpdateAPIKey(r.Context(), key); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "apikey_revoke", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]bool{"revoked": true})
}

func (a *App) requireAPIKeyManagement(w http.ResponseWriter, r *http.Request, user *User) bool {
	ok, unavailable := a.hasProductEntitlement(r, user, productAPI)
	if unavailable || !ok {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return false
	}
	return true
}
