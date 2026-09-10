package main

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

type createIntentBody struct {
	Email         string   `json:"email"`
	PlanID        string   `json:"plan_id"`
	Services      []string `json:"services"`
	BillingPeriod string   `json:"billing_period"`
}

func (a *App) mustLogf(r *http.Request, msg string, args ...any) {
	if a == nil || !a.cfg.MustLog {
		return
	}
	rid := ""
	if r != nil {
		rid = requestIDFrom(r, nil)
	}
	a.log.Info(msg, append([]any{"request_id", rid}, args...)...)
}

func (a *App) subscriptionsCatalogHandler(w http.ResponseWriter, r *http.Request) {
	a.mustLogf(r, "subscriptions.catalog")
	out := make([]map[string]any, 0, len(serviceCatalog))
	for _, s := range serviceCatalog {
		out = append(out, map[string]any{
			"id":          s.ID,
			"label":       s.Label,
			"description": s.Description,
			"monthly_usd": s.MonthlyUSD,
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{"services": out})
}

func (a *App) subscriptionsEntitlementsHandler(w http.ResponseWriter, r *http.Request) {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	ents, err := a.store.EntitlementsByUser(r.Context(), user.ID)
	if err != nil {
		a.mustLogf(r, "subscriptions.entitlements.error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	rows := make([]map[string]any, 0, len(ents))
	now := time.Now().UTC()
	for _, e := range ents {
		if e == nil {
			continue
		}
		rows = append(rows, map[string]any{
			"product":    e.Product,
			"label":      serviceLabel(e.Product),
			"active":     e.isLive(now),
			"expires_at": e.ExpiresAt,
			"created_at": e.CreatedAt,
		})
	}
	a.mustLogf(r, "subscriptions.entitlements.ok", "user_id", user.ID, "count", len(rows))
	writeJSON(w, http.StatusOK, map[string]any{
		"email":        user.Email,
		"entitlements": rows,
		"is_admin":     user.Role == roleAdmin,
	})
}

func (a *App) subscriptionsAccessHandler(w http.ResponseWriter, r *http.Request) {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	serviceID := strings.ToLower(strings.TrimSpace(r.PathValue("serviceID")))
	if !knownService(serviceID) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	allowed := false
	reason := "denied"
	if user.Role == roleAdmin {
		allowed = true
		reason = "admin"
	} else if serviceID == "evoice" && (isEvoiceAllowlisted(user.Email) || isEvoiceAllowlisted(user.EmailNormalized)) {
		allowed = true
		reason = "allowlist"
	} else {
		ok, unavailable := a.hasProductEntitlement(r, user, serviceID)
		if unavailable {
			a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
			return
		}
		allowed = ok
		if ok {
			reason = "entitlement"
		}
	}
	if !allowed && serviceID == "homescool" && a.homescool != nil {
		if a.homescool.IsLinkedStudent(r.Context(), user.ID) {
			allowed = true
			reason = "linked_student"
		}
	}
	a.mustLogf(r, "subscriptions.access", "user_id", user.ID, "service", serviceID, "allowed", allowed, "reason", reason)
	writeJSON(w, http.StatusOK, map[string]any{
		"email":                 user.Email,
		"service_id":            serviceID,
		"allowed":               allowed,
		"reason":                reason,
		"is_admin":              user.Role == roleAdmin,
		"has_entitlement":       reason == "entitlement",
		"is_homescool_student":  reason == "linked_student",
		"is_evoice_allowlisted": reason == "allowlist",
	})
}

func (a *App) subscriptionsPreviewHandler(w http.ResponseWriter, r *http.Request) {
	services := normalizeServiceIDs(r.URL.Query()["service"])
	if len(services) == 0 {
		raw := strings.TrimSpace(r.URL.Query().Get("services"))
		if raw != "" {
			services = normalizeServiceIDs(strings.Split(raw, ","))
		}
	}
	billing := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("billing_period")))
	if billing == "" {
		billing = "monthly"
	}
	total := quoteTotalUSD(services, billing)
	a.mustLogf(r, "subscriptions.preview", "services", len(services), "billing", billing, "total", total)
	writeJSON(w, http.StatusOK, map[string]any{
		"services":       services,
		"billing_period": billing,
		"amount":         formatAmountUSD(total),
		"currency":       "USD",
	})
}

// subscriptionsEntitlementsPreviewHandler returns the caller's entitlements (session).
func (a *App) subscriptionsEntitlementsPreviewHandler(w http.ResponseWriter, r *http.Request) {
	a.subscriptionsEntitlementsHandler(w, r)
}

func (a *App) paymentsCreateIntentHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	var body createIntentBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	bodyEmail := strings.ToLower(strings.TrimSpace(body.Email))
	if bodyEmail != "" && bodyEmail != user.EmailNormalized {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	services := normalizeServiceIDs(body.Services)
	billing := strings.ToLower(strings.TrimSpace(body.BillingPeriod))
	if billing == "" {
		billing = "monthly"
	}
	if billing != "monthly" && billing != "yearly" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if len(services) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	labels := make([]string, 0, len(services))
	for _, id := range services {
		labels = append(labels, serviceLabel(id))
	}
	now := time.Now().UTC()
	intent := &PaymentIntent{
		ID:             randomID(16),
		UserID:         user.ID,
		Email:          user.Email,
		PlanID:         strings.TrimSpace(body.PlanID),
		ProductName:    "Eduardo OS: " + strings.Join(labels, " + "),
		HostedButtonID: a.cfg.PayPalHostedButtonID,
		Currency:       "USD",
		Amount:         formatAmountUSD(quoteTotalUSD(services, billing)),
		Services:       services,
		BillingPeriod:  billing,
		Status:         "pending",
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if intent.PlanID == "" {
		intent.PlanID = "subscription_custom_" + billing
	}
	if intent.HostedButtonID == "" {
		intent.HostedButtonID = "PLACEHOLDER_HOSTED_BUTTON"
	}
	if err := a.store.UpsertPaymentIntent(r.Context(), intent); err != nil {
		a.mustLogf(r, "payments.intent.insert_error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "payment_intent", "created", user.ID)
	a.mustLogf(r, "payments.intent.created", "intent_id", intent.ID, "services", len(services), "amount", intent.Amount)
	writeJSON(w, http.StatusOK, map[string]any{
		"intent_id":            intent.ID,
		"email":                intent.Email,
		"plan_id":              intent.PlanID,
		"product_name":         intent.ProductName,
		"hosted_button_id":     intent.HostedButtonID,
		"currency":             intent.Currency,
		"amount":               intent.Amount,
		"services":             intent.Services,
		"billing_period":       intent.BillingPeriod,
		"paypal_checkout_mode": "hosted",
		"paypal_checkout_url":  a.cfg.PayPalCheckoutURL,
		"created_at":           intent.CreatedAt,
		"request_id":           requestIDFrom(r, w),
	})
}

func (a *App) paymentsStatusHandler(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.PathValue("intentID"))
	intent, err := a.store.PaymentIntentByID(r.Context(), id)
	if err != nil || intent == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	user := a.currentUser(r)
	if user != nil && user.Role != roleAdmin && intent.UserID != user.ID {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	a.mustLogf(r, "payments.status", "intent_id", id, "status", intent.Status)
	writeJSON(w, http.StatusOK, map[string]any{
		"intent_id":    intent.ID,
		"email":        intent.Email,
		"plan_id":      intent.PlanID,
		"product_name": intent.ProductName,
		"status":       intent.Status,
		"currency":     intent.Currency,
		"amount":       intent.Amount,
		"services":     intent.Services,
		"created_at":   intent.CreatedAt,
		"updated_at":   intent.UpdatedAt,
	})
}

func normalizeServiceIDs(raw []string) []string {
	out := make([]string, 0, len(raw))
	seen := map[string]bool{}
	for _, id := range raw {
		id = strings.ToLower(strings.TrimSpace(id))
		if id == "" || !knownService(id) || seen[id] {
			continue
		}
		seen[id] = true
		out = append(out, id)
	}
	return out
}

func (a *App) grantProducts(ctx context.Context, userID string, products []string, billing string, months int) error {
	if months < 1 {
		months = 1
	}
	now := time.Now().UTC()
	until := now.AddDate(0, months, 0)
	if strings.EqualFold(billing, "yearly") {
		until = now.AddDate(1, 0, 0)
	}
	for _, product := range products {
		if !knownService(product) {
			continue
		}
		exp := until
		if err := a.store.UpsertEntitlement(ctx, &Entitlement{
			ID:        userID + ":" + product,
			UserID:    userID,
			Product:   product,
			Active:    true,
			ExpiresAt: &exp,
			CreatedAt: now,
		}); err != nil {
			return err
		}
	}
	return nil
}
