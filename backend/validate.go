package main

import (
	"net"
	"net/http"
	"net/mail"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"
)

var (
	usernameRE = regexp.MustCompile(`^[a-z0-9_]{3,32}$`)
	e164RE     = regexp.MustCompile(`^\+[1-9]\d{7,14}$`)
	otpRE      = regexp.MustCompile(`^\d{6}$`)
)

func normalizeEmail(raw string) (display, normalized string, ok bool) {
	display = strings.TrimSpace(raw)
	if display == "" || len(display) > 254 {
		return "", "", false
	}
	parsed, err := mail.ParseAddress(display)
	if err != nil || parsed.Address == "" {
		return "", "", false
	}
	normalized = strings.ToLower(parsed.Address)
	return parsed.Address, normalized, true
}

func normalizeUsername(raw string) (string, bool) {
	value := strings.ToLower(strings.TrimSpace(raw))
	if !usernameRE.MatchString(value) {
		return "", false
	}
	return value, true
}

func normalizePhone(raw string) (string, bool) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", true
	}
	var b strings.Builder
	for _, r := range trimmed {
		if r == '+' || (r >= '0' && r <= '9') {
			b.WriteRune(r)
			continue
		}
		if unicode.IsSpace(r) || r == '-' || r == '(' || r == ')' {
			continue
		}
		return "", false
	}
	value := b.String()
	if !e164RE.MatchString(value) {
		return "", false
	}
	return value, true
}

func normalizeDisplayName(raw string) (string, bool) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", false
	}
	if utf8.RuneCountInString(value) > 80 {
		return "", false
	}
	for _, r := range value {
		if unicode.IsControl(r) {
			return "", false
		}
	}
	if strings.TrimSpace(value) == "" {
		return "", false
	}
	return value, true
}

func validPassword(raw string) bool {
	n := utf8.RuneCountInString(raw)
	return n >= 8 && n <= 128
}

func validOTP(raw string) bool {
	return otpRE.MatchString(strings.TrimSpace(raw))
}

// clientIP returns the client address for rate limits and audit.
// When the peer is a loopback proxy (Nginx → API on 127.0.0.1), trust the
// left-most X-Forwarded-For / X-Real-IP value Nginx sets. Otherwise use the
// direct peer so clients cannot spoof the header against a public bind.
func clientIP(r *http.Request) string {
	if r == nil {
		return ""
	}
	peer := peerHost(r.RemoteAddr)
	if isLoopbackHost(peer) {
		if xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); xff != "" {
			first := strings.TrimSpace(strings.Split(xff, ",")[0])
			if host := peerHost(first); host != "" {
				return host
			}
		}
		if xri := strings.TrimSpace(r.Header.Get("X-Real-IP")); xri != "" {
			if host := peerHost(xri); host != "" {
				return host
			}
		}
	}
	return peer
}

func peerHost(rAddr string) string {
	host := strings.TrimSpace(rAddr)
	if host == "" {
		return ""
	}
	if h, _, err := net.SplitHostPort(host); err == nil {
		return strings.Trim(h, "[]")
	}
	return strings.Trim(host, "[]")
}

func isLoopbackHost(host string) bool {
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}
