package main

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	ereportShareMinHours = 1
	ereportShareMaxHours = 24 * 30
	ereportShareMsgMax   = 2000
)

func (a *App) inviteLandingURL(r *http.Request, inviteID, secret string) string {
	return a.publicBase(r) + "/ereport/invite?invite=" + url.QueryEscape(inviteID) + "&t=" + url.QueryEscape(secret)
}

func (a *App) verifyInviteSecret(inv ereportInvite, secret string) bool {
	if strings.TrimSpace(secret) == "" || inv.SecretHash == "" {
		return false
	}
	want := a.hashOpaque("ereport-invite:"+inv.ID, secret)
	return hmacEqual(want, inv.SecretHash)
}

func inviteNeedsOTP(inv ereportInvite) bool {
	// Report link shares are open to anyone with the hash; org invites still gate with OTP.
	return strings.TrimSpace(inv.InvitedEmail) != "" && inv.SessionHash == ""
}

func (a *App) ereportCreateOrgInviteHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportOwnerWrite(w, r)
	if user == nil {
		return
	}
	orgID := r.PathValue("orgId")
	orgMeta, err := a.ereport.loadOrgMeta(user.ID, orgID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body struct {
		Email         string `json:"email"`
		DurationHours int    `json:"durationHours"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	_, to, ok := normalizeEmail(body.Email)
	if !ok {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	hours := body.DurationHours
	if hours < ereportShareMinHours {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if hours > ereportShareMaxHours {
		hours = ereportShareMaxHours
	}
	a.writeInvite(w, r, user, orgMeta.ID, "", inviteScopeOrg, to, time.Duration(hours)*time.Hour, "", nil, true)
}

func (a *App) ereportCreateReportInviteHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportOwnerWrite(w, r)
	if user == nil {
		return
	}
	meta, _, ok := a.ownerLoadReport(w, r, user)
	if !ok {
		return
	}
	var body struct {
		Email         string   `json:"email"`
		Emails        []string `json:"emails"`
		DurationHours int      `json:"durationHours"`
		Message       string   `json:"message"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	hours := body.DurationHours
	if hours < ereportShareMinHours {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if hours > ereportShareMaxHours {
		hours = ereportShareMaxHours
	}
	message := strings.TrimSpace(body.Message)
	if len(message) > ereportShareMsgMax {
		message = message[:ereportShareMsgMax]
	}
	emails := parseInviteEmails(body.Emails, body.Email)
	if len(emails) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	// Report shares are editable via link + hash; emails also grant account shares when registered.
	a.writeInvite(w, r, user, meta.OrgID, meta.ID, inviteScopeReport, "", time.Duration(hours)*time.Hour, message, emails, true)
}

func parseInviteEmails(list []string, legacy string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(list)+1)
	add := func(raw string) {
		for _, part := range strings.FieldsFunc(raw, func(r rune) bool {
			return r == ',' || r == ';' || r == '\n' || r == '\r'
		}) {
			_, norm, ok := normalizeEmail(part)
			if !ok {
				continue
			}
			if _, exists := seen[norm]; exists {
				continue
			}
			seen[norm] = struct{}{}
			out = append(out, norm)
		}
	}
	for _, e := range list {
		add(e)
	}
	add(legacy)
	return out
}

func (a *App) writeInvite(
	w http.ResponseWriter,
	r *http.Request,
	user *User,
	orgID, reportID, scope, email string,
	ttl time.Duration,
	message string,
	notifyEmails []string,
	canEdit bool,
) {
	now := time.Now().UTC()
	id := randomID(16)
	secret := randomID(24)
	inv := ereportInvite{
		ID:           id,
		SecretHash:   a.hashOpaque("ereport-invite:"+id, secret),
		Scope:        scope,
		OwnerUserID:  user.ID,
		OrgID:        orgID,
		ReportID:     reportID,
		InvitedEmail: email,
		Message:      message,
		NotifyEmails: notifyEmails,
		ExpiresAt:    now.Add(ttl).Format(time.RFC3339),
		CreatedAt:    now.Format(time.RFC3339),
		CanEdit:      canEdit,
	}
	if err := a.ereport.saveInvite(inv); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	link := a.inviteLandingURL(r, id, secret)
	recipients := notifyEmails
	if len(recipients) == 0 && email != "" {
		recipients = []string{email}
	}
	if scope == inviteScopeReport && len(recipients) > 0 {
		meta, _, metaErr := a.ereport.loadReport(user.ID, orgID, reportID)
		if metaErr == nil {
			for _, to := range recipients {
				a.upsertAccountShare(user, orgID, reportID, id, to, canEdit, meta)
			}
		}
	}
	for _, to := range recipients {
		subject := "eReport invite"
		var body string
		if scope == inviteScopeReport {
			subject = "eReport shared with you"
			msg := message
			if msg == "" {
				msg = "You have been invited to edit an eReport."
			}
			body = fmt.Sprintf("%s\n\nOpen this link to edit the report (no sign-in required):\n%s\n\nIf you have an Eduardo OS account with an eReport subscription, the report also appears under Shared with me.\n\nAccess expires at %s (UTC).\n", msg, link, inv.ExpiresAt)
		} else {
			body = fmt.Sprintf("You have been invited to collaborate on an eReport.\n\nOpen this link and enter the verification code sent to this mailbox:\n%s\n\nAccess expires at %s (UTC).\n", link, inv.ExpiresAt)
		}
		if err := a.mailer.Send(to, subject, body); err != nil {
			a.logUnexpected(r, "ereport_invite_mail", "mail failed")
		}
	}
	a.auditEvent(r, "ereport_invite_create", "ok", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{
		"invite":      inv.public(),
		"link":        link,
		"hash":        secret,
		"emailsSent":  len(recipients),
		"expiresAt":   inv.ExpiresAt,
		"message":     message,
	})
}

func (a *App) ereportGetInviteHandler(w http.ResponseWriter, r *http.Request) {
	inv, ok := a.loadInviteWithSecret(w, r)
	if !ok {
		return
	}
	expired := inviteExpired(inv, time.Now().UTC())
	writeJSON(w, http.StatusOK, map[string]any{
		"invite":   inv.public(),
		"valid":    !expired,
		"expired":  expired,
		"needsOtp": inviteNeedsOTP(inv) && !expired,
		"canEdit":  inv.CanEdit && !expired,
	})
}

func (a *App) ereportInviteViewReportHandler(w http.ResponseWriter, r *http.Request) {
	inv, secret, ok := a.loadInviteWithSecretValue(w, r)
	if !ok {
		return
	}
	if inviteExpired(inv, time.Now().UTC()) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	if inv.Scope != inviteScopeReport || inv.ReportID == "" {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	if inviteNeedsOTP(inv) {
		// Org-style email-bound invites still require the OTP session path.
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	meta, payload, err := a.ereport.loadReport(inv.OwnerUserID, inv.OrgID, inv.ReportID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	rewritten, _ := rewriteEreportImageURLs(payload, inv.ID, secret).(map[string]any)
	if rewritten == nil {
		rewritten = payload
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"meta":    meta,
		"payload": rewritten,
		"canEdit": inv.CanEdit,
		"isOwner": false,
	})
}

func (a *App) ereportInviteViewImageHandler(w http.ResponseWriter, r *http.Request) {
	inv, _, ok := a.loadInviteWithSecretValue(w, r)
	if !ok {
		return
	}
	if inviteExpired(inv, time.Now().UTC()) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	if inv.Scope != inviteScopeReport || inviteNeedsOTP(inv) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	a.serveEreportImage(w, r, inv.OwnerUserID, inv.OrgID, inv.ReportID, r.PathValue("imageId"))
}

func rewriteEreportImageURLs(v any, inviteID, secret string) any {
	switch t := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(t))
		for k, val := range t {
			if k == "url" {
				if s, ok := val.(string); ok {
					if id := extractEreportImageID(s); id != "" {
						out[k] = "/api/ereport/invites/" + inviteID + "/images/" + id + "?t=" + url.QueryEscape(secret)
						continue
					}
				}
			}
			out[k] = rewriteEreportImageURLs(val, inviteID, secret)
		}
		return out
	case []any:
		out := make([]any, len(t))
		for i, item := range t {
			out[i] = rewriteEreportImageURLs(item, inviteID, secret)
		}
		return out
	default:
		return v
	}
}

func extractEreportImageID(raw string) string {
	path := strings.TrimSpace(raw)
	if path == "" || !strings.Contains(path, "/images/") {
		return ""
	}
	if i := strings.Index(path, "?"); i >= 0 {
		path = path[:i]
	}
	parts := strings.Split(strings.Trim(path, "/"), "/")
	for i := 0; i+1 < len(parts); i++ {
		if parts[i] == "images" && validEreportID(parts[i+1]) {
			return parts[i+1]
		}
	}
	return ""
}

// ownerEreportImageURL is the durable URL stored on disk. Invite/shared session
// URLs are display-only and must never be persisted (they break the owner view).
func ownerEreportImageURL(orgID, reportID, imageID string) string {
	return "/api/ereport/orgs/" + orgID + "/reports/" + reportID + "/images/" + imageID
}

func canonicalizeEreportImageURLs(v any, orgID, reportID string) any {
	switch t := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(t))
		for k, val := range t {
			if k == "url" {
				if s, ok := val.(string); ok {
					if id := extractEreportImageID(s); id != "" {
						out[k] = ownerEreportImageURL(orgID, reportID, id)
						continue
					}
				}
			}
			out[k] = canonicalizeEreportImageURLs(val, orgID, reportID)
		}
		return out
	case []any:
		out := make([]any, len(t))
		for i, item := range t {
			out[i] = canonicalizeEreportImageURLs(item, orgID, reportID)
		}
		return out
	default:
		return v
	}
}

func canonicalizeEreportPayload(payload map[string]any, orgID, reportID string) map[string]any {
	if payload == nil {
		return nil
	}
	out, _ := canonicalizeEreportImageURLs(payload, orgID, reportID).(map[string]any)
	if out == nil {
		return payload
	}
	return out
}

func ereportPayloadHasTransientImageURLs(v any) bool {
	switch t := v.(type) {
	case map[string]any:
		for k, val := range t {
			if k == "url" {
				if s, ok := val.(string); ok {
					if strings.Contains(s, "/invite-session/") || strings.Contains(s, "/ereport/shared/") || strings.Contains(s, "/ereport/invites/") {
						return true
					}
				}
			}
			if ereportPayloadHasTransientImageURLs(val) {
				return true
			}
		}
	case []any:
		for _, item := range t {
			if ereportPayloadHasTransientImageURLs(item) {
				return true
			}
		}
	}
	return false
}

func (a *App) loadInviteWithSecret(w http.ResponseWriter, r *http.Request) (ereportInvite, bool) {
	inv, _, ok := a.loadInviteWithSecretValue(w, r)
	return inv, ok
}

func (a *App) loadInviteWithSecretValue(w http.ResponseWriter, r *http.Request) (ereportInvite, string, bool) {
	id := r.PathValue("inviteId")
	secret := strings.TrimSpace(r.URL.Query().Get("t"))
	if secret == "" {
		secret = strings.TrimSpace(r.Header.Get("X-Ereport-Invite"))
	}
	inv, err := a.ereport.loadInvite(id)
	if err != nil || !a.verifyInviteSecret(inv, secret) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return ereportInvite{}, "", false
	}
	return inv, secret, true
}

func (a *App) ereportInviteOTPHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	inv, ok := a.loadInvitePosted(w, r)
	if !ok {
		return
	}
	if inviteExpired(inv, time.Now().UTC()) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	var body struct {
		Email string `json:"email"`
		T     string `json:"t"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	_, emailNorm, emailOK := normalizeEmail(body.Email)
	ip := clientIP(r.RemoteAddr)
	if !a.inviteOTPLimit.allow(inv.ID) || !a.inviteOTPLimit.allow(ip) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	if !a.verifyInviteSecret(inv, body.T) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if !emailOK || emailNorm != inv.InvitedEmail {
		a.auditEvent(r, "ereport_invite_otp", "denied", "")
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}
	inv.OTPRequests++
	if inv.OTPRequests > 8 {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	_ = a.ereport.saveInvite(inv)
	code, err := a.issueBoundOTP(otpEreportInvite, emailNorm, inv.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if err := a.mailer.Send(emailNorm, "Your eReport invite code", "Your eReport invite code expires in 10 minutes.\n\n"+code+"\n"); err != nil {
		a.logUnexpected(r, "ereport_invite_otp_mail", "mail failed")
	}
	a.auditEvent(r, "ereport_invite_otp", "sent", "")
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) loadInvitePosted(w http.ResponseWriter, r *http.Request) (ereportInvite, bool) {
	id := r.PathValue("inviteId")
	inv, err := a.ereport.loadInvite(id)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return ereportInvite{}, false
	}
	return inv, true
}

func (a *App) ereportInviteVerifyHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	inv, ok := a.loadInvitePosted(w, r)
	if !ok {
		return
	}
	if inviteExpired(inv, time.Now().UTC()) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	var body struct {
		Email string `json:"email"`
		OTP   string `json:"otp"`
		T     string `json:"t"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	if !a.verifyInviteSecret(inv, body.T) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	_, emailNorm, emailOK := normalizeEmail(body.Email)
	if !a.inviteVerifyLim.allow(inv.ID) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	if !emailOK || emailNorm != inv.InvitedEmail || !validOTP(body.OTP) {
		a.writeSafeError(w, r, http.StatusUnauthorized, "invalid_credentials")
		return
	}
	if _, err := a.consumeBoundOTP(otpEreportInvite, emailNorm, inv.ID, body.OTP); err != nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "invalid_credentials")
		return
	}
	out, ok := a.establishInviteSession(w, r, &inv)
	if !ok {
		return
	}
	a.grantAccountShareForSessionUser(r, &inv)
	a.auditEvent(r, "ereport_invite_verify", "ok", "")
	writeJSON(w, http.StatusOK, out)
}

func rewriteInviteSessionImageURLs(v any, reportID string) any {
	switch t := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(t))
		for k, val := range t {
			if k == "url" {
				if s, ok := val.(string); ok {
					if id := extractEreportImageID(s); id != "" {
						out[k] = "/api/ereport/invite-session/reports/" + reportID + "/images/" + id
						continue
					}
				}
			}
			out[k] = rewriteInviteSessionImageURLs(val, reportID)
		}
		return out
	case []any:
		out := make([]any, len(t))
		for i, item := range t {
			out[i] = rewriteInviteSessionImageURLs(item, reportID)
		}
		return out
	default:
		return v
	}
}

func (a *App) establishInviteSession(w http.ResponseWriter, r *http.Request, inv *ereportInvite) (map[string]any, bool) {
	sessionSecret := randomID(24)
	inv.SessionHash = a.hashOpaque("ereport-invite-session:"+inv.ID, sessionSecret)
	inv.ConsumedOTPAt = time.Now().UTC().Format(time.RFC3339)
	if err := a.ereport.saveInvite(*inv); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return nil, false
	}
	exp, _ := time.Parse(time.RFC3339, inv.ExpiresAt)
	maxAge := int(time.Until(exp).Seconds())
	if maxAge < 1 {
		maxAge = 60
	}
	a.setCookie(w, a.inviteCookieName(), inv.ID+"."+sessionSecret, maxAge)
	out := map[string]any{
		"ok":      true,
		"invite":  inv.public(),
		"canEdit": inv.CanEdit,
	}
	if inv.Scope == inviteScopeOrg {
		lib, _ := a.ereport.loadOrgLibrary(inv.OwnerUserID, inv.OrgID)
		out["reports"] = lib.Reports
	} else if inv.ReportID != "" {
		meta, payload, err := a.ereport.loadReport(inv.OwnerUserID, inv.OrgID, inv.ReportID)
		if err == nil {
			rewritten, _ := rewriteInviteSessionImageURLs(payload, inv.ReportID).(map[string]any)
			if rewritten == nil {
				rewritten = payload
			}
			out["meta"] = meta
			out["payload"] = rewritten
		}
	}
	return out, true
}

func (a *App) ereportInviteClaimHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	inv, ok := a.loadInvitePosted(w, r)
	if !ok {
		return
	}
	if inviteExpired(inv, time.Now().UTC()) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	if inviteNeedsOTP(inv) {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	var body struct {
		T string `json:"t"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	secret := strings.TrimSpace(body.T)
	if secret == "" {
		secret = strings.TrimSpace(r.URL.Query().Get("t"))
	}
	if !a.verifyInviteSecret(inv, secret) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	out, ok := a.establishInviteSession(w, r, &inv)
	if !ok {
		return
	}
	a.grantAccountShareForSessionUser(r, &inv)
	a.auditEvent(r, "ereport_invite_claim", "ok", "")
	writeJSON(w, http.StatusOK, out)
}

// grantAccountShareForSessionUser puts the report under Shared with me when the
// invitee is already signed into Eduardo OS (or queues a pending share by email).
func (a *App) grantAccountShareForSessionUser(r *http.Request, inv *ereportInvite) {
	if inv == nil || inv.Scope != inviteScopeReport || inv.ReportID == "" {
		return
	}
	sessionUser := a.currentUser(r)
	if sessionUser == nil {
		return
	}
	owner, oErr := a.store.UserByID(r.Context(), inv.OwnerUserID)
	if oErr != nil || owner == nil {
		return
	}
	meta, _, loadErr := a.ereport.loadReport(inv.OwnerUserID, inv.OrgID, inv.ReportID)
	if loadErr != nil {
		return
	}
	a.upsertAccountShare(owner, inv.OrgID, inv.ReportID, inv.ID, sessionUser.Email, inv.CanEdit, meta)
	a.redeemPendingShares(sessionUser)
}

func (a *App) requireInviteSession(w http.ResponseWriter, r *http.Request) *ereportInvite {
	inv := a.currentInvite(r)
	if inv == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return nil
	}
	return inv
}

func (a *App) ereportInviteSessionHandler(w http.ResponseWriter, r *http.Request) {
	inv := a.requireInviteSession(w, r)
	if inv == nil {
		return
	}
	out := map[string]any{"invite": inv.public(), "canEdit": inv.CanEdit}
	if inv.Scope == inviteScopeOrg {
		lib, _ := a.ereport.loadOrgLibrary(inv.OwnerUserID, inv.OrgID)
		out["reports"] = lib.Reports
	} else {
		meta, payload, err := a.ereport.loadReport(inv.OwnerUserID, inv.OrgID, inv.ReportID)
		if err != nil {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		rewritten, _ := rewriteInviteSessionImageURLs(payload, inv.ReportID).(map[string]any)
		if rewritten == nil {
			rewritten = payload
		}
		out["meta"] = meta
		out["payload"] = rewritten
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) ereportInviteGetReportHandler(w http.ResponseWriter, r *http.Request) {
	inv := a.requireInviteSession(w, r)
	if inv == nil {
		return
	}
	reportID := r.PathValue("reportId")
	if !a.inviteCovers(*inv, inv.OrgID, reportID) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	meta, payload, err := a.ereport.loadReport(inv.OwnerUserID, inv.OrgID, reportID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	rewritten, _ := rewriteInviteSessionImageURLs(payload, reportID).(map[string]any)
	if rewritten == nil {
		rewritten = payload
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"meta":    meta,
		"payload": rewritten,
		"canEdit": inv.CanEdit,
		"isOwner": false,
	})
}

func (a *App) ereportInvitePutReportHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	inv := a.requireInviteSession(w, r)
	if inv == nil {
		return
	}
	if !inv.CanEdit {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	reportID := r.PathValue("reportId")
	if !a.inviteCovers(*inv, inv.OrgID, reportID) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	meta, storedPayload, err := a.ereport.loadReport(inv.OwnerUserID, inv.OrgID, reportID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body struct {
		Tema    *string        `json:"tema"`
		Payload map[string]any `json:"payload"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	if body.Payload == nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	// Org invite sessions stay additive; report link shares may fully edit.
	if inv.Scope != inviteScopeReport {
		if err := assertInviteNoDeletes(storedPayload, body.Payload); err != nil {
			if ae := asAPIWriteErr(err); ae != nil && ae.Code == "forbidden" {
				a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
				return
			}
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
	}
	if body.Tema != nil {
		tema := strings.TrimSpace(*body.Tema)
		if tema == "" {
			tema = "Sin tema"
		}
		meta.Tema = tema
	}
	if n, ok := body.Payload["reportNumber"].(string); ok {
		meta.ReportNumber = n
	}
	if d, ok := body.Payload["reportDate"].(string); ok {
		meta.ReportDate = d
	}
	meta.UpdatedAt = nowRFC3339()
	// Persist owner URLs only — invite-session/shared display URLs break the owner view.
	payload := canonicalizeEreportPayload(body.Payload, meta.OrgID, reportID)
	if err := a.ereport.saveReport(inv.OwnerUserID, meta, payload); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.touchLibrary(inv.OwnerUserID, meta)
	a.auditEvent(r, "ereport_invite_save", "ok", "")
	rewritten, _ := rewriteInviteSessionImageURLs(payload, reportID).(map[string]any)
	if rewritten == nil {
		rewritten = payload
	}
	writeJSON(w, http.StatusOK, map[string]any{"meta": meta, "payload": rewritten})
}

func (a *App) issueBoundOTP(purpose, emailNorm, bindID string) (string, error) {
	code, err := randomOTP()
	if err != nil {
		return "", err
	}
	_ = a.store.InvalidateOTPs(context.Background(), purpose, emailNorm)
	now := time.Now().UTC()
	rec := &OTPRecord{
		ID:              randomID(12),
		Purpose:         purpose,
		EmailNormalized: emailNorm,
		UserID:          bindID,
		OTPHash:         a.hashOpaque("otp:"+purpose+":"+bindID+":"+emailNorm, code),
		ExpiresAt:       now.Add(otpTTL),
		CreatedAt:       now,
	}
	if err := a.store.InsertOTP(context.Background(), rec); err != nil {
		return "", err
	}
	return code, nil
}

func (a *App) consumeBoundOTP(purpose, emailNorm, bindID, code string) (*OTPRecord, error) {
	otp, err := a.store.LatestOTP(context.Background(), purpose, emailNorm)
	if err != nil {
		return nil, errNotFound
	}
	if otp.UserID != bindID || otp.ConsumedAt != nil {
		return nil, errNotFound
	}
	if otp.Attempts >= otpMaxAttempts {
		return nil, errOTPLocked
	}
	if time.Now().UTC().After(otp.ExpiresAt) {
		return nil, errOTPExpired
	}
	want := a.hashOpaque("otp:"+purpose+":"+bindID+":"+emailNorm, strings.TrimSpace(code))
	if !hmacEqual(want, otp.OTPHash) {
		otp.Attempts++
		if otp.Attempts >= otpMaxAttempts {
			now := time.Now().UTC()
			otp.ConsumedAt = &now
		}
		_ = a.store.UpdateOTP(context.Background(), otp)
		return nil, errNotFound
	}
	now := time.Now().UTC()
	otp.ConsumedAt = &now
	_ = a.store.UpdateOTP(context.Background(), otp)
	return otp, nil
}
