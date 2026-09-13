package main

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

func adminUserSummary(user *User) map[string]any {
	var display any
	if user.DisplayName != "" {
		display = user.DisplayName
	}
	return map[string]any{
		"id":             user.ID,
		"email":          user.Email,
		"username":       user.Username,
		"display_name":   display,
		"role":           user.Role,
		"status":         user.Status,
		"email_verified": user.EmailVerified,
		"created_at":     user.CreatedAt.UTC().Format(time.RFC3339),
		"updated_at":     user.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func (a *App) requireAdminRead(w http.ResponseWriter, r *http.Request) *User {
	user := a.currentUser(r)
	if user == nil {
		a.logAuthDebug(r, "admin_read_denied", slog.String("reason", "unauthorized"))
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return nil
	}
	if user.Role != roleAdmin {
		a.logAuthDebug(r, "admin_read_denied", slog.String("reason", "forbidden"), slog.String("user_id", user.ID))
		a.auditEvent(r, "admin_users", "forbidden", user.ID)
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return nil
	}
	return user
}

func (a *App) listUsersHandler(w http.ResponseWriter, r *http.Request) {
	a.logAuthDebug(r, "admin_users_start")
	admin := a.requireAdminRead(w, r)
	if admin == nil {
		return
	}
	users, err := a.store.ListUsers(r.Context())
	if err != nil {
		a.logAuthDebug(r, "admin_users_failed", slog.String("reason", redactLogValue(err.Error())))
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	rows := make([]map[string]any, 0, len(users))
	for _, user := range users {
		row := adminUserSummary(user)
		if pref, err := a.store.UserPreferenceByKey(r.Context(), user.ID, "admin_services"); err == nil && pref != nil {
			row["admin_services"] = preferenceServiceIDs(pref.Value)
		} else {
			row["admin_services"] = []string{}
		}
		rows = append(rows, row)
	}
	a.auditEvent(r, "admin_users", "listed", admin.ID)
	a.logAuthDebug(r, "admin_users_ok", slog.Int("count", len(rows)))
	writeJSON(w, http.StatusOK, map[string]any{
		"users": rows,
		"count": len(rows),
	})
}

type adminServicesBody struct {
	Services []string `json:"services"`
}

// setUserServices stores administrator-granted access separately from paid
// entitlements, so revoking an administrative grant cannot alter billing state.
func (a *App) setUserServicesHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	admin := a.requireAdminRead(w, r)
	if admin == nil {
		return
	}
	targetID := strings.TrimSpace(r.PathValue("id"))
	target, err := a.store.UserByID(r.Context(), targetID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body adminServicesBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	services := normalizeServiceIDs(body.Services)
	if err := a.store.UpsertUserPreference(r.Context(), &UserPreference{
		ID: target.ID + "\x00admin_services", UserID: target.ID, Key: "admin_services",
		Value: services, UpdatedAt: time.Now().UTC(),
	}); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "admin_service_access", "updated", admin.ID)
	a.mustLogf(r, "admin.services.updated", "admin_id", admin.ID, "user_id", target.ID, "count", len(services))
	writeJSON(w, http.StatusOK, map[string]any{"user_id": target.ID, "services": services})
}
