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

func (a *App) eostoreResolveCompany(ctx context.Context, idOrGUID string) (*EostoreCompany, error) {
	idOrGUID = strings.TrimSpace(idOrGUID)
	if idOrGUID == "" {
		return nil, errNotFound
	}
	if c, err := a.eostore.GetCompany(ctx, idOrGUID); err == nil && c != nil {
		return c, nil
	}
	return a.eostore.GetCompanyByFriendlyID(ctx, normalizeEostoreFriendlyID(idOrGUID))
}

func eostorePublicProductView(p *EostoreProduct) map[string]any {
	view := eostoreProductView(p)
	if p == nil {
		return view
	}
	images := make([]map[string]any, 0, len(p.Images))
	for _, img := range p.Images {
		images = append(images, map[string]any{
			"id":  img.ID,
			"url": fmt.Sprintf("/api/eostore/public/products/%s/images/%s", p.GUID, img.ID),
		})
	}
	view["images"] = images
	return view
}

func (a *App) eostorePublicCompaniesHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := a.eostore.ListCompanies(r.Context())
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.mustLogf(r, "eostore.public.companies", "count", len(rows))
	writeJSON(w, http.StatusOK, map[string]any{"companies": rows, "count": len(rows)})
}

func (a *App) eostorePublicCatalogHandler(w http.ResponseWriter, r *http.Request) {
	company, err := a.eostoreResolveCompany(r.Context(), r.PathValue("companyId"))
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	sections, err := a.eostore.ListSections(r.Context(), company.GUID)
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	types, err := a.eostore.ListTypes(r.Context(), company.GUID, "")
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	products, err := a.eostore.ListProducts(r.Context(), company.GUID, "", "")
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	visible := make([]map[string]any, 0)
	for _, p := range products {
		if p == nil || !p.Visible {
			continue
		}
		visible = append(visible, eostorePublicProductView(p))
	}
	a.mustLogf(r, "eostore.public.catalog", "company", company.FriendlyID, "products", len(visible))
	writeJSON(w, http.StatusOK, map[string]any{
		"company":  company,
		"sections": sections,
		"types":    types,
		"products": visible,
		"count":    len(visible),
	})
}

func (a *App) eostorePublicProductImageHandler(w http.ResponseWriter, r *http.Request) {
	p, err := a.eostore.GetProduct(r.Context(), strings.TrimSpace(r.PathValue("guid")))
	if err != nil || p == nil || !p.Visible {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
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
	w.Header().Set("Cache-Control", "public, max-age=3600")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, bytes.NewReader(data))
}

func (a *App) eostoreCartView(ctx context.Context, cart *EostoreCart) map[string]any {
	lines := make([]map[string]any, 0, len(cart.Items))
	totalUSD := 0.0
	totalBs := 0.0
	for _, it := range cart.Items {
		p, err := a.eostore.GetProduct(ctx, it.ProductGUID)
		if err != nil || p == nil {
			continue
		}
		lineUSD := p.priceFinalUSD() * float64(it.Units)
		lineBs := p.priceBs() * float64(it.Units)
		totalUSD += lineUSD
		totalBs += lineBs
		lines = append(lines, map[string]any{
			"product_guid":     p.GUID,
			"product_id":       p.FriendlyID,
			"name":             p.Name,
			"units":            it.Units,
			"max_units":        p.Units,
			"unit_price_usd":   roundMoney(p.priceFinalUSD()),
			"line_total_usd":   roundMoney(lineUSD),
			"line_total_bs":    roundMoney(lineBs),
			"visible":          p.Visible,
			"image_url":        firstPublicProductImage(p),
		})
	}
	return map[string]any{
		"company_guid": cart.CompanyGUID,
		"items":        lines,
		"count":        len(lines),
		"total_usd":    roundMoney(totalUSD),
		"total_bs":     roundMoney(totalBs),
		"updated_at":   cart.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func firstPublicProductImage(p *EostoreProduct) string {
	if p == nil || len(p.Images) == 0 {
		return ""
	}
	return fmt.Sprintf("/api/eostore/public/products/%s/images/%s", p.GUID, p.Images[0].ID)
}

func (a *App) eostoreCartGetHandler(w http.ResponseWriter, r *http.Request) {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	company, err := a.eostoreResolveCompany(r.Context(), r.PathValue("companyId"))
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	cart, err := a.eostoreCart.GetCart(r.Context(), user.ID, company.GUID)
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"cart": a.eostoreCartView(r.Context(), cart), "company": company})
}

func (a *App) eostoreCartPutHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	company, err := a.eostoreResolveCompany(r.Context(), r.PathValue("companyId"))
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	var body struct {
		ProductGUID string `json:"product_guid"`
		Units       int    `json:"units"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	productGUID := strings.TrimSpace(body.ProductGUID)
	p, err := a.eostore.GetProduct(r.Context(), productGUID)
	if err != nil || p == nil || !p.Visible || p.CompanyGUID != company.GUID {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if body.Units < 0 || body.Units > p.Units {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	cart, err := a.eostoreCart.GetCart(r.Context(), user.ID, company.GUID)
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	next := make([]EostoreCartItem, 0, len(cart.Items)+1)
	found := false
	for _, it := range cart.Items {
		if it.ProductGUID == productGUID {
			found = true
			if body.Units > 0 {
				next = append(next, EostoreCartItem{ProductGUID: productGUID, Units: body.Units})
			}
			continue
		}
		next = append(next, it)
	}
	if !found && body.Units > 0 {
		next = append(next, EostoreCartItem{ProductGUID: productGUID, Units: body.Units})
	}
	cart.Items = next
	cart.UpdatedAt = time.Now().UTC()
	if err := a.eostoreCart.UpsertCart(r.Context(), cart); err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	a.auditEvent(r, "eostore_cart", "updated", user.ID)
	a.mustLogf(r, "eostore.cart.put", "company", company.FriendlyID, "product", productGUID, "units", body.Units)
	writeJSON(w, http.StatusOK, map[string]any{"cart": a.eostoreCartView(r.Context(), cart), "company": company})
}

func (a *App) eostoreReserveInventory(ctx context.Context, items []EoadminSelectedItem) error {
	for _, it := range items {
		if it.EostoreProductGUID == "" {
			continue
		}
		p, err := a.eostore.GetProduct(ctx, it.EostoreProductGUID)
		if err != nil || p == nil {
			return errNotFound
		}
		if it.Units < 1 || it.Units > p.Units || !p.Visible {
			return errConflict
		}
		p.Units -= it.Units
		p.UpdatedAt = time.Now().UTC()
		if err := a.eostore.UpdateProduct(ctx, p); err != nil {
			return err
		}
	}
	return nil
}

func (a *App) eostoreRestoreInventory(ctx context.Context, items []EoadminSelectedItem) {
	for _, it := range items {
		if it.EostoreProductGUID == "" || it.Units < 1 {
			continue
		}
		p, err := a.eostore.GetProduct(ctx, it.EostoreProductGUID)
		if err != nil || p == nil {
			continue
		}
		p.Units += it.Units
		p.UpdatedAt = time.Now().UTC()
		_ = a.eostore.UpdateProduct(ctx, p)
	}
}

func (a *App) eostoreEnsureCompanyOption(ctx context.Context, company *EostoreCompany, lines []EoadminSelectedItem) (*EoadminOption, error) {
	id := "eostore-" + company.FriendlyID
	boxes := make([]EoadminCheckboxDef, 0, len(lines))
	for _, line := range lines {
		boxes = append(boxes, EoadminCheckboxDef{
			ID:        line.CheckboxID,
			Label:     line.Label,
			UnitLabel: "units",
		})
	}
	now := time.Now().UTC()
	opt := &EoadminOption{
		ID:          id,
		Label:       company.Name + " store order",
		Description: "Checkout from eostore cart for " + company.Name,
		ProductID:   "eostore",
		Checkboxes:  boxes,
		Active:      true,
		SortOrder:   500,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if existing, err := a.eoadmin.GetOption(ctx, id); err == nil && existing != nil {
		opt.CreatedAt = existing.CreatedAt
		opt.SortOrder = existing.SortOrder
	}
	if err := a.eoadmin.UpsertOption(ctx, opt); err != nil {
		return nil, err
	}
	return opt, nil
}

func (a *App) eostoreCartCheckoutHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	company, err := a.eostoreResolveCompany(r.Context(), r.PathValue("companyId"))
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	var body struct {
		Description string `json:"description"`
	}
	_ = json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&body)

	cart, err := a.eostoreCart.GetCart(r.Context(), user.ID, company.GUID)
	if err != nil {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	if len(cart.Items) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	lines := make([]EoadminSelectedItem, 0, len(cart.Items))
	descParts := make([]string, 0, len(cart.Items))
	totalUSD := 0.0
	for _, it := range cart.Items {
		p, err := a.eostore.GetProduct(r.Context(), it.ProductGUID)
		if err != nil || p == nil || !p.Visible || p.CompanyGUID != company.GUID {
			a.writeSafeError(w, r, http.StatusConflict, "conflict")
			return
		}
		if it.Units < 1 || it.Units > p.Units {
			a.writeSafeError(w, r, http.StatusConflict, "conflict")
			return
		}
		unit := p.priceFinalUSD()
		totalUSD += unit * float64(it.Units)
		cbID := "p-" + p.FriendlyID
		if len(cbID) > 48 {
			cbID = "p-" + p.GUID[:12]
		}
		lines = append(lines, EoadminSelectedItem{
			CheckboxID:         cbID,
			Label:              p.Name,
			UnitLabel:          "units",
			Units:              it.Units,
			EostoreProductGUID: p.GUID,
			UnitPriceUSD:       roundMoney(unit),
		})
		descParts = append(descParts, fmt.Sprintf("%s × %d ($%.2f ea)", p.Name, it.Units, unit))
	}

	opt, err := a.eostoreEnsureCompanyOption(r.Context(), company, lines)
	if err != nil {
		a.mustLogf(r, "eostore.checkout.option_error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if err := a.eostoreReserveInventory(r.Context(), lines); err != nil {
		if errors.Is(err, errConflict) || errors.Is(err, errNotFound) {
			a.writeSafeError(w, r, http.StatusConflict, "conflict")
			return
		}
		a.eostoreWriteStoreErr(w, r, err)
		return
	}

	now := time.Now().UTC()
	note := strings.TrimSpace(body.Description)
	autoDesc := fmt.Sprintf("eostore order · %s · total $%.2f USD\n%s", company.Name, totalUSD, strings.Join(descParts, "\n"))
	if note != "" {
		autoDesc = note + "\n\n" + autoDesc
	}
	st := &EoadminStatement{
		ID:                 randomID(16),
		UserID:             user.ID,
		UserEmail:          user.Email,
		OptionID:           opt.ID,
		OptionLabel:        opt.Label,
		ProductID:          "eostore",
		EostoreCompanyGUID: company.GUID,
		InventoryReserved:  true,
		Items:              lines,
		Description:        autoDesc,
		Status:             eoadminStatusPendingPayment,
		CreatedAt:          now,
		UpdatedAt:          now,
	}
	if err := a.eoadmin.InsertStatement(r.Context(), st); err != nil {
		a.eostoreRestoreInventory(r.Context(), lines)
		a.mustLogf(r, "eostore.checkout.insert_error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	_ = a.eostoreCart.DeleteCart(r.Context(), user.ID, company.GUID)
	a.eoadminNotifyAdmin(r, st)
	a.auditEvent(r, "eostore_checkout", "created", user.ID)
	a.mustLogf(r, "eostore.checkout.ok", "statement_id", st.ID, "company", company.FriendlyID, "lines", len(lines))
	writeJSON(w, http.StatusOK, map[string]any{
		"statement":    statementPublic(st, false),
		"statement_id": st.ID,
		"redirect":     "/eoadmin/mine",
	})
}

func (a *App) registerEostoreShopRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/eostore/public/companies", a.eostorePublicCompaniesHandler)
	mux.HandleFunc("GET /api/eostore/public/companies/{companyId}", a.eostorePublicCatalogHandler)
	mux.HandleFunc("GET /api/eostore/public/products/{guid}/images/{imageId}", a.eostorePublicProductImageHandler)

	mux.HandleFunc("GET /api/eostore/cart/{companyId}", a.eostoreCartGetHandler)
	mux.HandleFunc("PUT /api/eostore/cart/{companyId}", a.eostoreCartPutHandler)
	mux.HandleFunc("POST /api/eostore/cart/{companyId}/checkout", a.eostoreCartCheckoutHandler)
}
