package main

import (
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
	return n >= 12 && n <= 128
}

func validOTP(raw string) bool {
	return otpRE.MatchString(strings.TrimSpace(raw))
}

func clientIP(rAddr string) string {
	host := rAddr
	if i := strings.LastIndex(host, ":"); i >= 0 {
		host = host[:i]
	}
	return strings.Trim(host, "[]")
}
