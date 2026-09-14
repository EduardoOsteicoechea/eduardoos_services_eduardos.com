package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const (
	maxEostoreImportBody     = 8 << 20
	maxEostoreImportProducts = 5000
	maxEostoreImportSections = 200
	maxEostoreImportTypes    = 1000
)

type eostoreAPIKeyContextKey string

const eostoreAPIUserContextKey eostoreAPIKeyContextKey = "eostore-api-user"

func (a *App) withEostoreAPIKey(next http.HandlerFunc) http.HandlerFunc {
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
		key, err := a.store.APIKeyByHash(r.Context(), a.hashOpaque("api-key", secret))
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
		if err != nil || user.Status != statusVerified || user.Role != roleAdmin {
			a.auditEvent(r, "eostore_import", "forbidden", key.UserID)
			a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
			return
		}
		now := time.Now().UTC()
		key.LastUsedAt = &now
		_ = a.store.UpdateAPIKey(r.Context(), key)
		ctx := context.WithValue(r.Context(), eostoreAPIUserContextKey, user)
		next(w, r.WithContext(ctx))
	}
}

func eostoreAPIUserFrom(r *http.Request) *User {
	user, _ := r.Context().Value(eostoreAPIUserContextKey).(*User)
	return user
}

type eostoreImportCompany struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type eostoreImportType struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type eostoreImportSection struct {
	ID          string              `json:"id"`
	Name        string              `json:"name"`
	Description string              `json:"description"`
	Types       []eostoreImportType `json:"types"`
}

type eostoreImportProduct struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	SectionID       string   `json:"section_id"`
	TypeID          string   `json:"type_id"`
	Description     string   `json:"description"`
	Hashtags        []string `json:"hashtags"`
	PriceBaseUSD    *float64 `json:"price_base_usd"`
	DiscountPercent *int     `json:"discount_percent"`
	BsPerUSD        *float64 `json:"bs_per_usd"`
	Units           *int     `json:"units"`
	Status          *string  `json:"status"`
	SKU             *string  `json:"sku"`
	SEOTitle        *string  `json:"seo_title"`
	SEODescription  *string  `json:"seo_description"`
}

type eostoreImportRequest struct {
	DryRun   bool                   `json:"dry_run"`
	Company  eostoreImportCompany   `json:"company"`
	Sections []eostoreImportSection `json:"sections"`
	Products []eostoreImportProduct `json:"products"`
}

type eostoreImportResult struct {
	ID     string `json:"id"`
	GUID   string `json:"guid,omitempty"`
	Action string `json:"action"`
	Error  string `json:"error,omitempty"`
}

func eostoreImportFriendlyID(name, sku string) string {
	base := normalizeEostoreFriendlyID(name)
	if base == "" {
		base = "product"
	}
	skuPart := normalizeEostoreFriendlyID(sku)
	if skuPart != "" && len(base)+1+len(skuPart) <= 64 {
		return base + "-" + skuPart
	}
	if len(base) > 64 {
		base = strings.Trim(base[:64], "-")
	}
	return base
}

func eostoreImportUniqueID(id string, used map[string]bool) string {
	candidate := id
	for i := 2; used[candidate]; i++ {
		suffix := "-" + strconv.Itoa(i)
		base := candidate
		if len(base)+len(suffix) > 64 {
			base = strings.Trim(base[:64-len(suffix)], "-")
		}
		candidate = base + suffix
	}
	used[candidate] = true
	return candidate
}

func (a *App) eostoreImportSessionHandler(w http.ResponseWriter, r *http.Request) {
	admin := a.eostoreAdmin(w, r)
	if admin == nil {
		return
	}
	var body eostoreImportRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxEostoreImportBody)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	a.eostoreImportApply(w, r, admin, body)
}

func (a *App) eostoreV1ImportHandler(w http.ResponseWriter, r *http.Request) {
	user := eostoreAPIUserFrom(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	var body eostoreImportRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxEostoreImportBody)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	a.eostoreImportApply(w, r, user, body)
}

func (a *App) eostoreImportApply(w http.ResponseWriter, r *http.Request, user *User, body eostoreImportRequest) {
	if len(body.Products) == 0 || len(body.Products) > maxEostoreImportProducts || len(body.Sections) > maxEostoreImportSections {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	companyFriendly := normalizeEostoreFriendlyID(body.Company.ID)
	if companyFriendly == "" {
		companyFriendly = normalizeEostoreFriendlyID(body.Company.Name)
	}
	companyName := strings.TrimSpace(body.Company.Name)
	if companyName == "" {
		companyName = companyFriendly
	}
	if !eostoreFriendlyIDValid(companyFriendly) || companyName == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	ctx := r.Context()
	now := time.Now().UTC()

	company, err := a.eostore.GetCompanyByFriendlyID(ctx, companyFriendly)
	if err != nil && !errors.Is(err, errNotFound) {
		a.eostoreWriteStoreErr(w, r, err)
		return
	}
	companyCreated := false
	if company == nil {
		company = &EostoreCompany{
			GUID:        newEostoreGUID(),
			FriendlyID:  companyFriendly,
			Name:        companyName,
			Description: trimToLen(body.Company.Description, 500),
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		companyCreated = true
		if body.DryRun {
			company.GUID = "dry-run-company"
		} else if err := a.eostore.InsertCompany(ctx, company); err != nil {
			a.eostoreWriteStoreErr(w, r, err)
			return
		}
	} else if !body.DryRun && company.Name != companyName {
		company.Name = companyName
		company.UpdatedAt = now
		if err := a.eostore.UpdateCompany(ctx, company); err != nil {
			a.eostoreWriteStoreErr(w, r, err)
			return
		}
	}

	sectionsCreated, typesCreated, typeCount := 0, 0, 0
	sectionByID := map[string]*EostoreSection{}
	typeByKey := map[string]*EostoreType{}
	for _, s := range body.Sections {
		sid := normalizeEostoreFriendlyID(s.ID)
		if sid == "" {
			sid = normalizeEostoreFriendlyID(s.Name)
		}
		if !eostoreFriendlyIDValid(sid) {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		sec, err := a.eostore.GetSectionByFriendlyID(ctx, company.GUID, sid)
		if err != nil && !errors.Is(err, errNotFound) {
			a.eostoreWriteStoreErr(w, r, err)
			return
		}
		if sec == nil {
			name := strings.TrimSpace(s.Name)
			if name == "" {
				name = sid
			}
			sec = &EostoreSection{
				GUID:        newEostoreGUID(),
				FriendlyID:  sid,
				CompanyGUID: company.GUID,
				Name:        name,
				Description: trimToLen(s.Description, 500),
				CreatedAt:   now,
				UpdatedAt:   now,
			}
			sectionsCreated++
			if body.DryRun {
				sec.GUID = "dry-run-section-" + sid
			} else if err := a.eostore.InsertSection(ctx, sec); err != nil {
				a.eostoreWriteStoreErr(w, r, err)
				return
			}
		}
		sectionByID[sid] = sec
		for _, t := range s.Types {
			typeCount++
			tid := normalizeEostoreFriendlyID(t.ID)
			if tid == "" {
				tid = normalizeEostoreFriendlyID(t.Name)
			}
			if !eostoreFriendlyIDValid(tid) {
				a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
				return
			}
			typ, err := a.eostore.GetTypeByFriendlyID(ctx, sec.GUID, tid)
			if err != nil && !errors.Is(err, errNotFound) {
				a.eostoreWriteStoreErr(w, r, err)
				return
			}
			if typ == nil {
				name := strings.TrimSpace(t.Name)
				if name == "" {
					name = tid
				}
				typ = &EostoreType{
					GUID:        newEostoreGUID(),
					FriendlyID:  tid,
					CompanyGUID: company.GUID,
					SectionGUID: sec.GUID,
					Name:        name,
					Description: trimToLen(t.Description, 500),
					CreatedAt:   now,
					UpdatedAt:   now,
				}
				typesCreated++
				if body.DryRun {
					typ.GUID = "dry-run-type-" + sid + "-" + tid
				} else if err := a.eostore.InsertType(ctx, typ); err != nil {
					a.eostoreWriteStoreErr(w, r, err)
					return
				}
			}
			typeByKey[sid+"\x00"+tid] = typ
		}
	}
	if typeCount > maxEostoreImportTypes {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	results := make([]eostoreImportResult, 0, len(body.Products))
	productsCreated, productsUpdated, failed := 0, 0, 0
	usedIDs := map[string]bool{}
	seenSections := map[string]*EostoreSection{}
	seenTypes := map[string]*EostoreType{}

	for i := range body.Products {
		p := body.Products[i]
		friendly := normalizeEostoreFriendlyID(p.ID)
		if friendly == "" {
			friendly = eostoreImportFriendlyID(p.Name, derefString(p.SKU))
		}
		friendly = eostoreImportUniqueID(friendly, usedIDs)
		name := strings.TrimSpace(p.Name)
		sectionID := normalizeEostoreFriendlyID(p.SectionID)
		typeID := normalizeEostoreFriendlyID(p.TypeID)

		sec, ok := sectionByID[sectionID]
		if !ok {
			sec, ok = seenSections[sectionID]
		}
		if !ok {
			if loaded, err := a.eostore.GetSectionByFriendlyID(ctx, company.GUID, sectionID); err == nil {
				sec, ok = loaded, true
			}
			seenSections[sectionID] = sec
		}
		typeKey := sectionID + "\x00" + typeID
		typ, ok := typeByKey[typeKey]
		if !ok {
			typ, ok = seenTypes[typeKey]
		}
		if !ok {
			if sec != nil {
				if loaded, err := a.eostore.GetTypeByFriendlyID(ctx, sec.GUID, typeID); err == nil {
					typ, ok = loaded, true
				}
			}
			seenTypes[typeKey] = typ
		}

		fail := func(reason string) {
			failed++
			results = append(results, eostoreImportResult{ID: friendly, Action: "error", Error: reason})
		}
		if name == "" || !eostoreFriendlyIDValid(friendly) || sec == nil || typ == nil {
			fail("invalid_product")
			continue
		}
		discount := 0
		if p.DiscountPercent != nil {
			discount = *p.DiscountPercent
		}
		if !eostoreDiscountValid(discount) {
			fail("invalid_discount")
			continue
		}
		units := 0
		if p.Units != nil {
			units = *p.Units
		}
		if units < 0 {
			fail("invalid_units")
			continue
		}
		price := 0.0
		if p.PriceBaseUSD != nil {
			price = *p.PriceBaseUSD
		}
		bs := 0.0
		if p.BsPerUSD != nil {
			bs = *p.BsPerUSD
		}
		if price < 0 || bs < 0 {
			fail("invalid_price")
			continue
		}
		status := ""
		if p.Status != nil && strings.TrimSpace(*p.Status) != "" {
			status = normalizeEostoreStatus(*p.Status)
			if status == "" {
				fail("invalid_status")
				continue
			}
		}
		if status == "" {
			if units > 0 {
				status = EostoreStatusActive
			} else {
				status = EostoreStatusDraft
			}
		}

		existing, err := a.eostore.GetProductByFriendlyID(ctx, company.GUID, friendly)
		if err != nil && !errors.Is(err, errNotFound) {
			a.eostoreWriteStoreErr(w, r, err)
			return
		}

		prod := &EostoreProduct{
			GUID:            newEostoreGUID(),
			FriendlyID:      friendly,
			CompanyGUID:     company.GUID,
			SectionGUID:     sec.GUID,
			TypeGUID:        typ.GUID,
			Name:            name,
			Description:     strings.TrimSpace(p.Description),
			Hashtags:        normalizeEostoreHashtags(p.Hashtags),
			Images:          []EostoreImage{},
			PriceBaseUSD:    price,
			DiscountPercent: discount,
			BsPerUSD:        bs,
			Units:           units,
			Visible:         status == EostoreStatusActive,
			Status:          status,
			SKU:             trimToLen(derefString(p.SKU), eostoreMaxSKU),
			SEOTitle:        trimToLen(derefString(p.SEOTitle), eostoreMaxSEOTitle),
			SEODescription:  trimToLen(derefString(p.SEODescription), eostoreMaxSEODesc),
			CreatedAt:       now,
			UpdatedAt:       now,
		}
		action := "created"
		if existing != nil {
			action = "updated"
			prod.GUID = existing.GUID
			prod.Images = existing.Images
			prod.CreatedAt = existing.CreatedAt
		}
		if !body.DryRun {
			if existing != nil {
				if err := a.eostore.UpdateProduct(ctx, prod); err != nil {
					a.eostoreWriteStoreErr(w, r, err)
					return
				}
				productsUpdated++
			} else {
				if err := a.eostore.InsertProduct(ctx, prod); err != nil {
					a.eostoreWriteStoreErr(w, r, err)
					return
				}
				productsCreated++
			}
		} else if existing != nil {
			productsUpdated++
		} else {
			productsCreated++
		}
		results = append(results, eostoreImportResult{ID: friendly, GUID: prod.GUID, Action: action})
	}

	a.auditEvent(r, "eostore_import", "ok", user.ID)
	a.mustLogf(r, "eostore.import",
		"company_guid", company.GUID,
		"company_created", companyCreated,
		"sections_created", sectionsCreated,
		"types_created", typesCreated,
		"products_created", productsCreated,
		"products_updated", productsUpdated,
		"failed", failed,
		"dry_run", body.DryRun,
	)
	writeJSON(w, http.StatusOK, map[string]any{
		"company": map[string]any{
			"guid": company.GUID,
			"id":   company.FriendlyID,
			"name": company.Name,
		},
		"company_created":  companyCreated,
		"sections_created": sectionsCreated,
		"types_created":    typesCreated,
		"products_created": productsCreated,
		"products_updated": productsUpdated,
		"failed":           failed,
		"dry_run":          body.DryRun,
		"results":          results,
	})
}

func (a *App) registerEostoreAPIRoutes(mux *http.ServeMux) {
	mux.HandleFunc("POST /api/v1/eostore/products/import", a.withEostoreAPIKey(a.eostoreV1ImportHandler))
}
