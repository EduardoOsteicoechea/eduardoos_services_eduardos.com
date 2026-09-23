package main

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

func (a *App) homescoolMaterialOwnerIDs(r *http.Request, user *User) ([]string, bool /*canWrite*/, bool /*ok*/) {
	if user == nil {
		return nil, false, false
	}
	if user.Role == roleAdmin {
		return []string{user.ID}, true, true
	}
	ok, unavailable := a.hasProductEntitlement(r, user, productHomescool)
	if unavailable {
		return nil, false, false
	}
	if ok {
		return []string{user.ID}, true, true
	}
	links, err := a.homescool.ListLinksByStudent(r.Context(), user.ID)
	if err != nil || len(links) == 0 {
		return nil, false, false
	}
	ids := make([]string, 0, len(links))
	seen := map[string]struct{}{}
	for _, l := range links {
		if _, dup := seen[l.TeacherUserID]; dup {
			continue
		}
		seen[l.TeacherUserID] = struct{}{}
		ids = append(ids, l.TeacherUserID)
	}
	return ids, false, true
}

func (a *App) requireHomescoolMaterialsAccess(w http.ResponseWriter, r *http.Request) (*User, []string, bool) {
	user := a.requireHomescoolSession(w, r)
	if user == nil {
		return nil, nil, false
	}
	owners, _, ok := a.homescoolMaterialOwnerIDs(r, user)
	if !ok {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return nil, nil, false
	}
	return user, owners, true
}

func (a *App) listHomescoolMaterialsHandler(w http.ResponseWriter, r *http.Request) {
	_, owners, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	cycle := 0
	if raw := strings.TrimSpace(r.URL.Query().Get("cycle")); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 || n > 3 {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		cycle = n
	}
	rows, err := a.homescool.ListMaterials(r.Context(), owners, cycle)
	if err != nil {
		a.mustLogf(r, "homescool.materials.list.error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	cycles := make([]HomescoolCycleSummary, 0, 3)
	counts := map[int]int{1: 0, 2: 0, 3: 0}
	for _, m := range rows {
		counts[m.Cycle]++
	}
	if cycle == 0 {
		all, err := a.homescool.ListMaterials(r.Context(), owners, 0)
		if err == nil {
			counts = map[int]int{1: 0, 2: 0, 3: 0}
			for _, m := range all {
				counts[m.Cycle]++
			}
			rows = all
		}
	}
	for c := 1; c <= 3; c++ {
		n := counts[c]
		cycles = append(cycles, HomescoolCycleSummary{Cycle: c, Count: n, Empty: n == 0})
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"cycles":    cycles,
		"materials": rows,
	})
}

func (a *App) getHomescoolMaterialHandler(w http.ResponseWriter, r *http.Request) {
	_, owners, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	id := strings.TrimSpace(r.PathValue("materialId"))
	if id == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	m, found, err := a.homescool.GetMaterial(r.Context(), "", id)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found || !homescoolOwnerAllowed(owners, m.OwnerUserID) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"material":     m,
		"viewUrl":      "/homescool/material?id=" + m.ID,
		"documentUrl":  "/api/homescool/materials/" + m.ID + "/document",
		"pdfUrl":       "/api/homescool/materials/" + m.ID + "/pdf",
		"htmlUrl":      "/api/homescool/materials/" + m.ID + "/html",
	})
}

func (a *App) getHomescoolMaterialDocumentHandler(w http.ResponseWriter, r *http.Request) {
	_, owners, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	id := strings.TrimSpace(r.PathValue("materialId"))
	m, found, err := a.homescool.GetMaterial(r.Context(), "", id)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found || !homescoolOwnerAllowed(owners, m.OwnerUserID) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	raw, err := a.homescool.ReadMaterialDocument(r.Context(), m)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if m.Format == eoschoolFormatName {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
	} else {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
	}
	w.Header().Set("X-Content-Type-Options", "nosniff")
	_, _ = w.Write(raw)
}

func (a *App) getHomescoolMaterialPDFHandler(w http.ResponseWriter, r *http.Request) {
	_, owners, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	id := strings.TrimSpace(r.PathValue("materialId"))
	m, found, err := a.homescool.GetMaterial(r.Context(), "", id)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found || !homescoolOwnerAllowed(owners, m.OwnerUserID) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if m.Format != eoschoolFormatName {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	raw, err := a.homescool.ReadMaterialDocument(r.Context(), m)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	doc, err := parseEoschoolDocument(raw)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	pdfBytes, err := buildEoschoolPDF(doc)
	if err != nil {
		a.mustLogf(r, "homescool.pdf.error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `inline; filename="eoschool.pdf"`)
	_, _ = w.Write(pdfBytes)
}

func (a *App) getHomescoolMaterialHTMLHandler(w http.ResponseWriter, r *http.Request) {
	_, owners, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	id := strings.TrimSpace(r.PathValue("materialId"))
	m, found, err := a.homescool.GetMaterial(r.Context(), "", id)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found || !homescoolOwnerAllowed(owners, m.OwnerUserID) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	html, err := a.homescool.ReadMaterialHTML(r.Context(), m)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Security-Policy", "default-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'")
	_, _ = w.Write(html)
}

func (a *App) getHomescoolWebAssetHandler(w http.ResponseWriter, r *http.Request) {
	if a.requireHomescoolSession(w, r) == nil {
		return
	}
	name := filepath.Base(strings.TrimSpace(r.PathValue("name")))
	switch name {
	case "styles.css", "print.js", "map-grid.js", "venezuela.svg":
	default:
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	abs := filepath.Join(a.homescool.MediaRoot(), filepath.FromSlash(homescoolWebAssetsRelativePath()), name)
	b, err := os.ReadFile(abs)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	switch {
	case strings.HasSuffix(name, ".css"):
		w.Header().Set("Content-Type", "text/css; charset=utf-8")
	case strings.HasSuffix(name, ".js"):
		w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
	case strings.HasSuffix(name, ".svg"):
		w.Header().Set("Content-Type", "image/svg+xml")
	}
	w.Header().Set("Cache-Control", "private, max-age=3600")
	_, _ = w.Write(b)
}

func homescoolOwnerAllowed(owners []string, ownerUserID string) bool {
	for _, id := range owners {
		if id == ownerUserID {
			return true
		}
	}
	return false
}

func (a *App) homescoolV1AccessHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	writeJSON(w, http.StatusOK, map[string]any{
		"allowed":     true,
		"service":     productHomescool,
		"email":       user.Email,
		"ownerUserId": user.ID,
		"ownerSafe":   displayOwnerSafe(user.Email),
	})
}

func (a *App) homescoolV1ListMaterialsHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	cycle := 0
	if raw := strings.TrimSpace(r.URL.Query().Get("cycle")); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 || n > 3 {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		cycle = n
	}
	rows, err := a.homescool.ListMaterials(r.Context(), []string{user.ID}, cycle)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ownerUserId": user.ID,
		"materials":   rows,
	})
}

func (a *App) homescoolV1GetMaterialHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	id := strings.TrimSpace(r.PathValue("materialId"))
	m, found, err := a.homescool.GetMaterial(r.Context(), user.ID, id)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"material":    m,
		"viewUrl":     a.homescoolMaterialViewURL(r, m.ID),
		"documentUrl": "/api/homescool/materials/" + m.ID + "/document",
		"pdfUrl":      "/api/homescool/materials/" + m.ID + "/pdf",
		"htmlUrl":     "/api/homescool/materials/" + m.ID + "/html",
	})
}

func (a *App) homescoolMaterialViewURL(r *http.Request, id string) string {
	return a.publicBase(r) + "/homescool/material?id=" + id
}

func (a *App) homescoolV1PostMaterialHandler(w http.ResponseWriter, r *http.Request) {
	user := apiUserFrom(r)
	var body struct {
		ConfirmOverwrite bool            `json:"confirmOverwrite"`
		Material         json.RawMessage `json:"material"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if !body.ConfirmOverwrite {
		a.writeSafeError(w, r, http.StatusBadRequest, "replace_confirm_required")
		return
	}
	if len(body.Material) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	// Prefer METHOD_V1 .eoschool JSON.
	var probe struct {
		Format string `json:"format"`
		HTML   string `json:"html"`
	}
	_ = json.Unmarshal(body.Material, &probe)

	if probe.Format == eoschoolFormatName || (probe.Format == "" && probe.HTML == "") {
		doc, err := parseEoschoolDocument(body.Material)
		if err != nil {
			a.mustLogf(r, "homescool.v1.post.validate", "err", err.Error())
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		raw, err := marshalEoschoolDocument(doc)
		if err != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		m := HomescoolMaterial{
			OwnerUserID: user.ID,
			Format:      eoschoolFormatName,
			Cycle:       doc.Cycle,
			Week:        doc.Week,
			Day:         doc.Day,
			Level:       doc.Level,
			Subject:     doc.Subject,
			Title:       doc.Title,
			Slug:        doc.Subject,
		}
		saved, err := a.homescool.UpsertMaterial(r.Context(), m, raw)
		if err != nil {
			a.mustLogf(r, "homescool.v1.post.error", "err", err.Error())
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		a.auditEvent(r, "homescool_material_upsert", "ok", user.ID)
		writeJSON(w, http.StatusOK, map[string]any{
			"material":    saved,
			"viewUrl":     a.homescoolMaterialViewURL(r, saved.ID),
			"documentUrl": "/api/homescool/materials/" + saved.ID + "/document",
			"pdfUrl":      "/api/homescool/materials/" + saved.ID + "/pdf",
		})
		return
	}

	// Legacy HTML upsert (deprecated).
	var legacy struct {
		Cycle       int    `json:"cycle"`
		Week        int    `json:"week"`
		Subject     string `json:"subject"`
		Day         int    `json:"day"`
		SessionDate string `json:"sessionDate"`
		Title       string `json:"title"`
		Slug        string `json:"slug"`
		HTML        string `json:"html"`
	}
	if err := json.Unmarshal(body.Material, &legacy); err != nil || strings.TrimSpace(legacy.HTML) == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	m := HomescoolMaterial{
		OwnerUserID: user.ID,
		Format:      "html",
		Cycle:       legacy.Cycle,
		Week:        legacy.Week,
		Subject:     legacy.Subject,
		Day:         legacy.Day,
		SessionDate: legacy.SessionDate,
		Title:       legacy.Title,
		Slug:        legacy.Slug,
	}
	saved, err := a.homescool.UpsertMaterial(r.Context(), m, []byte(legacy.HTML))
	if err != nil {
		a.mustLogf(r, "homescool.v1.post.error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	a.auditEvent(r, "homescool_material_upsert", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"material": saved,
		"viewUrl":  a.homescoolMaterialViewURL(r, saved.ID),
	})
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
