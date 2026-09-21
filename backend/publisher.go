package main

import (
	"encoding/json"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"strings"
	"time"
)

const (
	publisherSiteID      = "eduardoos"
	publisherProxyWindow = time.Hour
	publisherProxyMax    = 30
	defaultOratoMaxBytes = 2 << 30
)

func (a *App) oratoConfigured() bool {
	return strings.TrimSpace(a.cfg.OratoBaseURL) != "" && strings.TrimSpace(a.cfg.OratoServiceKey) != ""
}

func (a *App) oratoMaxBytes() int64 {
	if a.cfg.OratoMaxUploadBytes > 0 {
		return a.cfg.OratoMaxUploadBytes
	}
	return defaultOratoMaxBytes
}

func (a *App) publisherPublishHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireAdmin(w, r)
	if user == nil {
		return
	}
	if !a.publisherLimit.allow("user:" + user.ID) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	if !a.oratoConfigured() {
		if a.cfg.MustLog {
			a.log.Info("publisher_orato_unconfigured", slog.String("request_id", requestIDFrom(r, w)))
		}
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, a.oratoMaxBytes())
	mr, err := r.MultipartReader()
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}

	pr, pw := io.Pipe()
	mw := multipart.NewWriter(pw)
	copyErr := make(chan error, 1)
	go func() {
		defer func() {
			_ = mw.Close()
			_ = pw.Close()
		}()
		for {
			part, err := mr.NextPart()
			if err == io.EOF {
				break
			}
			if err != nil {
				_ = pw.CloseWithError(err)
				copyErr <- err
				return
			}
			name := part.FormName()
			filename := part.FileName()
			var dest io.Writer
			var createErr error
			if filename != "" {
				dest, createErr = mw.CreateFormFile(name, filename)
			} else {
				dest, createErr = mw.CreateFormField(name)
			}
			if createErr != nil {
				_ = part.Close()
				_ = pw.CloseWithError(createErr)
				copyErr <- createErr
				return
			}
			if _, err := io.Copy(dest, part); err != nil {
				_ = part.Close()
				_ = pw.CloseWithError(err)
				copyErr <- err
				return
			}
			_ = part.Close()
		}
		_ = mw.WriteField("source_site_id", publisherSiteID)
		_ = mw.WriteField("source_creator_job_id", user.ID+"-"+randomID(12))
		copyErr <- nil
	}()

	oratoURL := strings.TrimRight(a.cfg.OratoBaseURL, "/") + "/v1/publish"
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, oratoURL, pr)
	if err != nil {
		_ = pw.CloseWithError(err)
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	req.Header.Set("Authorization", "Bearer "+a.cfg.OratoServiceKey)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("X-Request-ID", requestIDFrom(r, w))

	if a.cfg.MustLog {
		a.log.Info("publisher_proxy_start",
			slog.String("request_id", requestIDFrom(r, w)),
			slog.String("user_id", user.ID),
			slog.String("path", "/v1/publish"),
		)
	}

	client := &http.Client{Timeout: 30 * time.Minute}
	resp, err := client.Do(req)
	if cerr := <-copyErr; cerr != nil && err == nil {
		err = cerr
	}
	if err != nil {
		if a.cfg.MustLog {
			a.log.Info("publisher_proxy_error",
				slog.String("request_id", requestIDFrom(r, w)),
				slog.String("err", redactLogValue(err.Error())),
			)
		}
		a.writeSafeError(w, r, http.StatusBadGateway, "internal_error")
		return
	}
	defer resp.Body.Close()
	a.auditEvent(r, "publisher_publish", "forwarded", user.ID)
	a.relayOratoResponse(w, r, resp)
}

func (a *App) publisherGetJobHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireAdminRead(w, r)
	if user == nil {
		return
	}
	if !a.oratoConfigured() {
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" || strings.ContainsAny(id, "/\\") {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	oratoURL := strings.TrimRight(a.cfg.OratoBaseURL, "/") + "/v1/jobs/" + id
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, oratoURL, nil)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	req.Header.Set("Authorization", "Bearer "+a.cfg.OratoServiceKey)
	req.Header.Set("X-Request-ID", requestIDFrom(r, w))
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		if a.cfg.MustLog {
			a.log.Info("publisher_job_error",
				slog.String("request_id", requestIDFrom(r, w)),
				slog.String("err", redactLogValue(err.Error())),
			)
		}
		a.writeSafeError(w, r, http.StatusBadGateway, "internal_error")
		return
	}
	defer resp.Body.Close()
	a.relayOratoResponse(w, r, resp)
}

func (a *App) relayOratoResponse(w http.ResponseWriter, r *http.Request, resp *http.Response) {
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadGateway, "internal_error")
		return
	}
	if rid := strings.TrimSpace(resp.Header.Get("X-Request-ID")); rid != "" {
		w.Header().Set("X-Request-ID", rid)
	} else {
		_ = requestIDFrom(r, w)
	}
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		ct := resp.Header.Get("Content-Type")
		if ct == "" {
			ct = "application/json"
		}
		w.Header().Set("Content-Type", ct)
		w.WriteHeader(resp.StatusCode)
		_, _ = w.Write(raw)
		return
	}
	var body map[string]any
	if json.Unmarshal(raw, &body) == nil {
		if _, ok := body["error"]; ok {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(resp.StatusCode)
			_, _ = w.Write(raw)
			return
		}
	}
	code := "internal_error"
	switch resp.StatusCode {
	case http.StatusBadRequest:
		code = "invalid_request"
	case http.StatusUnauthorized, http.StatusForbidden:
		code = "forbidden"
	case http.StatusRequestEntityTooLarge:
		code = "payload_too_large"
	case http.StatusNotFound:
		code = "not_found"
	}
	status := resp.StatusCode
	if status < 400 {
		status = http.StatusBadGateway
	}
	a.writeSafeError(w, r, status, code)
}
