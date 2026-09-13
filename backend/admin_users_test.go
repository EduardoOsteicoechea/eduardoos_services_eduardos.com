package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestListUsersAdminOnly(t *testing.T) {
	app := newTestApp(true)

	guest := httptest.NewRequest(http.MethodGet, "/api/admin/users", nil)
	guestRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(guestRec, guest)
	if guestRec.Code != http.StatusUnauthorized {
		t.Fatalf("guest list users: %d %s", guestRec.Code, guestRec.Body.String())
	}

	member := httptest.NewRequest(http.MethodGet, "/api/admin/users", nil)
	memberSeed := httptest.NewRecorder()
	if _, err := app.issueSession(memberSeed, app.mustUser("member@"+siteName)); err != nil {
		t.Fatal(err)
	}
	copyCookies(member, memberSeed)
	memberRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(memberRec, member)
	if memberRec.Code != http.StatusForbidden {
		t.Fatalf("member list users: %d %s", memberRec.Code, memberRec.Body.String())
	}

	admin := httptest.NewRequest(http.MethodGet, "/api/admin/users", nil)
	adminSeed := httptest.NewRecorder()
	if _, err := app.issueSession(adminSeed, app.mustUser("admin@"+siteName)); err != nil {
		t.Fatal(err)
	}
	copyCookies(admin, adminSeed)
	adminRec := httptest.NewRecorder()
	app.Handler().ServeHTTP(adminRec, admin)
	if adminRec.Code != http.StatusOK {
		t.Fatalf("admin list users: %d %s", adminRec.Code, adminRec.Body.String())
	}
	var body struct {
		Users []map[string]any `json:"users"`
		Count int              `json:"count"`
	}
	if err := json.Unmarshal(adminRec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Count < 2 {
		t.Fatalf("expected at least admin and member, got %d", body.Count)
	}
	for _, row := range body.Users {
		if _, ok := row["password_hash"]; ok {
			t.Fatal("password hash must not be exposed")
		}
	}
}

func TestAdminCanGrantAndRevokeServices(t *testing.T) {
	app := newTestApp(true)
	req, rec := app.adminPOST(t, "/api/admin/users/member-1/services", `{"services":["pamphlet","evoice"]}`)
	req.Method = http.MethodPut
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("grant services: %d %s", rec.Code, rec.Body.String())
	}
	access := app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/subscriptions/access/pamphlet", "")
	if access.Code != http.StatusOK || decodeMap(t, access)["allowed"] != true {
		t.Fatalf("manual access not granted: %d %s", access.Code, access.Body.String())
	}
	req, rec = app.adminPOST(t, "/api/admin/users/member-1/services", `{"services":[]}`)
	req.Method = http.MethodPut
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("revoke services: %d %s", rec.Code, rec.Body.String())
	}
	access = app.doJSON(t, "member@eduardoos.com", http.MethodGet, "/api/subscriptions/access/pamphlet", "")
	if decodeMap(t, access)["allowed"] != false {
		t.Fatalf("manual access not revoked: %s", access.Body.String())
	}
}
