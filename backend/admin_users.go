package main

import (
	"log/slog"
	"net/http"
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
		rows = append(rows, adminUserSummary(user))
	}
	a.auditEvent(r, "admin_users", "listed", admin.ID)
	a.logAuthDebug(r, "admin_users_ok", slog.Int("count", len(rows)))
	writeJSON(w, http.StatusOK, map[string]any{
		"users": rows,
		"count": len(rows),
	})
}
