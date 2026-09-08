package main

import (
	"context"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type ereportPrincipal struct {
	OwnerUserID string
	Invite      *ereportInvite
	User        *User
	CanEdit     bool
	CanManage   bool
}

// ereportOwnerLookup names an owner directory <username>/<safe-email>. The
// session user id stays the authority; these values only label the tree.
func (a *App) ereportOwnerLookup(userID string) (username, email string, ok bool) {
	user, err := a.store.UserByID(context.Background(), userID)
	if err != nil || user == nil {
		return "", "", false
	}
	return user.Username, user.Email, true
}

func (a *App) inviteCookieName() string {
	if a.cfg.SecureCookies {
		return "__Host-ereport-invite"
	}
	return "ereport-invite"
}

func (a *App) publicBase(r *http.Request) string {
	if strings.TrimSpace(a.cfg.PublicBaseURL) != "" {
		return strings.TrimRight(a.cfg.PublicBaseURL, "/")
	}
	host := strings.TrimSpace(r.Header.Get("X-Forwarded-Host"))
	if host == "" {
		host = strings.TrimSpace(r.Host)
	}
	if host == "" {
		return "https://eduardoos.com"
	}
	scheme := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto"))
	if scheme == "" {
		scheme = "https"
	}
	return scheme + "://" + host
}

func ereportViewPath(ownerSafe, orgID, reportID string) string {
	q := url.Values{}
	q.Set("user", ownerSafe)
	q.Set("org", orgID)
	q.Set("report", reportID)
	return "/ereport/workspace?" + q.Encode()
}

func (a *App) ereportViewURL(r *http.Request, ownerSafe, orgID, reportID string) string {
	return a.publicBase(r) + ereportViewPath(ownerSafe, orgID, reportID)
}

func (a *App) hasProductEntitlement(r *http.Request, user *User, product string) (allowed bool, unavailable bool) {
	if a.failClosedEnt {
		return false, true
	}
	if user == nil {
		return false, false
	}
	if user.Role == roleAdmin {
		return true, false
	}
	ents, err := a.store.EntitlementsByUser(r.Context(), user.ID)
	if err != nil {
		return false, true
	}
	now := time.Now().UTC()
	for _, ent := range ents {
		if ent.Product == product && ent.isLive(now) {
			return true, false
		}
	}
	return false, false
}

func (a *App) requireCreateEntitlement(w http.ResponseWriter, r *http.Request, user *User) bool {
	ok, unavailable := a.hasProductEntitlement(r, user, productEreport)
	if unavailable || !ok {
		a.auditEvent(r, "ereport_entitlement", "denied", user.ID)
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return false
	}
	return true
}

func (a *App) requireEreportUser(w http.ResponseWriter, r *http.Request) *User {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return nil
	}
	return user
}

func (a *App) requireEreportOwnerWrite(w http.ResponseWriter, r *http.Request) *User {
	if !a.requireUnsafe(w, r) {
		return nil
	}
	return a.requireEreportUser(w, r)
}

func (inv ereportInvite) public() ereportInvitePublic {
	return ereportInvitePublic{
		ID:        inv.ID,
		Scope:     inv.Scope,
		OrgID:     inv.OrgID,
		ReportID:  inv.ReportID,
		ExpiresAt: inv.ExpiresAt,
		CreatedAt: inv.CreatedAt,
		CanEdit:   inv.CanEdit,
	}
}

func inviteExpired(inv ereportInvite, now time.Time) bool {
	if strings.TrimSpace(inv.ExpiresAt) == "" {
		return true
	}
	exp, err := time.Parse(time.RFC3339, inv.ExpiresAt)
	if err != nil {
		return true
	}
	return !now.Before(exp)
}

func (a *App) currentInvite(r *http.Request) *ereportInvite {
	cookie, err := r.Cookie(a.inviteCookieName())
	if err != nil || cookie.Value == "" {
		return nil
	}
	parts := strings.SplitN(cookie.Value, ".", 2)
	if len(parts) != 2 || !validEreportID(parts[0]) {
		return nil
	}
	inv, err := a.ereport.loadInvite(parts[0])
	if err != nil {
		return nil
	}
	if inviteExpired(inv, time.Now().UTC()) {
		return nil
	}
	want := a.hashOpaque("ereport-invite-session:"+inv.ID, parts[1])
	if inv.SessionHash == "" || !hmacEqual(want, inv.SessionHash) {
		return nil
	}
	cp := inv
	return &cp
}

func (a *App) inviteCovers(inv ereportInvite, orgID, reportID string) bool {
	if inv.OrgID != orgID {
		return false
	}
	switch inv.Scope {
	case inviteScopeOrg:
		return true
	case inviteScopeReport:
		return inv.ReportID == reportID
	default:
		return false
	}
}

func (a *App) grantEntitlement(userID, product string) error {
	now := time.Now().UTC()
	return a.store.UpsertEntitlement(context.Background(), &Entitlement{
		ID:        randomID(12),
		UserID:    userID,
		Product:   product,
		Active:    true,
		CreatedAt: now,
	})
}
