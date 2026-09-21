package main

import (
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

func TestPublisherRequiresAdmin(t *testing.T) {
	app := newTestApp(false)
	app.cfg.OratoBaseURL = "http://127.0.0.1:9"
	app.cfg.OratoServiceKey = "test-key"
	var buf strings.Builder
	mw := multipart.NewWriter(&buf)
	_ = mw.WriteField("title", "t")
	_ = mw.WriteField("article_body", "hello")
	_ = mw.WriteField("channels", "facebook")
	_ = mw.Close()
	req, rec := app.authedReq(t, "member@eduardoos.com", http.MethodPost, "/api/publisher/publish", buf.String())
	req.Header.Set("Content-Type", mw.FormDataContentType())
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("member publish: %d %s", rec.Code, rec.Body.String())
	}
}

func TestPublisherUnconfigured(t *testing.T) {
	app := newTestApp(false)
	app.cfg.OratoBaseURL = ""
	app.cfg.OratoServiceKey = ""
	var buf strings.Builder
	mw := multipart.NewWriter(&buf)
	_ = mw.WriteField("article_body", "hello")
	_ = mw.WriteField("channels", "facebook")
	_ = mw.Close()
	req, rec := app.authedReq(t, "admin@eduardoos.com", http.MethodPost, "/api/publisher/publish", buf.String())
	req.Header.Set("Content-Type", mw.FormDataContentType())
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("unconfigured: %d %s", rec.Code, rec.Body.String())
	}
}

func TestPublisherProxiesToOrato(t *testing.T) {
	var mu sync.Mutex
	var gotAuth string
	var gotParts map[string]string
	orato := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		gotAuth = r.Header.Get("Authorization")
		gotParts = map[string]string{}
		if err := r.ParseMultipartForm(1 << 20); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		for k, vals := range r.MultipartForm.Value {
			if len(vals) > 0 {
				gotParts[k] = vals[0]
			}
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		_, _ = w.Write([]byte(`{"job_id":"job1","status":"pending","request_id":"rid-orato"}`))
	}))
	defer orato.Close()

	app := newTestApp(false)
	app.cfg.OratoBaseURL = orato.URL
	app.cfg.OratoServiceKey = "secret-orato-key"

	var buf strings.Builder
	mw := multipart.NewWriter(&buf)
	_ = mw.WriteField("title", "Hello")
	_ = mw.WriteField("article_body", "Body text")
	_ = mw.WriteField("channels", "facebook,whatsapp")
	_ = mw.Close()

	req, rec := app.authedReq(t, "admin@eduardoos.com", http.MethodPost, "/api/publisher/publish", buf.String())
	req.Header.Set("Content-Type", mw.FormDataContentType())
	app.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("proxy publish: %d %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatal(err)
	}
	if out["job_id"] != "job1" {
		t.Fatalf("job_id=%v", out["job_id"])
	}
	mu.Lock()
	defer mu.Unlock()
	if gotAuth != "Bearer secret-orato-key" {
		t.Fatalf("auth=%q", gotAuth)
	}
	if gotParts["article_body"] != "Body text" {
		t.Fatalf("parts=%#v", gotParts)
	}
	if gotParts["source_site_id"] != "eduardoos" {
		t.Fatalf("source missing: %#v", gotParts)
	}
	if gotParts["source_creator_job_id"] == "" {
		t.Fatal("expected creator job id")
	}
}

func TestPublisherGetJob(t *testing.T) {
	orato := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/jobs/abc" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"id":"abc","status":"published"}`)
	}))
	defer orato.Close()

	app := newTestApp(false)
	app.cfg.OratoBaseURL = orato.URL
	app.cfg.OratoServiceKey = "k"
	rec := app.doJSON(t, "admin@eduardoos.com", http.MethodGet, "/api/publisher/jobs/abc", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("get job: %d %s", rec.Code, rec.Body.String())
	}
}
