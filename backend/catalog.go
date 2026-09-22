package main

import (
	"fmt"
	"strings"
	"time"
)

// Billable catalog (spec 002). Admin always bypasses entitlements.
type serviceInfo struct {
	ID          string
	Label       string
	Description string
	MonthlyUSD  float64
}

var serviceCatalog = []serviceInfo{
	{ID: "epam", Label: "EPAM", Description: "Cloud EPAM editor, .epam documents, and print export.", MonthlyUSD: 1},
	{ID: "homescool", Label: "Homescool", Description: "Homescool learning surface.", MonthlyUSD: 1},
	{ID: "scrib", Label: "Scrib", Description: "Layered US Letter manuscript sheets with cloud books.", MonthlyUSD: 1},
	{ID: "ereport", Label: "eReport", Description: "Issue tracker reports with cloud storage and sharing.", MonthlyUSD: 1},
	{ID: "evoice", Label: "eVoice", Description: "Text-to-audio projects (docs → MP3).", MonthlyUSD: 1},
	{ID: "eoproject", Label: "eoProject", Description: "Construction project stages, photos, and IFC versions.", MonthlyUSD: 1},
	{ID: "api", Label: "API", Description: "Create API keys and call product APIs from external apps.", MonthlyUSD: 3},
}

var serviceByID map[string]serviceInfo

func init() {
	serviceByID = make(map[string]serviceInfo, len(serviceCatalog))
	for _, s := range serviceCatalog {
		serviceByID[s.ID] = s
	}
}

func knownService(id string) bool {
	_, ok := serviceByID[normalizeProductID(id)]
	return ok
}

// normalizeProductID maps legacy pamphlet → epam for catalog, entitlements, and gates.
func normalizeProductID(id string) string {
	id = strings.ToLower(strings.TrimSpace(id))
	if id == "pamphlet" {
		return productEpam
	}
	return id
}

// productIDAliases returns ids that count as the same entitlement (epam ↔ pamphlet).
func productIDAliases(id string) []string {
	n := normalizeProductID(id)
	if n == productEpam {
		return []string{productEpam, "pamphlet"}
	}
	if n == "" {
		return nil
	}
	return []string{n}
}

// payableService reports whether a service is sold via subscriptions.
func payableService(id string) bool {
	return knownService(id) && monthlyPriceUSD(id) > 0
}

func serviceLabel(id string) string {
	if s, ok := serviceByID[normalizeProductID(id)]; ok {
		return s.Label
	}
	return id
}

func monthlyPriceUSD(id string) float64 {
	if s, ok := serviceByID[normalizeProductID(id)]; ok {
		return s.MonthlyUSD
	}
	return 0
}

func quoteTotalUSD(serviceIDs []string, billingPeriod string) float64 {
	total := 0.0
	for _, id := range serviceIDs {
		total += monthlyPriceUSD(id)
	}
	if strings.EqualFold(strings.TrimSpace(billingPeriod), "yearly") {
		total *= 10
	}
	return total
}

func formatAmountUSD(total float64) string {
	return fmt.Sprintf("%.2f", total)
}

func entitlementActiveProduct(ents []*Entitlement, product string, now time.Time) bool {
	aliases := productIDAliases(product)
	for _, e := range ents {
		if e == nil || !e.isLive(now) {
			continue
		}
		for _, want := range aliases {
			if e.Product == want {
				return true
			}
		}
	}
	return false
}
