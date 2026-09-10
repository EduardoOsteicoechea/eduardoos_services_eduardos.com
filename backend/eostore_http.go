package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

func (a *App) eostoreAdmin(w http.ResponseWriter, r *http.Request) *User {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		if !a.requireUnsafe(w, r) {
			return nil
		}
	}
	return a.requireAdminRead(w, r)
}

func (a *App) eostoreWriteStoreErr(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, errNotFound):
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
	case errors.Is(err, errConflict):
		a.writeSafeError(w, r, http.StatusConflict, "conflict")
	default:
		a.mustLogf(r, "eostore.store_error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
	}
}

func (a *App) eostoreCompaniesListHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	rows, err := a.eostore.ListCompanies(r.Context())
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.mustLogf(r, "eostore.companies.list", "count", len(rows), "admin_id", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{"companies": rows, "count": len(rows)})
}

func (a *App) eostoreCompaniesCreateHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	var body struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	name := strings.TrimSpace(body.Name)
	friendly := normalizeEostoreFriendlyID(body.ID)
	if friendly == "" {
		friendly = normalizeEostoreFriendlyID(name)
	}
	if name == "" || !eostoreFriendlyIDValid(friendly) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	now := time.Now().UTC()
	c := &EostoreCompany{
		GUID:        newEostoreGUID(),
		FriendlyID:  friendly,
		Name:        name,
		Description: strings.TrimSpace(body.Description),
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := a.eostore.InsertCompany(r.Context(), c); err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.auditEvent(r, "eostore_company", "created", admin.ID)
	a.mustLogf(r, "eostore.companies.create", "guid", c.GUID, "id", c.FriendlyID)
	writeJSON(w, http.StatusOK, map[string]any{"company": c})
}

func (a *App) eostoreCompaniesUpdateHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	existing, err := a.eostore.GetCompany(r.Context(), strings.TrimSpace(r.PathValue("guid")))
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	var body struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if strings.TrimSpace(body.Name) != "" {
		existing.Name = strings.TrimSpace(body.Name)
	}
	if strings.TrimSpace(body.ID) != "" {
		friendly := normalizeEostoreFriendlyID(body.ID)
		if !eostoreFriendlyIDValid(friendly) {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		existing.FriendlyID = friendly
	}
	existing.Description = strings.TrimSpace(body.Description)
	existing.UpdatedAt = time.Now().UTC()
	if err := a.eostore.UpdateCompany(r.Context(), existing); err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.auditEvent(r, "eostore_company", "updated", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{"company": existing})
}

func (a *App) eostoreCompaniesDeleteHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	if err := a.eostore.DeleteCompany(r.Context(), strings.TrimSpace(r.PathValue("guid"))); err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.auditEvent(r, "eostore_company", "deleted", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) eostoreSectionsListHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	companyGUID := strings.TrimSpace(r.URL.Query().Get("company_guid"))
	rows, err := a.eostore.ListSections(r.Context(), companyGUID)
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.mustLogf(r, "eostore.sections.list", "count", len(rows), "company_guid", companyGUID)
	writeJSON(w, http.StatusOK, map[string]any{"sections": rows, "count": len(rows)})
}

func (a *App) eostoreSectionsCreateHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	var body struct {
		CompanyGUID string `json:"company_guid"`
		ID          string `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	company, err := a.eostore.GetCompany(r.Context(), strings.TrimSpace(body.CompanyGUID))
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	name := strings.TrimSpace(body.Name)
	friendly := normalizeEostoreFriendlyID(body.ID)
	if friendly == "" {
		friendly = normalizeEostoreFriendlyID(name)
	}
	if name == "" || !eostoreFriendlyIDValid(friendly) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	now := time.Now().UTC()
	sec := &EostoreSection{
		GUID:        newEostoreGUID(),
		FriendlyID:  friendly,
		CompanyGUID: company.GUID,
		Name:        name,
		Description: strings.TrimSpace(body.Description),
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := a.eostore.InsertSection(r.Context(), sec); err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.auditEvent(r, "eostore_section", "created", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{"section": sec})
}

func (a *App) eostoreSectionsUpdateHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	existing, err := a.eostore.GetSection(r.Context(), strings.TrimSpace(r.PathValue("guid")))
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	var body struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if strings.TrimSpace(body.Name) != "" {
		existing.Name = strings.TrimSpace(body.Name)
	}
	if strings.TrimSpace(body.ID) != "" {
		friendly := normalizeEostoreFriendlyID(body.ID)
		if !eostoreFriendlyIDValid(friendly) {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		existing.FriendlyID = friendly
	}
	existing.Description = strings.TrimSpace(body.Description)
	existing.UpdatedAt = time.Now().UTC()
	if err := a.eostore.UpdateSection(r.Context(), existing); err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.auditEvent(r, "eostore_section", "updated", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{"section": existing})
}

func (a *App) eostoreSectionsDeleteHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	if err := a.eostore.DeleteSection(r.Context(), strings.TrimSpace(r.PathValue("guid"))); err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.auditEvent(r, "eostore_section", "deleted", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) eostoreTypesListHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	companyGUID := strings.TrimSpace(r.URL.Query().Get("company_guid"))
	sectionGUID := strings.TrimSpace(r.URL.Query().Get("section_guid"))
	rows, err := a.eostore.ListTypes(r.Context(), companyGUID, sectionGUID)
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.mustLogf(r, "eostore.types.list", "count", len(rows))
	writeJSON(w, http.StatusOK, map[string]any{"types": rows, "count": len(rows)})
}

func (a *App) eostoreTypesCreateHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	var body struct {
		SectionGUID string `json:"section_guid"`
		ID          string `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	sec, err := a.eostore.GetSection(r.Context(), strings.TrimSpace(body.SectionGUID))
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	name := strings.TrimSpace(body.Name)
	friendly := normalizeEostoreFriendlyID(body.ID)
	if friendly == "" {
		friendly = normalizeEostoreFriendlyID(name)
	}
	if name == "" || !eostoreFriendlyIDValid(friendly) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	now := time.Now().UTC()
	typ := &EostoreType{
		GUID:        newEostoreGUID(),
		FriendlyID:  friendly,
		CompanyGUID: sec.CompanyGUID,
		SectionGUID: sec.GUID,
		Name:        name,
		Description: strings.TrimSpace(body.Description),
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := a.eostore.InsertType(r.Context(), typ); err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.auditEvent(r, "eostore_type", "created", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{"type": typ})
}

func (a *App) eostoreTypesUpdateHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	existing, err := a.eostore.GetType(r.Context(), strings.TrimSpace(r.PathValue("guid")))
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	var body struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if strings.TrimSpace(body.Name) != "" {
		existing.Name = strings.TrimSpace(body.Name)
	}
	if strings.TrimSpace(body.ID) != "" {
		friendly := normalizeEostoreFriendlyID(body.ID)
		if !eostoreFriendlyIDValid(friendly) {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		existing.FriendlyID = friendly
	}
	existing.Description = strings.TrimSpace(body.Description)
	existing.UpdatedAt = time.Now().UTC()
	if err := a.eostore.UpdateType(r.Context(), existing); err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.auditEvent(r, "eostore_type", "updated", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{"type": existing})
}

func (a *App) eostoreTypesDeleteHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	if err := a.eostore.DeleteType(r.Context(), strings.TrimSpace(r.PathValue("guid"))); err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.auditEvent(r, "eostore_type", "deleted", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) eostoreProductsListHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	companyGUID := strings.TrimSpace(r.URL.Query().Get("company_guid"))
	sectionGUID := strings.TrimSpace(r.URL.Query().Get("section_guid"))
	typeGUID := strings.TrimSpace(r.URL.Query().Get("type_guid"))
	rows, err := a.eostore.ListProducts(r.Context(), companyGUID, sectionGUID, typeGUID)
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	out := make([]map[string]any, 0, len(rows))
	for _, p := range rows {
		out = append(out, eostoreProductView(p))
	}
	a.mustLogf(r, "eostore.products.list", "count", len(out))
	writeJSON(w, http.StatusOK, map[string]any{"products": out, "count": len(out)})
}

func (a *App) eostoreProductsGetHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	p, err := a.eostore.GetProduct(r.Context(), strings.TrimSpace(r.PathValue("guid")))
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"product": eostoreProductView(p)})
}

type eostoreProductBody struct {
	TypeGUID         string   `json:"type_guid"`
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	Description      string   `json:"description"`
	Hashtags         []string `json:"hashtags"`
	PriceBaseUSD     float64  `json:"price_base_usd"`
	DiscountPercent  *int     `json:"discount_percent"`
	BsPerUSD         float64  `json:"bs_per_usd"`
	Units            *int     `json:"units"`
	Visible          *bool    `json:"visible"`
}

func (a *App) eostoreProductsCreateHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	var body eostoreProductBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 256<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	typ, err := a.eostore.GetType(r.Context(), strings.TrimSpace(body.TypeGUID))
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	name := strings.TrimSpace(body.Name)
	friendly := normalizeEostoreFriendlyID(body.ID)
	if friendly == "" {
		friendly = normalizeEostoreFriendlyID(name)
	}
	discount := 0
	if body.DiscountPercent != nil {
		discount = *body.DiscountPercent
	}
	units := 0
	if body.Units != nil {
		units = *body.Units
	}
	visible := false
	if body.Visible != nil {
		visible = *body.Visible
	}
	if name == "" || !eostoreFriendlyIDValid(friendly) || body.PriceBaseUSD < 0 || body.BsPerUSD < 0 || units < 0 || !eostoreDiscountValid(discount) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	now := time.Now().UTC()
	p := &EostoreProduct{
		GUID:            newEostoreGUID(),
		FriendlyID:      friendly,
		CompanyGUID:     typ.CompanyGUID,
		SectionGUID:     typ.SectionGUID,
		TypeGUID:        typ.GUID,
		Name:            name,
		Description:     strings.TrimSpace(body.Description),
		Hashtags:        normalizeEostoreHashtags(body.Hashtags),
		Images:          []EostoreImage{},
		PriceBaseUSD:    body.PriceBaseUSD,
		DiscountPercent: discount,
		BsPerUSD:        body.BsPerUSD,
		Units:           units,
		Visible:         visible,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if err := a.eostore.InsertProduct(r.Context(), p); err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.auditEvent(r, "eostore_product", "created", admin.ID)
	a.mustLogf(r, "eostore.products.create", "guid", p.GUID, "id", p.FriendlyID)
	writeJSON(w, http.StatusOK, map[string]any{"product": eostoreProductView(p)})
}

func (a *App) eostoreProductsUpdateHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	existing, err := a.eostore.GetProduct(r.Context(), strings.TrimSpace(r.PathValue("guid")))
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	var body eostoreProductBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 256<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if strings.TrimSpace(body.Name) != "" {
		existing.Name = strings.TrimSpace(body.Name)
	}
	if strings.TrimSpace(body.ID) != "" {
		friendly := normalizeEostoreFriendlyID(body.ID)
		if !eostoreFriendlyIDValid(friendly) {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		existing.FriendlyID = friendly
	}
	existing.Description = strings.TrimSpace(body.Description)
	if body.Hashtags != nil {
		existing.Hashtags = normalizeEostoreHashtags(body.Hashtags)
	}
	if body.PriceBaseUSD >= 0 {
		existing.PriceBaseUSD = body.PriceBaseUSD
	}
	if body.DiscountPercent != nil {
		if !eostoreDiscountValid(*body.DiscountPercent) {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		existing.DiscountPercent = *body.DiscountPercent
	}
	if body.BsPerUSD >= 0 {
		existing.BsPerUSD = body.BsPerUSD
	}
	if body.Units != nil {
		if *body.Units < 0 {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		existing.Units = *body.Units
	}
	if body.Visible != nil {
		existing.Visible = *body.Visible
	}
	if strings.TrimSpace(body.TypeGUID) != "" && body.TypeGUID != existing.TypeGUID {
		typ, err := a.eostore.GetType(r.Context(), strings.TrimSpace(body.TypeGUID))
		if err != nil {
			a.eostoreWriteStoreErr(w, r, err)
			return
		}
		existing.TypeGUID = typ.GUID
		existing.SectionGUID = typ.SectionGUID
		existing.CompanyGUID = typ.CompanyGUID
	}
	existing.UpdatedAt = time.Now().UTC()
	if err := a.eostore.UpdateProduct(r.Context(), existing); err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.auditEvent(r, "eostore_product", "updated", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{"product": eostoreProductView(existing)})
}

func (a *App) eostoreProductsDeleteHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	guid := strings.TrimSpace(r.PathValue("guid"))
	p, err := a.eostore.GetProduct(r.Context(), guid)
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	for _, img := range p.Images {
		_ = a.eostoreDeleteImageFile(img.Key)
	}
	if err := a.eostore.DeleteProduct(r.Context(), guid); err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.auditEvent(r, "eostore_product", "deleted", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func writeEostoreImage(mediaRoot, rel string, data []byte) error {
	if !safeEostoreRel.MatchString(rel) {
		return errAvatarInvalid
	}
	abs := filepath.Join(mediaRoot, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(abs), 0750); err != nil {
		return err
	}
	tmpDir := filepath.Join(filepath.Dir(mediaRoot), "eostore-tmp")
	if err := os.MkdirAll(tmpDir, 0750); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(tmpDir, "eostore-*")
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

func detectEostoreImage(data []byte) (avatarKind, error) {
	if len(data) > maxEostoreImageBytes {
		return avatarKind{}, errAvatarTooLarge
	}
	if len(data) < 12 {
		return avatarKind{}, errAvatarInvalid
	}
	kind, err := sniffImage(data)
	if err != nil {
		return avatarKind{}, err
	}
	cfg, err := decodeConfig(data, kind.mime)
	if err != nil {
		return avatarKind{}, errAvatarInvalid
	}
	if cfg.Width <= 0 || cfg.Height <= 0 || cfg.Width > maxEostoreImageEdge || cfg.Height > maxEostoreImageEdge {
		return avatarKind{}, errAvatarTooLarge
	}
	return kind, nil
}

func (a *App) eostoreDeleteImageFile(rel string) error {
	if !safeEostoreRel.MatchString(rel) {
		return nil
	}
	abs := filepath.Join(a.cfg.MediaRoot, filepath.FromSlash(rel))
	return os.Remove(abs)
}

func newEostoreImageRel(productGUID, imageID, ext string) (string, error) {
	rel := eostoreMediaPrefix + "/" + productGUID + "/" + imageID + ext
	if !safeEostoreRel.MatchString(rel) {
		return "", errAvatarInvalid
	}
	return rel, nil
}

func (a *App) eostoreProductImageUploadHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	guid := strings.TrimSpace(r.PathValue("guid"))
	p, err := a.eostore.GetProduct(r.Context(), guid)
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	if len(p.Images) >= maxEostoreImages {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxEostoreImageBytes+(1<<20))
	if err := r.ParseMultipartForm(maxEostoreImageBytes + (1 << 20)); err != nil {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, maxEostoreImageBytes+1))
	if err != nil || len(data) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if len(data) > maxEostoreImageBytes {
		a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
		return
	}
	kind, err := detectEostoreImage(data)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	imageID := randomID(12)
	rel, err := newEostoreImageRel(p.GUID, imageID, kind.ext)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if err := writeEostoreImage(a.cfg.MediaRoot, rel, data); err != nil {
		a.mustLogf(r, "eostore.image.write_error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	now := time.Now().UTC()
	img := EostoreImage{
		ID:          imageID,
		Key:         rel,
		ContentType: kind.mime,
		Bytes:       int64(len(data)),
		CreatedAt:   now,
	}
	p.Images = append(p.Images, img)
	p.UpdatedAt = now
	if err := a.eostore.UpdateProduct(r.Context(), p); err != nil {
		_ = a.eostoreDeleteImageFile(rel)
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.auditEvent(r, "eostore_product_image", "uploaded", admin.ID)
	a.mustLogf(r, "eostore.products.image_upload", "product_guid", p.GUID, "image_id", imageID)
	writeJSON(w, http.StatusOK, map[string]any{"product": eostoreProductView(p)})
}

func (a *App) eostoreProductImageGetHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	p, err := a.eostore.GetProduct(r.Context(), strings.TrimSpace(r.PathValue("guid")))
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	imageID := strings.TrimSpace(r.PathValue("imageId"))
	var found *EostoreImage
	for i := range p.Images {
		if p.Images[i].ID == imageID {
			found = &p.Images[i]
			break
		}
	}
	if found == nil || !safeEostoreRel.MatchString(found.Key) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	abs := filepath.Join(a.cfg.MediaRoot, filepath.FromSlash(found.Key))
	data, err := os.ReadFile(abs)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	ctype := found.ContentType
	if ctype == "" {
		ctype = "application/octet-stream"
	}
	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Content-Length", strconv.Itoa(len(data)))
	w.Header().Set("Cache-Control", "private, no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, bytes.NewReader(data))
}

func (a *App) eostoreProductImageDeleteHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	p, err := a.eostore.GetProduct(r.Context(), strings.TrimSpace(r.PathValue("guid")))
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	imageID := strings.TrimSpace(r.PathValue("imageId"))
	kept := make([]EostoreImage, 0, len(p.Images))
	var removed *EostoreImage
	for _, img := range p.Images {
		if img.ID == imageID {
			cp := img
			removed = &cp
			continue
		}
		kept = append(kept, img)
	}
	if removed == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	p.Images = kept
	p.UpdatedAt = time.Now().UTC()
	if err := a.eostore.UpdateProduct(r.Context(), p); err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	_ = a.eostoreDeleteImageFile(removed.Key)
	a.auditEvent(r, "eostore_product_image", "deleted", admin.ID)
	writeJSON(w, http.StatusOK, map[string]any{"product": eostoreProductView(p)})
}

const (
	eostoreDescribeMinWords = 25
	eostoreDescribeMaxWords = 1000
)

func eostoreDescribeSystemPrompt() string {
	return strings.TrimSpace(`You write product descriptions for an online store, for everyday shoppers (not technicians).

Goals:
- Sound warm, clear, and trustworthy.
- Help the reader picture owning or using the product.
- Spark desire to buy without pressure, hype, or fake urgency.
- Stay honest: only describe what the photo and catalog context support.

Style:
- Short sentences and plain words a non-expert understands.
- Friendly conversational tone; no jargon, no specs dump, no markdown headings, no bullet lists unless a short list feels natural.
- Do not invent brands, prices, discounts, certifications, materials, or features you cannot see or infer from the context.
- Match the language of the product and company names; if unclear, write in Spanish.
- Stay close to the requested word count.`)
}

func eostoreDescribeUserPrompt(company, section, typ, product string, words int) string {
	return fmt.Sprintf(
		"Write a product description of about %d words that a regular shopper would enjoy reading and that makes them want this product.\n\nCompany: %s\nSection: %s\nProduct type: %s\nProduct name: %s\n\nLook at the attached product photo. Describe what stands out, how it would feel or fit into daily life, and why someone would choose it — without inventing facts that are not visible or given above.",
		words,
		strings.TrimSpace(company),
		strings.TrimSpace(section),
		strings.TrimSpace(typ),
		strings.TrimSpace(product),
	)
}

func eostoreDescribeMaxTokens(words int) int {
	// Spanish/English ~1.4–1.8 tokens per word; leave headroom.
	n := words*2 + 64
	if n < 128 {
		n = 128
	}
	if n > 4096 {
		n = 4096
	}
	return n
}

func (a *App) eostoreProductDescribeHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	guid := strings.TrimSpace(r.PathValue("guid"))
	p, err := a.eostore.GetProduct(r.Context(), guid)
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	if len(p.Images) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body struct {
		WordCount int    `json:"word_count"`
		ImageID   string `json:"image_id"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	words := body.WordCount
	if words < eostoreDescribeMinWords || words > eostoreDescribeMaxWords {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if !a.aiAdminLimit.allow(admin.ID) {
		a.auditEventExtra(r, "eostore_describe", "rate_limited", admin.ID, "deepseek", words)
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}

	var img *EostoreImage
	wantID := strings.TrimSpace(body.ImageID)
	for i := range p.Images {
		if wantID != "" && p.Images[i].ID == wantID {
			img = &p.Images[i]
			break
		}
	}
	if img == nil {
		if wantID != "" {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		// Prefer the most recently uploaded image.
		img = &p.Images[len(p.Images)-1]
	}
	if !safeEostoreRel.MatchString(img.Key) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	abs := filepath.Join(a.cfg.MediaRoot, filepath.FromSlash(img.Key))
	data, err := os.ReadFile(abs)
	if err != nil || len(data) == 0 {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	mime := strings.TrimSpace(img.ContentType)
	if mime == "" {
		mime = "image/jpeg"
	}

	companyName, sectionName, typeName := p.CompanyGUID, p.SectionGUID, p.TypeGUID
	if co, err := a.eostore.GetCompany(r.Context(), p.CompanyGUID); err == nil && co != nil {
		companyName = co.Name
	}
	if sec, err := a.eostore.GetSection(r.Context(), p.SectionGUID); err == nil && sec != nil {
		sectionName = sec.Name
	}
	if typ, err := a.eostore.GetType(r.Context(), p.TypeGUID); err == nil && typ != nil {
		typeName = typ.Name
	}

	client, ok := a.chat["deepseek"]
	if !ok || client == nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	vision, ok := client.(VisionChatClient)
	if !ok {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}

	system := eostoreDescribeSystemPrompt()
	prompt := eostoreDescribeUserPrompt(companyName, sectionName, typeName, p.Name, words)
	a.mustLogf(r, "eostore.describe.start",
		"product_guid", p.GUID,
		"image_id", img.ID,
		"words", words,
		"company_len", len(companyName),
		"section_len", len(sectionName),
		"type_len", len(typeName),
		"product_len", len(p.Name),
		"bytes", len(data),
	)

	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()
	result, err := vision.CompleteVision(ctx, system, prompt, mime, data, eostoreDescribeMaxTokens(words))
	if err != nil {
		a.mustLogf(r, "eostore.describe.error", "err", err.Error())
		a.auditEventExtra(r, "eostore_describe", "failed", admin.ID, "deepseek", words)
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	desc := sanitizeModelTextMax(result.Text, 12000)
	if desc == "" {
		a.auditEventExtra(r, "eostore_describe", "failed", admin.ID, "deepseek", words)
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	p.Description = desc
	p.UpdatedAt = time.Now().UTC()
	if err := a.eostore.UpdateProduct(r.Context(), p); err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.auditEventExtra(r, "eostore_describe", "ok", admin.ID, "deepseek", words)
	a.mustLogf(r, "eostore.describe.ok",
		"product_guid", p.GUID,
		"image_id", img.ID,
		"desc_len", len(desc),
		"prompt_tokens", result.Usage.PromptTokens,
		"completion_tokens", result.Usage.CompletionTokens,
	)
	writeJSON(w, http.StatusOK, map[string]any{
		"product":     eostoreProductView(p),
		"description": desc,
		"word_count":  words,
		"image_id":    img.ID,
	})
}

func (a *App) registerEostoreRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/eostore/companies", a.eostoreCompaniesListHandler)
	mux.HandleFunc("POST /api/eostore/companies", a.eostoreCompaniesCreateHandler)
	mux.HandleFunc("PUT /api/eostore/companies/{guid}", a.eostoreCompaniesUpdateHandler)
	mux.HandleFunc("DELETE /api/eostore/companies/{guid}", a.eostoreCompaniesDeleteHandler)

	mux.HandleFunc("GET /api/eostore/sections", a.eostoreSectionsListHandler)
	mux.HandleFunc("POST /api/eostore/sections", a.eostoreSectionsCreateHandler)
	mux.HandleFunc("PUT /api/eostore/sections/{guid}", a.eostoreSectionsUpdateHandler)
	mux.HandleFunc("DELETE /api/eostore/sections/{guid}", a.eostoreSectionsDeleteHandler)

	mux.HandleFunc("GET /api/eostore/types", a.eostoreTypesListHandler)
	mux.HandleFunc("POST /api/eostore/types", a.eostoreTypesCreateHandler)
	mux.HandleFunc("PUT /api/eostore/types/{guid}", a.eostoreTypesUpdateHandler)
	mux.HandleFunc("DELETE /api/eostore/types/{guid}", a.eostoreTypesDeleteHandler)

	mux.HandleFunc("GET /api/eostore/products", a.eostoreProductsListHandler)
	mux.HandleFunc("POST /api/eostore/products", a.eostoreProductsCreateHandler)
	mux.HandleFunc("GET /api/eostore/products/{guid}", a.eostoreProductsGetHandler)
	mux.HandleFunc("PUT /api/eostore/products/{guid}", a.eostoreProductsUpdateHandler)
	mux.HandleFunc("DELETE /api/eostore/products/{guid}", a.eostoreProductsDeleteHandler)
	mux.HandleFunc("POST /api/eostore/products/{guid}/images", a.eostoreProductImageUploadHandler)
	mux.HandleFunc("GET /api/eostore/products/{guid}/images/{imageId}", a.eostoreProductImageGetHandler)
	mux.HandleFunc("DELETE /api/eostore/products/{guid}/images/{imageId}", a.eostoreProductImageDeleteHandler)
	mux.HandleFunc("POST /api/eostore/products/{guid}/describe", a.eostoreProductDescribeHandler)
}
