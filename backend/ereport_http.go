package main

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"
)

func nowRFC3339() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func (a *App) decodeEreportJSON(w http.ResponseWriter, r *http.Request, dest any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, a.cfg.EreportMaxPayloadBytes)
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(dest); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return false
	}
	return true
}

func displayMeta(user *User, meta ereportMeta) ereportMeta {
	if user != nil {
		meta.OwnerEmail = user.Email
		meta.OwnerUsername = user.Username
		meta.OwnerSafe = displayOwnerSafe(user.Email)
		meta.OwnerUserID = user.ID
	}
	return meta
}

func displayOrgMeta(user *User, meta ereportOrgMeta) ereportOrgMeta {
	if user != nil {
		meta.OwnerEmail = user.Email
		meta.OwnerUsername = user.Username
		meta.OwnerSafe = displayOwnerSafe(user.Email)
		meta.OwnerUserID = user.ID
	}
	return meta
}

func sortOrgCards(orgs []ereportOrgCard) {
	sort.SliceStable(orgs, func(i, j int) bool {
		if orgs[i].Order != orgs[j].Order {
			return orgs[i].Order < orgs[j].Order
		}
		return orgs[i].Name < orgs[j].Name
	})
}

func (a *App) ereportAccessHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportUser(w, r)
	if user == nil {
		return
	}
	ok, unavailable := a.hasProductEntitlement(r, user, productEreport)
	if unavailable {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"canCreate":   ok,
		"ownerUserId": user.ID,
		"ownerSafe":   displayOwnerSafe(user.Email),
		"ownerEmail":  user.Email,
	})
}

func (a *App) ereportGetOrgsHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportUser(w, r)
	if user == nil {
		return
	}
	idx, err := a.ereport.loadOrgsIndex(user.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	sortOrgCards(idx.Orgs)
	recent := make([]ereportRecentCard, 0)
	for _, org := range idx.Orgs {
		if org.Hidden {
			continue
		}
		lib, libErr := a.ereport.loadOrgLibrary(user.ID, org.ID)
		if libErr != nil {
			continue
		}
		for _, card := range lib.Reports {
			recent = append(recent, ereportRecentCard{
				OrgID: org.ID, OrgName: org.Name, ID: card.ID,
				Tema: card.Tema, ReportNumber: card.ReportNumber, UpdatedAt: card.UpdatedAt,
			})
		}
	}
	sort.SliceStable(recent, func(i, j int) bool { return recent[i].UpdatedAt > recent[j].UpdatedAt })
	if len(recent) > 20 {
		recent = recent[:20]
	}
	a.auditEvent(r, "ereport_orgs_list", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"ownerUserId":    user.ID,
		"ownerSafe":      displayOwnerSafe(user.Email),
		"orgs":           idx.Orgs,
		"recentReports":  recent,
	})
}

func (a *App) ereportCreateOrgHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportOwnerWrite(w, r)
	if user == nil {
		return
	}
	if !a.requireCreateEntitlement(w, r, user) {
		return
	}
	var body struct {
		Name            string `json:"name"`
		FirstReportName string `json:"firstReportName"`
		FirstReportTema string `json:"firstReportTema"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	firstName := strings.TrimSpace(body.FirstReportName)
	if firstName == "" {
		firstName = strings.TrimSpace(body.FirstReportTema)
	}
	now := nowRFC3339()
	id := randomID(16)
	idx, _ := a.ereport.loadOrgsIndex(user.ID)
	meta := ereportOrgMeta{
		ID: id, Name: name, OwnerUserID: user.ID, Order: len(idx.Orgs),
		CreatedAt: now, UpdatedAt: now,
	}
	meta = displayOrgMeta(user, meta)
	if err := a.ereport.saveOrgMeta(user.ID, meta); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	lib := ereportLibrary{Reports: []ereportCard{}}
	var reportMeta *ereportMeta
	var reportPayload map[string]any
	if firstName != "" {
		rid := randomID(16)
		rm := ereportMeta{
			ID: rid, Tema: firstName, OrgID: id, OwnerUserID: user.ID,
			CreatedAt: now, UpdatedAt: now,
		}
		rm = displayMeta(user, rm)
		payload := emptyEreportPayload()
		if err := a.ereport.saveReport(user.ID, rm, payload); err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		lib.Reports = append(lib.Reports, ereportCard{ID: rid, Tema: firstName, UpdatedAt: now})
		reportMeta = &rm
		reportPayload = payload
	}
	if err := a.ereport.saveOrgLibrary(user.ID, id, lib); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	idx.Orgs = append(idx.Orgs, ereportOrgCard{ID: id, Name: name, Order: meta.Order, CreatedAt: now, UpdatedAt: now})
	_ = a.ereport.saveOrgsIndex(user.ID, idx)
	a.auditEvent(r, "ereport_org_create", "ok", user.ID)
	out := map[string]any{"org": meta}
	if reportMeta != nil {
		out["report"] = reportMeta
		out["payload"] = reportPayload
		out["viewUrl"] = a.ereportViewURL(r, displayOwnerSafe(user.Email), id, reportMeta.ID)
	}
	writeJSON(w, http.StatusCreated, out)
}

func (a *App) ereportPutOrgsHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportOwnerWrite(w, r)
	if user == nil {
		return
	}
	var body struct {
		Orgs []struct {
			ID     string  `json:"id"`
			Name   *string `json:"name"`
			Order  *int    `json:"order"`
			Hidden *bool   `json:"hidden"`
		} `json:"orgs"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	if len(body.Orgs) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	idx, err := a.ereport.loadOrgsIndex(user.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	byID := map[string]int{}
	for i, o := range idx.Orgs {
		byID[o.ID] = i
	}
	now := nowRFC3339()
	for _, patch := range body.Orgs {
		id := strings.TrimSpace(patch.ID)
		i, ok := byID[id]
		if !ok {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		if patch.Order != nil {
			idx.Orgs[i].Order = *patch.Order
		}
		if patch.Hidden != nil {
			idx.Orgs[i].Hidden = *patch.Hidden
		}
		if patch.Name != nil {
			n := strings.TrimSpace(*patch.Name)
			if n == "" {
				a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
				return
			}
			idx.Orgs[i].Name = n
		}
		idx.Orgs[i].UpdatedAt = now
		meta, mErr := a.ereport.loadOrgMeta(user.ID, id)
		if mErr == nil {
			meta.Order = idx.Orgs[i].Order
			meta.Hidden = idx.Orgs[i].Hidden
			meta.Name = idx.Orgs[i].Name
			meta.UpdatedAt = now
			meta = displayOrgMeta(user, meta)
			_ = a.ereport.saveOrgMeta(user.ID, meta)
		}
	}
	sortOrgCards(idx.Orgs)
	if err := a.ereport.saveOrgsIndex(user.ID, idx); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"orgs": idx.Orgs})
}

func (a *App) ereportGetOrgHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportUser(w, r)
	if user == nil {
		return
	}
	orgID := r.PathValue("orgId")
	meta, err := a.ereport.loadOrgMeta(user.ID, orgID)
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
		"org":     displayOrgMeta(user, meta),
		"reports": lib.Reports,
	})
}

func (a *App) ereportDeleteOrgHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportOwnerWrite(w, r)
	if user == nil {
		return
	}
	orgID := r.PathValue("orgId")
	if _, err := a.ereport.loadOrgMeta(user.ID, orgID); err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	_ = a.ereport.deleteOrg(user.ID, orgID)
	idx, _ := a.ereport.loadOrgsIndex(user.ID)
	kept := make([]ereportOrgCard, 0, len(idx.Orgs))
	for _, o := range idx.Orgs {
		if o.ID != orgID {
			kept = append(kept, o)
		}
	}
	idx.Orgs = kept
	_ = a.ereport.saveOrgsIndex(user.ID, idx)
	a.auditEvent(r, "ereport_org_delete", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

func (a *App) ereportCreateReportHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportOwnerWrite(w, r)
	if user == nil {
		return
	}
	if !a.requireCreateEntitlement(w, r, user) {
		return
	}
	orgID := r.PathValue("orgId")
	orgMeta, err := a.ereport.loadOrgMeta(user.ID, orgID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body struct {
		Tema string `json:"tema"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	tema := strings.TrimSpace(body.Tema)
	if tema == "" {
		tema = "Sin tema"
	}
	now := nowRFC3339()
	id := randomID(16)
	meta := displayMeta(user, ereportMeta{
		ID: id, Tema: tema, OrgID: orgMeta.ID, OwnerUserID: user.ID,
		CreatedAt: now, UpdatedAt: now,
	})
	payload := emptyEreportPayload()
	if err := a.ereport.saveReport(user.ID, meta, payload); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	lib, _ := a.ereport.loadOrgLibrary(user.ID, orgID)
	lib.Reports = append(lib.Reports, ereportCard{ID: id, Tema: tema, UpdatedAt: now})
	_ = a.ereport.saveOrgLibrary(user.ID, orgID, lib)
	a.auditEvent(r, "ereport_report_create", "ok", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{
		"meta":    meta,
		"payload": payload,
		"viewUrl": a.ereportViewURL(r, displayOwnerSafe(user.Email), orgID, id),
	})
}

func (a *App) ereportImportReportHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportOwnerWrite(w, r)
	if user == nil {
		return
	}
	if !a.requireCreateEntitlement(w, r, user) {
		return
	}
	orgID := r.PathValue("orgId")
	if _, err := a.ereport.loadOrgMeta(user.ID, orgID); err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body struct {
		Tema    string         `json:"tema"`
		Payload map[string]any `json:"payload"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	if body.Payload == nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if _, ok := body.Payload["sections"]; !ok {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	tema := strings.TrimSpace(body.Tema)
	if tema == "" {
		tema = "Importado"
	}
	now := nowRFC3339()
	id := randomID(16)
	reportNumber, _ := body.Payload["reportNumber"].(string)
	reportDate, _ := body.Payload["reportDate"].(string)
	meta := displayMeta(user, ereportMeta{
		ID: id, Tema: tema, ReportNumber: reportNumber, ReportDate: reportDate,
		OrgID: orgID, OwnerUserID: user.ID, CreatedAt: now, UpdatedAt: now,
	})
	if err := a.ereport.saveReport(user.ID, meta, body.Payload); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	lib, _ := a.ereport.loadOrgLibrary(user.ID, orgID)
	lib.Reports = append(lib.Reports, ereportCard{ID: id, Tema: tema, ReportNumber: reportNumber, UpdatedAt: now})
	_ = a.ereport.saveOrgLibrary(user.ID, orgID, lib)
	a.auditEvent(r, "ereport_report_import", "ok", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{"meta": meta, "payload": body.Payload})
}

func (a *App) ownerLoadReport(w http.ResponseWriter, r *http.Request, user *User) (ereportMeta, map[string]any, bool) {
	orgID := r.PathValue("orgId")
	reportID := r.PathValue("reportId")
	meta, payload, err := a.ereport.loadReport(user.ID, orgID, reportID)
	if err != nil {
		status := http.StatusNotFound
		if errors.Is(err, errEreportTraversal) || errors.Is(err, errEreportPath) {
			status = http.StatusForbidden
		}
		a.writeSafeError(w, r, status, "not_found")
		return ereportMeta{}, nil, false
	}
	return displayMeta(user, meta), payload, true
}

func (a *App) ereportGetReportHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportUser(w, r)
	if user == nil {
		return
	}
	meta, payload, ok := a.ownerLoadReport(w, r, user)
	if !ok {
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"meta":     meta,
		"payload":  payload,
		"canEdit":  true,
		"canShare": true,
		"isOwner":  true,
		"viewUrl":  a.ereportViewURL(r, displayOwnerSafe(user.Email), meta.OrgID, meta.ID),
	})
}

func (a *App) ereportPutReportHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportOwnerWrite(w, r)
	if user == nil {
		return
	}
	meta, payload, ok := a.ownerLoadReport(w, r, user)
	if !ok {
		return
	}
	var body struct {
		Tema    *string        `json:"tema"`
		Payload map[string]any `json:"payload"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	now := nowRFC3339()
	if body.Tema != nil {
		tema := strings.TrimSpace(*body.Tema)
		if tema == "" {
			tema = "Sin tema"
		}
		meta.Tema = tema
	}
	if body.Payload != nil {
		payload = body.Payload
		if n, ok := payload["reportNumber"].(string); ok {
			meta.ReportNumber = n
		}
		if d, ok := payload["reportDate"].(string); ok {
			meta.ReportDate = d
		}
	}
	meta.UpdatedAt = now
	meta = displayMeta(user, meta)
	if err := a.ereport.saveReport(user.ID, meta, payload); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.touchLibrary(user.ID, meta)
	writeJSON(w, http.StatusOK, map[string]any{"meta": meta, "payload": payload})
}

func (a *App) touchLibrary(ownerUserID string, meta ereportMeta) {
	lib, err := a.ereport.loadOrgLibrary(ownerUserID, meta.OrgID)
	if err != nil {
		return
	}
	for i := range lib.Reports {
		if lib.Reports[i].ID == meta.ID {
			lib.Reports[i].Tema = meta.Tema
			lib.Reports[i].ReportNumber = meta.ReportNumber
			lib.Reports[i].UpdatedAt = meta.UpdatedAt
		}
	}
	_ = a.ereport.saveOrgLibrary(ownerUserID, meta.OrgID, lib)
}

func (a *App) ereportDeleteReportHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportOwnerWrite(w, r)
	if user == nil {
		return
	}
	meta, _, ok := a.ownerLoadReport(w, r, user)
	if !ok {
		return
	}
	_ = a.ereport.deleteReport(user.ID, meta.OrgID, meta.ID)
	lib, _ := a.ereport.loadOrgLibrary(user.ID, meta.OrgID)
	kept := make([]ereportCard, 0, len(lib.Reports))
	for _, c := range lib.Reports {
		if c.ID != meta.ID {
			kept = append(kept, c)
		}
	}
	lib.Reports = kept
	_ = a.ereport.saveOrgLibrary(user.ID, meta.OrgID, lib)
	a.auditEvent(r, "ereport_report_delete", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]bool{"deleted": true})
}

func (a *App) ereportListHistoryHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportUser(w, r)
	if user == nil {
		return
	}
	meta, _, ok := a.ownerLoadReport(w, r, user)
	if !ok {
		return
	}
	idx, err := a.ereport.loadHistory(user.ID, meta.OrgID, meta.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": idx.Items})
}

func (a *App) ereportGetHistoryHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportUser(w, r)
	if user == nil {
		return
	}
	meta, _, ok := a.ownerLoadReport(w, r, user)
	if !ok {
		return
	}
	snap, err := a.ereport.loadSnapshot(user.ID, meta.OrgID, meta.ID, r.PathValue("snapshotId"))
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"snapshot": snap})
}

func (a *App) ereportRestoreHistoryHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportOwnerWrite(w, r)
	if user == nil {
		return
	}
	meta, current, ok := a.ownerLoadReport(w, r, user)
	if !ok {
		return
	}
	snap, err := a.ereport.loadSnapshot(user.ID, meta.OrgID, meta.ID, r.PathValue("snapshotId"))
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if current != nil {
		_, _ = a.ereport.saveSnapshot(user.ID, meta.OrgID, meta.ID, meta.Tema, "restore", "", current)
	}
	payload := snap.Payload
	now := nowRFC3339()
	if n, ok := payload["reportNumber"].(string); ok {
		meta.ReportNumber = n
	}
	if d, ok := payload["reportDate"].(string); ok {
		meta.ReportDate = d
	}
	if strings.TrimSpace(snap.Tema) != "" {
		meta.Tema = snap.Tema
	}
	meta.UpdatedAt = now
	meta = displayMeta(user, meta)
	if err := a.ereport.saveReport(user.ID, meta, payload); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.touchLibrary(user.ID, meta)
	writeJSON(w, http.StatusOK, map[string]any{"meta": meta, "payload": payload})
}

func readLimited(r io.Reader, max int64) ([]byte, error) {
	return io.ReadAll(io.LimitReader(r, max+1))
}
