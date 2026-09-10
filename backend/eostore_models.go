package main

import (
	"fmt"
	"regexp"
	"strings"
	"time"
)

const (
	eostoreMediaPrefix   = "eostore"
	maxEostoreImageBytes = 8 << 20
	maxEostoreImageEdge  = 4096
	maxEostoreImages     = 12
)

var (
	safeEostoreFriendlyID = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
	safeEostoreRel        = regexp.MustCompile(`^eostore/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+\.(jpg|png|webp)$`)
	hashtagToken          = regexp.MustCompile(`^[A-Za-z0-9_]{1,48}$`)
)

// EostoreCompany is a catalog tenant (empresa).
type EostoreCompany struct {
	GUID        string    `json:"guid" bson:"_id"`
	FriendlyID  string    `json:"id" bson:"friendly_id"`
	Name        string    `json:"name" bson:"name"`
	Description string    `json:"description,omitempty" bson:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" bson:"updated_at"`
}

func (c *EostoreCompany) clone() *EostoreCompany {
	if c == nil {
		return nil
	}
	cp := *c
	return &cp
}

// EostoreSection is a product section under a company.
type EostoreSection struct {
	GUID        string    `json:"guid" bson:"_id"`
	FriendlyID  string    `json:"id" bson:"friendly_id"`
	CompanyGUID string    `json:"company_guid" bson:"company_guid"`
	Name        string    `json:"name" bson:"name"`
	Description string    `json:"description,omitempty" bson:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" bson:"updated_at"`
}

func (s *EostoreSection) clone() *EostoreSection {
	if s == nil {
		return nil
	}
	cp := *s
	return &cp
}

// EostoreType is a product type under a section.
type EostoreType struct {
	GUID        string    `json:"guid" bson:"_id"`
	FriendlyID  string    `json:"id" bson:"friendly_id"`
	CompanyGUID string    `json:"company_guid" bson:"company_guid"`
	SectionGUID string    `json:"section_guid" bson:"section_guid"`
	Name        string    `json:"name" bson:"name"`
	Description string    `json:"description,omitempty" bson:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" bson:"updated_at"`
}

func (t *EostoreType) clone() *EostoreType {
	if t == nil {
		return nil
	}
	cp := *t
	return &cp
}

// EostoreImage is one product media asset under the site media root.
type EostoreImage struct {
	ID          string    `json:"id" bson:"id"`
	Key         string    `json:"key" bson:"key"`
	ContentType string    `json:"content_type" bson:"content_type"`
	Bytes       int64     `json:"bytes" bson:"bytes"`
	CreatedAt   time.Time `json:"created_at" bson:"created_at"`
}

// EostoreProduct is a sellable catalog item.
type EostoreProduct struct {
	GUID           string         `json:"guid" bson:"_id"`
	FriendlyID     string         `json:"id" bson:"friendly_id"`
	CompanyGUID    string         `json:"company_guid" bson:"company_guid"`
	SectionGUID    string         `json:"section_guid" bson:"section_guid"`
	TypeGUID       string         `json:"type_guid" bson:"type_guid"`
	Name           string         `json:"name" bson:"name"`
	Description    string         `json:"description,omitempty" bson:"description,omitempty"`
	Hashtags       []string       `json:"hashtags" bson:"hashtags"`
	Images         []EostoreImage `json:"images" bson:"images"`
	PriceBaseUSD   float64        `json:"price_base_usd" bson:"price_base_usd"`
	DiscountPercent int           `json:"discount_percent" bson:"discount_percent"`
	BsPerUSD       float64        `json:"bs_per_usd" bson:"bs_per_usd"`
	Units          int            `json:"units" bson:"units"`
	Visible        bool           `json:"visible" bson:"visible"`
	CreatedAt      time.Time      `json:"created_at" bson:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at" bson:"updated_at"`
}

func (p *EostoreProduct) clone() *EostoreProduct {
	if p == nil {
		return nil
	}
	cp := *p
	if p.Hashtags != nil {
		cp.Hashtags = append([]string(nil), p.Hashtags...)
	}
	if p.Images != nil {
		cp.Images = append([]EostoreImage(nil), p.Images...)
	}
	return &cp
}

func (p *EostoreProduct) priceFinalUSD() float64 {
	if p == nil {
		return 0
	}
	pct := float64(p.DiscountPercent)
	if pct < 0 {
		pct = 0
	}
	if pct > 100 {
		pct = 100
	}
	return p.PriceBaseUSD * (1 - pct/100)
}

func (p *EostoreProduct) priceBs() float64 {
	if p == nil {
		return 0
	}
	return p.priceFinalUSD() * p.BsPerUSD
}

func eostoreProductView(p *EostoreProduct) map[string]any {
	if p == nil {
		return nil
	}
	images := make([]map[string]any, 0, len(p.Images))
	for _, img := range p.Images {
		images = append(images, map[string]any{
			"id":           img.ID,
			"content_type": img.ContentType,
			"bytes":        img.Bytes,
			"created_at":   img.CreatedAt.UTC().Format(time.RFC3339),
			"url":          fmt.Sprintf("/api/eostore/products/%s/images/%s", p.GUID, img.ID),
		})
	}
	return map[string]any{
		"guid":              p.GUID,
		"id":                p.FriendlyID,
		"company_guid":      p.CompanyGUID,
		"section_guid":      p.SectionGUID,
		"type_guid":         p.TypeGUID,
		"name":              p.Name,
		"description":       p.Description,
		"hashtags":          append([]string(nil), p.Hashtags...),
		"images":            images,
		"price_base_usd":    p.PriceBaseUSD,
		"discount_percent":  p.DiscountPercent,
		"bs_per_usd":        p.BsPerUSD,
		"price_final_usd":   roundMoney(p.priceFinalUSD()),
		"price_bs":          roundMoney(p.priceBs()),
		"units":             p.Units,
		"visible":           p.Visible,
		"created_at":        p.CreatedAt.UTC().Format(time.RFC3339),
		"updated_at":        p.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func roundMoney(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}

func normalizeEostoreFriendlyID(raw string) string {
	s := strings.ToLower(strings.TrimSpace(raw))
	s = strings.ReplaceAll(s, "_", "-")
	s = strings.Join(strings.Fields(s), "-")
	for strings.Contains(s, "--") {
		s = strings.ReplaceAll(s, "--", "-")
	}
	s = strings.Trim(s, "-")
	return s
}

func eostoreFriendlyIDValid(id string) bool {
	if id == "" || len(id) > 64 {
		return false
	}
	return safeEostoreFriendlyID.MatchString(id)
}

func normalizeEostoreHashtags(in []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(in))
	for _, raw := range in {
		tag := strings.TrimSpace(raw)
		tag = strings.TrimPrefix(tag, "#")
		if tag == "" || !hashtagToken.MatchString(tag) {
			continue
		}
		key := strings.ToLower(tag)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, tag)
		if len(out) >= 20 {
			break
		}
	}
	return out
}

func eostoreDiscountValid(n int) bool {
	if n < 0 || n > 100 {
		return false
	}
	return n%5 == 0
}

func newEostoreGUID() string {
	return randomID(16)
}
