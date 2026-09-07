package main

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"
)

func (a *App) inviteLandingURL(r *http.Request, inviteID, secret string) string {
	return a.publicBase(r) + "/ereport/invite?invite=" + inviteID + "&t=" + secret
}

func (a *App) verifyInviteSecret(inv ereportInvite, secret string) bool {
	if strings.TrimSpace(secret) == "" || inv.SecretHash == "" {
		return false
	}
	want := a.hashOpaque("ereport-invite:"+inv.ID, secret)
	return hmacEqual(want, inv.SecretHash)
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
	if hours < 1 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if hours > 24*30 {
		hours = 24 * 30
	}
	a.writeInvite(w, r, user, orgMeta.ID, "", inviteScopeOrg, to, time.Duration(hours)*time.Hour)
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
		Email string `json:"email"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	_, to, emailOK := normalizeEmail(body.Email)
	if !emailOK {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	a.writeInvite(w, r, user, meta.OrgID, meta.ID, inviteScopeReport, to, time.Hour)
}

func (a *App) writeInvite(w http.ResponseWriter, r *http.Request, user *User, orgID, reportID, scope, email string, ttl time.Duration) {
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
		ExpiresAt:    now.Add(ttl).Format(time.RFC3339),
		CreatedAt:    now.Format(time.RFC3339),
		CanEdit:      true,
	}
	if err := a.ereport.saveInvite(inv); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	link := a.inviteLandingURL(r, id, secret)
	subject := "eReport invite"
	body := fmt.Sprintf("You have been invited to collaborate on an eReport.\n\nOpen this link and enter the verification code sent to this mailbox:\n%s\n\nAccess expires at %s (UTC).\n", link, inv.ExpiresAt)
	if err := a.mailer.Send(email, subject, body); err != nil {
		a.logUnexpected(r, "ereport_invite_mail", "mail failed")
	}
	a.auditEvent(r, "ereport_invite_create", "ok", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{
		"invite": inv.public(),
		"link":   link,
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
		"needsOtp": inv.SessionHash == "",
		"canEdit":  inv.CanEdit && !expired,
	})
}

func (a *App) loadInviteWithSecret(w http.ResponseWriter, r *http.Request) (ereportInvite, bool) {
	id := r.PathValue("inviteId")
	secret := strings.TrimSpace(r.URL.Query().Get("t"))
	if secret == "" {
		secret = strings.TrimSpace(r.Header.Get("X-Ereport-Invite"))
	}
	inv, err := a.ereport.loadInvite(id)
	if err != nil || !a.verifyInviteSecret(inv, secret) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return ereportInvite{}, false
	}
	return inv, true
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
	sessionSecret := randomID(24)
	inv.SessionHash = a.hashOpaque("ereport-invite-session:"+inv.ID, sessionSecret)
	inv.ConsumedOTPAt = time.Now().UTC().Format(time.RFC3339)
	if err := a.ereport.saveInvite(inv); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	exp, _ := time.Parse(time.RFC3339, inv.ExpiresAt)
	maxAge := int(time.Until(exp).Seconds())
	if maxAge < 1 {
		maxAge = 60
	}
	a.setCookie(w, a.inviteCookieName(), inv.ID+"."+sessionSecret, maxAge)
	a.auditEvent(r, "ereport_invite_verify", "ok", "")
	out := map[string]any{
		"ok":      true,
		"invite":  inv.public(),
		"canEdit": inv.CanEdit,
	}
	if inv.Scope == inviteScopeOrg {
		lib, _ := a.ereport.loadOrgLibrary(inv.OwnerUserID, inv.OrgID)
		out["reports"] = lib.Reports
	}
	writeJSON(w, http.StatusOK, out)
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
		out["meta"] = meta
		out["payload"] = payload
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
	writeJSON(w, http.StatusOK, map[string]any{
		"meta":    meta,
		"payload": payload,
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
	meta, _, err := a.ereport.loadReport(inv.OwnerUserID, inv.OrgID, reportID)
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
	if err := a.ereport.saveReport(inv.OwnerUserID, meta, body.Payload); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.touchLibrary(inv.OwnerUserID, meta)
	a.auditEvent(r, "ereport_invite_save", "ok", "")
	writeJSON(w, http.StatusOK, map[string]any{"meta": meta, "payload": body.Payload})
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
