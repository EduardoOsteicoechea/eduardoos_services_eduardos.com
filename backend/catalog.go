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
	{ID: "pamphlet", Label: "Pamphlet", Description: "Cloud pamphlet editor and print export.", MonthlyUSD: 1},
	{ID: "homescool", Label: "Homescool", Description: "Homescool learning surface.", MonthlyUSD: 1},
	{ID: "scrib", Label: "Scrib", Description: "Layered US Letter manuscript sheets with cloud books.", MonthlyUSD: 1},
	{ID: "ereport", Label: "eReport", Description: "Issue tracker reports with cloud storage and sharing.", MonthlyUSD: 1},
	{ID: "evoice", Label: "eVoice", Description: "Text-to-audio projects (docs → MP3).", MonthlyUSD: 1},
	{ID: "eoproject", Label: "eoProject", Description: "Construction project stages, photos, and IFC versions.", MonthlyUSD: 1},
	{ID: "api", Label: "API", Description: "Create API keys and call product APIs from external apps.", MonthlyUSD: 3},
}

var evoiceAllowlistEmails = []string{
	"eliasosteic@gmail.com",
	"laleskavf.2una@gmail.com",
}

var serviceByID map[string]serviceInfo

func init() {
	serviceByID = make(map[string]serviceInfo, len(serviceCatalog))
	for _, s := range serviceCatalog {
		serviceByID[s.ID] = s
	}
}

func knownService(id string) bool {
	_, ok := serviceByID[strings.ToLower(strings.TrimSpace(id))]
	return ok
}

func serviceLabel(id string) string {
	if s, ok := serviceByID[strings.ToLower(strings.TrimSpace(id))]; ok {
		return s.Label
	}
	return id
}

func monthlyPriceUSD(id string) float64 {
	if s, ok := serviceByID[strings.ToLower(strings.TrimSpace(id))]; ok {
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

func isEvoiceAllowlisted(email string) bool {
	email = strings.ToLower(strings.TrimSpace(email))
	for _, a := range evoiceAllowlistEmails {
		if email == strings.ToLower(a) {
			return true
		}
	}
	return false
}

func entitlementActiveProduct(ents []*Entitlement, product string, now time.Time) bool {
	product = strings.ToLower(strings.TrimSpace(product))
	for _, e := range ents {
		if e != nil && e.Product == product && e.isLive(now) {
			return true
		}
	}
	return false
}
