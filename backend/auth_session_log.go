package main

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
)

func (a *App) smtpDebugState() string {
	if a.cfg.SMTPHost == "" {
		return "missing_host"
	}
	if a.cfg.SMTPPort == "" {
		return "missing_port"
	}
	if a.cfg.SMTPUsername == "" {
		return "missing_username"
	}
	if a.cfg.SMTPPassword == "" {
		return "missing_password"
	}
	return "configured"
}

func emailLogDomain(emailNorm string) string {
	if i := strings.LastIndex(emailNorm, "@"); i >= 0 && i < len(emailNorm)-1 {
		return emailNorm[i+1:]
	}
	return ""
}

func otpErrorReason(err error) string {
	switch {
	case errors.Is(err, errNotFound):
		return "otp_not_found_or_mismatch"
	case errors.Is(err, errOTPLocked):
		return "otp_locked"
	case errors.Is(err, errOTPExpired):
		return "otp_expired"
	case err == nil:
		return "ok"
	default:
		return "otp_error"
	}
}

func loginDenialReason(user *User, passwordOK bool) string {
	if user == nil {
		return "user_not_found"
	}
	if user.Status == statusDisabled {
		return "user_disabled"
	}
	if user.Status != statusVerified {
		return "user_not_verified"
	}
	if !passwordOK {
		return "bad_password"
	}
	return "unknown"
}

func (a *App) issueOTPLogged(r *http.Request, user *User, purpose, emailNorm string) (string, error) {
	a.logAuthDebug(r, "issue_otp_start",
		slog.String("purpose", purpose),
		slog.String("email_domain", emailLogDomain(emailNorm)),
		slog.String("user_id", user.ID),
	)
	code, err := a.issueOTP(user, purpose, emailNorm)
	if err != nil {
		a.logAuthDebug(r, "issue_otp_failed",
			slog.String("purpose", purpose),
			slog.String("reason", redactLogValue(err.Error())),
		)
		return "", err
	}
	a.logAuthDebug(r, "issue_otp_ok",
		slog.String("purpose", purpose),
		slog.String("user_id", user.ID),
		slog.Bool("code_present", code != ""),
	)
	return code, nil
}

func (a *App) consumeOTPLogged(r *http.Request, purpose, emailNorm, code string) (*OTPRecord, error) {
	a.logAuthDebug(r, "consume_otp_start",
		slog.String("purpose", purpose),
		slog.String("email_domain", emailLogDomain(emailNorm)),
		slog.Bool("code_present", strings.TrimSpace(code) != ""),
	)
	otp, err := a.consumeOTP(purpose, emailNorm, code)
	if err != nil {
		a.logAuthDebug(r, "consume_otp_failed",
			slog.String("purpose", purpose),
			slog.String("reason", otpErrorReason(err)),
		)
		return nil, err
	}
	a.logAuthDebug(r, "consume_otp_ok",
		slog.String("purpose", purpose),
		slog.String("otp_id", otp.ID),
		slog.String("user_id", otp.UserID),
	)
	return otp, nil
}

func (a *App) issueSessionLogged(w http.ResponseWriter, r *http.Request, user *User) (*Session, error) {
	a.logAuthDebug(r, "issue_session_start",
		slog.String("user_id", user.ID),
		slog.String("status", user.Status),
	)
	sess, err := a.issueSession(w, user)
	if err != nil {
		a.logAuthDebug(r, "issue_session_failed",
			slog.String("user_id", user.ID),
			slog.String("reason", redactLogValue(err.Error())),
		)
		return nil, err
	}
	a.logAuthDebug(r, "issue_session_ok",
		slog.String("user_id", user.ID),
		slog.String("session_id", sess.SessionID),
		slog.String("family_id", sess.FamilyID),
	)
	return sess, nil
}
