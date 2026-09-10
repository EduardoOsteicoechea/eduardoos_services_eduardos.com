package main

import (
	"bytes"
	"encoding/json"
	"errors"
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
		if !a.validOrigin(r) || !a.validCSRF(r) {
			a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
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
	if err := r.ParseMultipartForm(maxEostoreImageBytes + (1 << 20)); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, maxEostoreImageBytes+1))
	if err != nil || len(data) == 0 || len(data) > maxEostoreImageBytes {
		a.writeSafeError(w, r, http.StatusBadRequest, "payload_too_large")
		return
	}
	kind, err := detectAvatar(data)
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
}
