package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

var (
	errEoadminImageInvalid = errors.New("invalid payment image")
	errEoadminImageTooLarge = errors.New("payment image too large")
	safeEoadminRel          = regexp.MustCompile(`^eoadmin/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+\.(jpg|png|webp)$`)
)

func (a *App) eoadminEnsureSeed(r *http.Request) {
	if a.eoadmin == nil {
		return
	}
	_ = a.eoadmin.EnsureSeedOptions(r.Context(), defaultEoadminOptions(time.Now().UTC()))
}

func (a *App) eoadminNotifyAdmin(r *http.Request, st *EoadminStatement) {
	to := strings.TrimSpace(a.cfg.AdminEmail)
	if to == "" {
		to = strings.TrimSpace(a.cfg.BootstrapAdminEmail)
	}
	if to == "" || st == nil || a.mailer == nil {
		return
	}
	subject := fmt.Sprintf("[eoadmin] New purchase statement (%s)", st.Status)
	body := fmt.Sprintf(
		"A purchase statement needs attention.\n\nID: %s\nEmail: %s\nOption: %s\nStatus: %s\nItems: %d\nDescription length: %d\n\nReview in /eoadmin/admin\n",
		st.ID, st.UserEmail, st.OptionLabel, st.Status, len(st.Items), len(st.Description),
	)
	if err := a.mailer.Send(to, subject, body); err != nil {
		a.mustLogf(r, "eoadmin.mail.error", "err", err.Error())
		return
	}
	a.mustLogf(r, "eoadmin.mail.sent", "statement_id", st.ID)
}

func writeEoadminImage(mediaRoot, rel string, data []byte) error {
	if !safeEoadminRel.MatchString(rel) {
		return errEoadminImageInvalid
	}
	abs := filepath.Join(mediaRoot, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(abs), 0750); err != nil {
		return err
	}
	tmpDir := filepath.Join(filepath.Dir(mediaRoot), "eoadmin-tmp")
	if err := os.MkdirAll(tmpDir, 0750); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(tmpDir, "eoadmin-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer func() { _ = os.Remove(tmpName) }()
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, abs)
}

func newEoadminImageRel(userID, statementID, ext string) (string, error) {
	userID = strings.TrimSpace(userID)
	statementID = strings.TrimSpace(statementID)
	if userID == "" || statementID == "" {
		return "", errEoadminImageInvalid
	}
	rel := fmt.Sprintf("eoadmin/%s/%s%s", userID, statementID, ext)
	if !safeEoadminRel.MatchString(rel) {
		return "", errEoadminImageInvalid
	}
	return rel, nil
}

func detectEoadminImage(data []byte) (avatarKind, error) {
	if len(data) > maxEoadminImageBytes {
		return avatarKind{}, errEoadminImageTooLarge
	}
	if len(data) < 12 {
		return avatarKind{}, errEoadminImageInvalid
	}
	lower := bytes.ToLower(data[:min(512, len(data))])
	if bytes.HasPrefix(data, []byte("GIF87a")) || bytes.HasPrefix(data, []byte("GIF89a")) {
		return avatarKind{}, errEoadminImageInvalid
	}
	if bytes.Contains(lower, []byte("<svg")) || bytes.Contains(lower, []byte("<?xml")) ||
		bytes.Contains(lower, []byte("<html")) || bytes.Contains(lower, []byte("<script")) {
		return avatarKind{}, errEoadminImageInvalid
	}
	kind, err := sniffImage(data)
	if err != nil {
		return avatarKind{}, errEoadminImageInvalid
	}
	cfg, err := decodeConfig(data, kind.mime)
	if err != nil {
		return avatarKind{}, errEoadminImageInvalid
	}
	if cfg.Width <= 0 || cfg.Height <= 0 || cfg.Width > maxEoadminImageEdge || cfg.Height > maxEoadminImageEdge {
		return avatarKind{}, errEoadminImageTooLarge
	}
	return kind, nil
}

func parseEoadminRectJSON(raw string) (*EoadminRect, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" || raw == "null" {
		return nil, nil
	}
	var r EoadminRect
	if err := json.Unmarshal([]byte(raw), &r); err != nil {
		return nil, err
	}
	if !r.valid() {
		return nil, fmt.Errorf("invalid rect")
	}
	return &r, nil
}

func (a *App) eoadminOptionsListHandler(w http.ResponseWriter, r *http.Request) {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	a.eoadminEnsureSeed(r)
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	activeOnly := user.Role != roleAdmin || r.URL.Query().Get("all") != "1"
	opts, err := a.eoadmin.ListOptions(r.Context(), q, activeOnly)
	if err != nil {
		a.mustLogf(r, "eoadmin.options.error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.mustLogf(r, "eoadmin.options.ok", "count", len(opts), "q_len", len(q))
	writeJSON(w, http.StatusOK, map[string]any{"options": opts, "count": len(opts)})
}

func (a *App) eoadminOptionsCreateHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	admin := a.requireAdminRead(w, r)
	if admin == nil {
		return
	}
	var body struct {
		Label       string               `json:"label"`
		Description string               `json:"description"`
		ProductID   string               `json:"product_id"`
		Checkboxes  []EoadminCheckboxDef `json:"checkboxes"`
		SortOrder   int                  `json:"sort_order"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	label := strings.TrimSpace(body.Label)
	if label == "" || len(body.Checkboxes) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	now := time.Now().UTC()
	opt := &EoadminOption{
		ID:          "opt-" + randomID(10),
		Label:       label,
		Description: strings.TrimSpace(body.Description),
		ProductID:   strings.ToLower(strings.TrimSpace(body.ProductID)),
		Checkboxes:  normalizeCheckboxDefs(body.Checkboxes),
		Active:      true,
		SortOrder:   body.SortOrder,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := a.eoadmin.UpsertOption(r.Context(), opt); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eoadmin_option", "created", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{"option": opt})
}

func (a *App) eoadminOptionsUpdateHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	admin := a.requireAdminRead(w, r)
	if admin == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	existing, err := a.eoadmin.GetOption(r.Context(), id)
	if err != nil || existing == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body struct {
		Label       string               `json:"label"`
		Description string               `json:"description"`
		ProductID   string               `json:"product_id"`
		Checkboxes  []EoadminCheckboxDef `json:"checkboxes"`
		SortOrder   int                  `json:"sort_order"`
		Active      *bool                `json:"active"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if strings.TrimSpace(body.Label) != "" {
		existing.Label = strings.TrimSpace(body.Label)
	}
	existing.Description = strings.TrimSpace(body.Description)
	existing.ProductID = strings.ToLower(strings.TrimSpace(body.ProductID))
	if body.Checkboxes != nil {
		existing.Checkboxes = normalizeCheckboxDefs(body.Checkboxes)
	}
	existing.SortOrder = body.SortOrder
	if body.Active != nil {
		existing.Active = *body.Active
	}
	existing.UpdatedAt = time.Now().UTC()
	if err := a.eoadmin.UpsertOption(r.Context(), existing); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eoadmin_option", "updated", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{"option": existing})
}

func (a *App) eoadminOptionsDeleteHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	admin := a.requireAdminRead(w, r)
	if admin == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	if err := a.eoadmin.DeactivateOption(r.Context(), id); err != nil {
		if errors.Is(err, errNotFound) {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eoadmin_option", "deactivated", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "id": id})
}

func normalizeCheckboxDefs(in []EoadminCheckboxDef) []EoadminCheckboxDef {
	out := make([]EoadminCheckboxDef, 0, len(in))
	seen := map[string]bool{}
	for _, c := range in {
		id := strings.ToLower(strings.TrimSpace(c.ID))
		label := strings.TrimSpace(c.Label)
		unit := strings.TrimSpace(c.UnitLabel)
		if id == "" || label == "" || seen[id] {
			continue
		}
		if unit == "" {
			unit = "units"
		}
		seen[id] = true
		out = append(out, EoadminCheckboxDef{ID: id, Label: label, UnitLabel: unit})
	}
	return out
}

func (a *App) eoadminStatementsCreateHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	a.eoadminEnsureSeed(r)

	if err := r.ParseMultipartForm(maxEoadminImageBytes + (1 << 20)); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	optionID := strings.TrimSpace(r.FormValue("option_id"))
	description := strings.TrimSpace(r.FormValue("description"))
	itemsRaw := strings.TrimSpace(r.FormValue("items"))
	svg := strings.TrimSpace(r.FormValue("svg"))
	amountRaw := r.FormValue("amount_rect")
	refRaw := r.FormValue("reference_rect")
	dateRaw := r.FormValue("date_rect")

	opt, err := a.eoadmin.GetOption(r.Context(), optionID)
	if err != nil || opt == nil || !opt.Active {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	var itemBodies []struct {
		CheckboxID string `json:"checkbox_id"`
		Units      int    `json:"units"`
	}
	if itemsRaw == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if err := json.Unmarshal([]byte(itemsRaw), &itemBodies); err != nil || len(itemBodies) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	boxByID := map[string]EoadminCheckboxDef{}
	for _, c := range opt.Checkboxes {
		boxByID[c.ID] = c
	}
	items := make([]EoadminSelectedItem, 0, len(itemBodies))
	for _, it := range itemBodies {
		id := strings.ToLower(strings.TrimSpace(it.CheckboxID))
		box, ok := boxByID[id]
		if !ok || it.Units < 1 || it.Units > 10000 {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		items = append(items, EoadminSelectedItem{
			CheckboxID: box.ID,
			Label:      box.Label,
			UnitLabel:  box.UnitLabel,
			Units:      it.Units,
		})
	}

	var fileData []byte
	var kind avatarKind
	file, header, fileErr := r.FormFile("file")
	hasFile := fileErr == nil && file != nil
	if hasFile {
		defer file.Close()
		_ = header
		limited := io.LimitReader(file, maxEoadminImageBytes+1)
		fileData, err = io.ReadAll(limited)
		if err != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		kind, err = detectEoadminImage(fileData)
		if err != nil {
			if errors.Is(err, errEoadminImageTooLarge) {
				a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
				return
			}
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
	}

	now := time.Now().UTC()
	stID := randomID(16)
	st := &EoadminStatement{
		ID:          stID,
		UserID:      user.ID,
		UserEmail:   user.Email,
		OptionID:    opt.ID,
		OptionLabel: opt.Label,
		ProductID:   opt.ProductID,
		Items:       items,
		Description: description,
		Status:      eoadminStatusPendingPayment,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if hasFile {
		amountRect, err := parseEoadminRectJSON(amountRaw)
		if err != nil || amountRect == nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		refRect, err := parseEoadminRectJSON(refRaw)
		if err != nil || refRect == nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		dateRect, err := parseEoadminRectJSON(dateRaw)
		if err != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		if svg == "" || len(svg) > 200_000 || !strings.Contains(strings.ToLower(svg), "<svg") {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		rel, err := newEoadminImageRel(user.ID, stID, kind.ext)
		if err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		if err := writeEoadminImage(a.cfg.MediaRoot, rel, fileData); err != nil {
			a.mustLogf(r, "eoadmin.image.write_error", "err", err.Error())
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		st.Rects = EoadminRects{Amount: *amountRect, Reference: *refRect, Date: dateRect}
		st.SVG = svg
		st.ImageKey = rel
		st.ImageContentType = kind.mime
		st.ImageBytes = int64(len(fileData))
		st.Status = eoadminStatusPendingApproval
	}

	if err := a.eoadmin.InsertStatement(r.Context(), st); err != nil {
		a.mustLogf(r, "eoadmin.statement.insert_error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eoadmin_statement", "created", user.ID)
	a.mustLogf(r, "eoadmin.statement.created", "statement_id", st.ID, "status", st.Status)
	a.eoadminNotifyAdmin(r, st)
	writeJSON(w, http.StatusOK, map[string]any{
		"statement":  statementPublic(st, true),
		"request_id": requestIDFrom(r, w),
	})
}

func statementPublic(st *EoadminStatement, includeSVG bool) map[string]any {
	if st == nil {
		return nil
	}
	out := map[string]any{
		"id":                    st.ID,
		"user_id":               st.UserID,
		"user_email":            st.UserEmail,
		"option_id":             st.OptionID,
		"option_label":          st.OptionLabel,
		"product_id":            st.ProductID,
		"eostore_company_guid":  st.EostoreCompanyGUID,
		"inventory_reserved":    st.InventoryReserved,
		"items":                 st.Items,
		"description":           st.Description,
		"rects":                 st.Rects,
		"has_image":             st.ImageKey != "",
		"image_url":             "",
		"status":                st.Status,
		"admin_note":            st.AdminNote,
		"approved_at":           st.ApprovedAt,
		"approved_by":           st.ApprovedBy,
		"delivered_at":          st.DeliveredAt,
		"delivered_by":          st.DeliveredBy,
		"created_at":            st.CreatedAt,
		"updated_at":            st.UpdatedAt,
	}
	if st.ImageKey != "" {
		out["image_url"] = "/api/eoadmin/statements/" + st.ID + "/image"
	}
	if includeSVG {
		out["svg"] = st.SVG
	}
	return out
}

func (a *App) eoadminStatementsListHandler(w http.ResponseWriter, r *http.Request) {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	if status != "" && !eoadminStatusKnown(status) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	adminAll := user.Role == roleAdmin
	rows, err := a.eoadmin.ListStatements(r.Context(), user.ID, status, adminAll)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	out := make([]map[string]any, 0, len(rows))
	for _, st := range rows {
		out = append(out, statementPublic(st, false))
	}
	a.mustLogf(r, "eoadmin.statements.list", "count", len(out), "admin", adminAll, "status", status)
	writeJSON(w, http.StatusOK, map[string]any{"statements": out, "count": len(out)})
}

func (a *App) eoadminStatementGetHandler(w http.ResponseWriter, r *http.Request) {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	st, err := a.eoadmin.GetStatement(r.Context(), strings.TrimSpace(r.PathValue("id")))
	if err != nil || st == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if user.Role != roleAdmin && st.UserID != user.ID {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"statement": statementPublic(st, true)})
}

func (a *App) eoadminStatementImageHandler(w http.ResponseWriter, r *http.Request) {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	st, err := a.eoadmin.GetStatement(r.Context(), strings.TrimSpace(r.PathValue("id")))
	if err != nil || st == nil || st.ImageKey == "" {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if user.Role != roleAdmin && st.UserID != user.ID {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	if !safeEoadminRel.MatchString(st.ImageKey) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	abs := filepath.Join(a.cfg.MediaRoot, filepath.FromSlash(st.ImageKey))
	data, err := os.ReadFile(abs)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	ctype := st.ImageContentType
	if ctype == "" {
		ctype = "application/octet-stream"
	}
	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	w.Header().Set("Cache-Control", "private, no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, bytes.NewReader(data))
}

func (a *App) eoadminCanTransition(st *EoadminStatement, next string) bool {
	if st == nil {
		return false
	}
	switch next {
	case eoadminStatusToDeliver:
		return st.Status == eoadminStatusPendingApproval || st.Status == eoadminStatusPendingPayment
	case eoadminStatusRejected:
		return st.Status == eoadminStatusPendingApproval || st.Status == eoadminStatusPendingPayment
	case eoadminStatusDelivered:
		return st.Status == eoadminStatusToDeliver
	default:
		return false
	}
}

func (a *App) eoadminGrantOnApprove(r *http.Request, st *EoadminStatement) {
	if st == nil || st.ProductID == "" || !knownService(st.ProductID) {
		return
	}
	months := 1
	for _, it := range st.Items {
		if it.CheckboxID == "months" && it.Units > months {
			months = it.Units
		}
	}
	if err := a.grantProducts(r.Context(), st.UserID, []string{st.ProductID}, "monthly", months); err != nil {
		a.mustLogf(r, "eoadmin.entitlement.error", "err", err.Error(), "product", st.ProductID)
		return
	}
	a.mustLogf(r, "eoadmin.entitlement.granted", "user_id", st.UserID, "product", st.ProductID, "months", months)
}

func (a *App) eoadminStatementApproveHandler(w http.ResponseWriter, r *http.Request) {
	a.eoadminStatementTransition(w, r, eoadminStatusToDeliver)
}

func (a *App) eoadminStatementRejectHandler(w http.ResponseWriter, r *http.Request) {
	a.eoadminStatementTransition(w, r, eoadminStatusRejected)
}

func (a *App) eoadminStatementDeliverHandler(w http.ResponseWriter, r *http.Request) {
	a.eoadminStatementTransition(w, r, eoadminStatusDelivered)
}

func (a *App) eoadminStatementTransition(w http.ResponseWriter, r *http.Request, next string) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	admin := a.requireAdminRead(w, r)
	if admin == nil {
		return
	}
	st, err := a.eoadmin.GetStatement(r.Context(), strings.TrimSpace(r.PathValue("id")))
	if err != nil || st == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if !a.eoadminCanTransition(st, next) {
		a.writeSafeError(w, r, http.StatusConflict, "conflict")
		return
	}
	var body struct {
		Note string `json:"note"`
	}
	_ = json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&body)
	now := time.Now().UTC()
	st.AdminNote = strings.TrimSpace(body.Note)
	st.Status = next
	st.UpdatedAt = now
	switch next {
	case eoadminStatusToDeliver:
		st.ApprovedAt = &now
		st.ApprovedBy = admin.ID
		a.eoadminGrantOnApprove(r, st)
	case eoadminStatusDelivered:
		st.DeliveredAt = &now
		st.DeliveredBy = admin.ID
	case eoadminStatusRejected:
		if st.InventoryReserved && st.EostoreCompanyGUID != "" {
			a.eostoreRestoreInventory(r.Context(), st.Items)
			st.InventoryReserved = false
			a.mustLogf(r, "eostore.inventory.restored", "statement_id", st.ID)
		}
	}
	if err := a.eoadmin.UpdateStatement(r.Context(), st); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eoadmin_statement", next, admin.ID)
	a.mustLogf(r, "eoadmin.statement.transition", "statement_id", st.ID, "status", next)
	writeJSON(w, http.StatusOK, map[string]any{"statement": statementPublic(st, true)})
}

func (a *App) registerEoadminRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/eoadmin/options", a.eoadminOptionsListHandler)
	mux.HandleFunc("POST /api/eoadmin/options", a.eoadminOptionsCreateHandler)
	mux.HandleFunc("PUT /api/eoadmin/options/{id}", a.eoadminOptionsUpdateHandler)
	mux.HandleFunc("DELETE /api/eoadmin/options/{id}", a.eoadminOptionsDeleteHandler)
	mux.HandleFunc("POST /api/eoadmin/statements", a.eoadminStatementsCreateHandler)
	mux.HandleFunc("GET /api/eoadmin/statements", a.eoadminStatementsListHandler)
	mux.HandleFunc("GET /api/eoadmin/statements/{id}", a.eoadminStatementGetHandler)
	mux.HandleFunc("GET /api/eoadmin/statements/{id}/image", a.eoadminStatementImageHandler)
	mux.HandleFunc("POST /api/eoadmin/statements/{id}/approve", a.eoadminStatementApproveHandler)
	mux.HandleFunc("POST /api/eoadmin/statements/{id}/reject", a.eoadminStatementRejectHandler)
	mux.HandleFunc("POST /api/eoadmin/statements/{id}/deliver", a.eoadminStatementDeliverHandler)
}
