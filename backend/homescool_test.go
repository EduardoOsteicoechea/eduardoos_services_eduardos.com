package main

import (
	"net/http"
	"testing"
)

func TestHomescoolTeacherRequiresEntitlement(t *testing.T) {
	app := newTestApp(false)
	rec := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/homescool/students", "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d %s", rec.Code, rec.Body.String())
	}
}
