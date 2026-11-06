package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"
)

type eeyesDeviceContextKey struct{}

func (a *App) registerEeyesRoutes(mux *http.ServeMux) {
	// Hub (cookie + entitlement)
	mux.HandleFunc("POST /api/eeyes/pairings", a.eeyesCreatePairing)
	mux.HandleFunc("GET /api/eeyes/pairings/{id}", a.eeyesGetPairing)
	mux.HandleFunc("GET /api/eeyes/devices", a.eeyesListDevices)
	mux.HandleFunc("PATCH /api/eeyes/devices/{id}", a.eeyesPatchDevice)
	mux.HandleFunc("DELETE /api/eeyes/devices/{id}", a.eeyesRevokeDevice)
	mux.HandleFunc("GET /api/eeyes/tasks", a.eeyesListTasks)
	mux.HandleFunc("POST /api/eeyes/tasks", a.eeyesCreateTask)
	mux.HandleFunc("PATCH /api/eeyes/tasks/{id}", a.eeyesPatchTask)
	mux.HandleFunc("PATCH /api/eeyes/tasks/{id}/pack-analysis", a.eeyesPatchPackAnalysis)
	mux.HandleFunc("DELETE /api/eeyes/tasks/{id}", a.eeyesDeleteTask)
	mux.HandleFunc("GET /api/eeyes/completions", a.eeyesListCompletions)
	mux.HandleFunc("GET /api/eeyes/media/{id}", a.eeyesGetHubMedia)
	mux.HandleFunc("PATCH /api/eeyes/media/{id}", a.eeyesPatchMedia)
	mux.HandleFunc("GET /api/eeyes/releases", a.eeyesListReleases)
	mux.HandleFunc("GET /api/eeyes/downloads/{platform}", a.eeyesDownloadRelease)

	// Device (Bearer eos_dev_)
	mux.HandleFunc("POST /api/eeyes/device/pair", a.eeyesDevicePair)
	mux.HandleFunc("GET /api/eeyes/device/sync", a.withEeyesDevice(a.eeyesDeviceSync))
	mux.HandleFunc("GET /api/eeyes/device/wait", a.withEeyesDevice(a.eeyesDeviceWait))
	mux.HandleFunc("POST /api/eeyes/device/tasks/{id}/start", a.withEeyesDevice(a.eeyesDeviceStartTask))
	mux.HandleFunc("POST /api/eeyes/device/tasks/{id}/media", a.withEeyesDevice(a.eeyesDeviceUploadMedia))
	mux.HandleFunc("POST /api/eeyes/device/tasks/{id}/complete", a.withEeyesDevice(a.eeyesDeviceCompleteTask))
	mux.HandleFunc("POST /api/eeyes/device/notifications/ack", a.withEeyesDevice(a.eeyesDeviceAckNotifications))
	mux.HandleFunc("GET /api/eeyes/device/media/{id}", a.withEeyesDevice(a.eeyesDeviceGetMedia))

	// Embedded shell UI (public HTML; secrets never included)
	mux.HandleFunc("GET /api/eeyes/ui", a.eeyesUIIndex)
	mux.HandleFunc("GET /api/eeyes/ui/{asset}", a.eeyesUIAsset)
}

func (a *App) hasEeyesAccess(r *http.Request, user *User) (allowed bool, unavailable bool) {
	if user == nil {
		return false, false
	}
	// Admin bypass must win before fail-closed entitlement mode.
	if user.Role == roleAdmin {
		return true, false
	}
	if a.failClosedEnt {
		return false, true
	}
	return a.hasProductEntitlement(r, user, productEeyes)
}

func (a *App) requireEeyesUser(w http.ResponseWriter, r *http.Request) *User {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return nil
	}
	ok, unavailable := a.hasEeyesAccess(r, user)
	if unavailable {
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return nil
	}
	if !ok {
		a.auditEvent(r, "eeyes_entitlement", "denied", user.ID)
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return nil
	}
	return user
}

func (a *App) requireEeyesUnsafe(w http.ResponseWriter, r *http.Request) *User {
	if !a.requireUnsafe(w, r) {
		return nil
	}
	return a.requireEeyesUser(w, r)
}

func randomEeyesCode4() (string, error) {
	var n uint32
	buf := make([]byte, 4)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	n = uint32(buf[0])<<24 | uint32(buf[1])<<16 | uint32(buf[2])<<8 | uint32(buf[3])
	return fmt.Sprintf("%04d", n%10000), nil
}

func (a *App) eeyesCreatePairing(w http.ResponseWriter, r *http.Request) {
	user := a.requireEeyesUnsafe(w, r)
	if user == nil {
		return
	}
	code1, err := randomEeyesCode4()
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	code2, err := randomEeyesCode4()
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	code3, err := randomEeyesCode4()
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	now := time.Now().UTC()
	p := &eeyesPairing{
		ID:        randomID(12),
		OwnerID:   user.ID,
		Code1Hash: a.hashOpaque("eeyes-pair-1", code1),
		Code2Hash: a.hashOpaque("eeyes-pair-2", code2),
		Code3Hash: a.hashOpaque("eeyes-pair-3", code3),
		Status:    eeyesPairingOpen,
		CreatedAt: now,
		ExpiresAt: now.Add(eeyesPairingTTL),
	}
	if err := a.eeyes.InsertPairing(r.Context(), p); err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eeyes_pairing_create", "ok", user.ID)
	a.mustLogf(r, "eeyes.pairing.create", "pairing_id", p.ID, "owner_id", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{
		"id":        p.ID,
		"code1":     code1,
		"code2":     code2,
		"code3":     code3,
		"expiresAt": p.ExpiresAt,
		"status":    p.Status,
	})
}

func (a *App) eeyesGetPairing(w http.ResponseWriter, r *http.Request) {
	user := a.requireEeyesUser(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	p, err := a.eeyes.PairingByID(r.Context(), id)
	if err != nil || p == nil || p.OwnerID != user.ID {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	now := time.Now().UTC()
	status := p.Status
	if status == eeyesPairingOpen && now.After(p.ExpiresAt) {
		status = eeyesPairingExpired
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id":          p.ID,
		"status":      status,
		"expiresAt":   p.ExpiresAt,
		"step":        p.Step,
		"deviceId":    p.DeviceID,
		"deviceLabel": p.DeviceLabel,
	})
}

func (a *App) eeyesDevicePair(w http.ResponseWriter, r *http.Request) {
	if !a.eeyesPairIPLimit.allow(clientIP(r)) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	// Codes are verified one per request so the hub can reveal code N+1 only
	// after code N was accepted. Step 1 issues a pairing session the device
	// must echo on steps 2 and 3; step 3 issues the device token.
	var body struct {
		Step         int    `json:"step"`
		Code1        string `json:"code1"`
		Code         string `json:"code"`
		Session      string `json:"session"`
		Platform     string `json:"platform"`
		Model        string `json:"model"`
		ShellVersion string `json:"shellVersion"`
		InstallID    string `json:"installId"`
	}
	defer r.Body.Close()
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	code1 := strings.TrimSpace(body.Code1)
	if len(code1) != 4 || body.Step < 1 || body.Step > 3 {
		a.writeSafeError(w, r, http.StatusUnauthorized, "pairing_invalid")
		return
	}
	platform := strings.ToLower(strings.TrimSpace(body.Platform))
	if platform != "android" && platform != "desktop" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	installID := strings.TrimSpace(body.InstallID)
	if len(installID) > 128 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	h1 := a.hashOpaque("eeyes-pair-1", code1)
	p, err := a.eeyes.PairingByCode1Hash(r.Context(), h1)
	if err != nil || p == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "pairing_invalid")
		return
	}
	now := time.Now().UTC()
	if p.Status != eeyesPairingOpen || now.After(p.ExpiresAt) || p.ConsumedAt != nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "pairing_invalid")
		return
	}
	if p.Attempts >= eeyesPairMaxAttempts {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	failStep := func() {
		p.Attempts++
		_ = a.eeyes.UpdatePairing(r.Context(), p)
		a.writeSafeError(w, r, http.StatusUnauthorized, "pairing_invalid")
	}
	if body.Step == 1 {
		session := randomID(24)
		p.Step = 1
		p.SessionHash = a.hashOpaque("eeyes-pair-session", session)
		if err := a.eeyes.UpdatePairing(r.Context(), p); err != nil {
			a.logUnexpected(r, "eeyes", err.Error())
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		a.mustLogf(r, "eeyes.device.pair_step", "pairing_id", p.ID, "step", 1)
		writeJSON(w, http.StatusOK, map[string]any{"step": 1, "next": 2, "session": session})
		return
	}
	session := strings.TrimSpace(body.Session)
	if session == "" || p.SessionHash == "" || p.Step != body.Step-1 ||
		!hmacEqual(a.hashOpaque("eeyes-pair-session", session), p.SessionHash) {
		failStep()
		return
	}
	codeHash := p.Code2Hash
	if body.Step == 3 {
		codeHash = p.Code3Hash
	}
	if !hmacEqual(a.hashOpaque(fmt.Sprintf("eeyes-pair-%d", body.Step), strings.TrimSpace(body.Code)), codeHash) {
		failStep()
		return
	}
	if body.Step == 2 {
		p.Step = 2
		if err := a.eeyes.UpdatePairing(r.Context(), p); err != nil {
			a.logUnexpected(r, "eeyes", err.Error())
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		a.mustLogf(r, "eeyes.device.pair_step", "pairing_id", p.ID, "step", 2)
		writeJSON(w, http.StatusOK, map[string]any{"step": 2, "next": 3})
		return
	}
	owner, err := a.store.UserByID(r.Context(), p.OwnerID)
	if err != nil || owner == nil || owner.Status != statusVerified {
		a.writeSafeError(w, r, http.StatusUnauthorized, "pairing_invalid")
		return
	}
	ok, unavailable := a.hasEeyesAccess(r, owner)
	if unavailable || !ok {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	tokenSecret := eeyesDeviceTokenPrefix + randomID(24)
	model := strings.TrimSpace(body.Model)
	if model == "" {
		model = platform
	}
	label := model
	if len(label) > 64 {
		label = label[:64]
	}
	installHash := ""
	if installID != "" {
		installHash = a.hashOpaque("eeyes-install", platform+":"+installID)
	}
	// The same install, or the same platform and model linked again, rotates
	// that one record. A different model stays linked on its own.
	existing, err := a.eeyes.DevicesByOwner(r.Context(), owner.ID)
	if err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	identity := platform + "\n" + strings.ToLower(model)
	var device *eeyesDevice
	for _, d := range existing {
		if d.Platform != platform || !d.isLive(now) {
			continue
		}
		if installHash != "" && hmacEqual(d.InstallHash, installHash) {
			device = d
			break
		}
	}
	if device == nil {
		for _, d := range existing {
			if d.Platform != platform || !d.isLive(now) || eeyesDeviceIdentity(d) != identity {
				continue
			}
			if device == nil || eeyesDeviceNewer(d, device) {
				device = d
			}
		}
	}
	if device != nil {
		device.Model = model
		device.ShellVersion = strings.TrimSpace(body.ShellVersion)
		device.TokenHash = a.hashOpaque("eeyes-device", tokenSecret)
		device.TokenPrefix = tokenSecret[:min(12, len(tokenSecret))]
		device.ExpiresAt = now.Add(eeyesDeviceTTL)
		device.LastSeenAt = now
		device.PairingID = p.ID
		if installHash != "" {
			device.InstallHash = installHash
		}
		if err := a.eeyes.UpdateDevice(r.Context(), device); err != nil {
			a.logUnexpected(r, "eeyes", err.Error())
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
	} else {
		device = &eeyesDevice{
			ID:           randomID(12),
			OwnerID:      owner.ID,
			Label:        label,
			Platform:     platform,
			Model:        model,
			ShellVersion: strings.TrimSpace(body.ShellVersion),
			TokenHash:    a.hashOpaque("eeyes-device", tokenSecret),
			TokenPrefix:  tokenSecret[:min(12, len(tokenSecret))],
			CreatedAt:    now,
			ExpiresAt:    now.Add(eeyesDeviceTTL),
			LastSeenAt:   now,
			PairingID:    p.ID,
			InstallHash:  installHash,
		}
		if err := a.eeyes.InsertDevice(r.Context(), device); err != nil {
			a.logUnexpected(r, "eeyes", err.Error())
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
	}
	consumed := now
	p.Step = 3
	p.SessionHash = ""
	p.Status = eeyesPairingPaired
	p.ConsumedAt = &consumed
	p.DeviceID = device.ID
	p.DeviceLabel = device.Label
	if err := a.eeyes.UpdatePairing(r.Context(), p); err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
	}
	if err := a.collapseEeyesDevices(r.Context(), owner.ID); err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
	}
	a.auditEvent(r, "eeyes_device_pair", "ok", owner.ID)
	a.mustLogf(r, "eeyes.device.pair", "device_id", device.ID, "owner_id", owner.ID, "platform", platform)
	writeJSON(w, http.StatusCreated, map[string]any{
		"token":     tokenSecret,
		"deviceId":  device.ID,
		"expiresAt": device.ExpiresAt,
		"label":     device.Label,
	})
}

func (a *App) withEeyesDevice(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		auth := strings.TrimSpace(r.Header.Get("Authorization"))
		const prefix = "Bearer "
		if !strings.HasPrefix(auth, prefix) {
			a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
			return
		}
		token := strings.TrimSpace(strings.TrimPrefix(auth, prefix))
		if !strings.HasPrefix(token, eeyesDeviceTokenPrefix) {
			a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
			return
		}
		hash := a.hashOpaque("eeyes-device", token)
		device, err := a.eeyes.DeviceByTokenHash(r.Context(), hash)
		if err != nil || device == nil {
			a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
			return
		}
		now := time.Now().UTC()
		if device.RevokedAt != nil && !device.RevokedAt.IsZero() {
			a.writeSafeError(w, r, http.StatusUnauthorized, "device_revoked")
			return
		}
		if !now.Before(device.ExpiresAt) {
			a.writeSafeError(w, r, http.StatusUnauthorized, "device_expired")
			return
		}
		owner, err := a.store.UserByID(r.Context(), device.OwnerID)
		if err != nil || owner == nil || owner.Status != statusVerified {
			a.writeSafeError(w, r, http.StatusUnauthorized, "device_revoked")
			return
		}
		ok, unavailable := a.hasEeyesAccess(r, owner)
		if unavailable {
			a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
			return
		}
		if !ok {
			a.writeSafeError(w, r, http.StatusUnauthorized, "device_revoked")
			return
		}
		device.LastSeenAt = now
		_ = a.eeyes.UpdateDevice(r.Context(), device)
		ctx := context.WithValue(r.Context(), eeyesDeviceContextKey{}, device)
		next(w, r.WithContext(ctx))
	}
}

func eeyesDeviceFrom(r *http.Request) *eeyesDevice {
	d, _ := r.Context().Value(eeyesDeviceContextKey{}).(*eeyesDevice)
	return d
}

func eeyesDeviceIdentity(d *eeyesDevice) string {
	if d == nil {
		return ""
	}
	model := strings.ToLower(strings.TrimSpace(d.Model))
	if model == "" {
		model = strings.ToLower(strings.TrimSpace(d.Label))
	}
	return d.Platform + "\n" + model
}

func eeyesDeviceNewer(a, b *eeyesDevice) bool {
	if a.LastSeenAt.After(b.LastSeenAt) {
		return true
	}
	if b.LastSeenAt.After(a.LastSeenAt) {
		return false
	}
	return a.CreatedAt.After(b.CreatedAt)
}

// collapseEeyesDevices keeps one live record per platform and model. Extra
// links of the same apparatus are revoked and their open tasks are cancelled.
func (a *App) collapseEeyesDevices(ctx context.Context, ownerID string) error {
	a.eeyesCollapseMu.Lock()
	defer a.eeyesCollapseMu.Unlock()
	devices, err := a.eeyes.DevicesByOwner(ctx, ownerID)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	best := map[string]*eeyesDevice{}
	var extras []*eeyesDevice
	for _, d := range devices {
		if d == nil || !d.isLive(now) {
			continue
		}
		id := eeyesDeviceIdentity(d)
		cur := best[id]
		if cur == nil || eeyesDeviceNewer(d, cur) {
			if cur != nil {
				extras = append(extras, cur)
			}
			best[id] = d
			continue
		}
		extras = append(extras, d)
	}
	if len(extras) == 0 {
		return nil
	}
	revoked := map[string]bool{}
	for _, d := range extras {
		d.RevokedAt = &now
		if err := a.eeyes.UpdateDevice(ctx, d); err != nil {
			return err
		}
		revoked[d.ID] = true
		a.eeyesWake.bump(d.ID)
	}
	tasks, err := a.eeyes.TasksByOwner(ctx, ownerID)
	if err != nil {
		return err
	}
	for _, t := range tasks {
		if t == nil || !revoked[t.DeviceID] {
			continue
		}
		if t.Status != eeyesTaskPending && t.Status != eeyesTaskInProgress {
			continue
		}
		t.Status = eeyesTaskCancelled
		t.UpdatedAt = now
		if err := a.eeyes.UpdateTask(ctx, t); err != nil {
			return err
		}
	}
	return nil
}

func (a *App) eeyesListDevices(w http.ResponseWriter, r *http.Request) {
	user := a.requireEeyesUser(w, r)
	if user == nil {
		return
	}
	if err := a.collapseEeyesDevices(r.Context(), user.ID); err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	list, err := a.eeyes.DevicesByOwner(r.Context(), user.ID)
	if err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if list == nil {
		list = []*eeyesDevice{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"devices": list})
}

func (a *App) eeyesPatchDevice(w http.ResponseWriter, r *http.Request) {
	user := a.requireEeyesUnsafe(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	d, err := a.eeyes.DeviceByID(r.Context(), id)
	if err != nil || d == nil || d.OwnerID != user.ID {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body struct {
		Label string `json:"label"`
	}
	defer r.Body.Close()
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	label := strings.TrimSpace(body.Label)
	if label == "" || len(label) > 64 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	d.Label = label
	if err := a.eeyes.UpdateDevice(r.Context(), d); err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"device": d})
}

func (a *App) eeyesRevokeDevice(w http.ResponseWriter, r *http.Request) {
	user := a.requireEeyesUnsafe(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	d, err := a.eeyes.DeviceByID(r.Context(), id)
	if err != nil || d == nil || d.OwnerID != user.ID {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	now := time.Now().UTC()
	d.RevokedAt = &now
	if err := a.eeyes.UpdateDevice(r.Context(), d); err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.eeyesWake.bump(d.ID)
	a.auditEvent(r, "eeyes_device_revoke", "ok", user.ID)
	a.mustLogf(r, "eeyes.device.revoke", "device_id", d.ID, "owner_id", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) eeyesListTasks(w http.ResponseWriter, r *http.Request) {
	user := a.requireEeyesUser(w, r)
	if user == nil {
		return
	}
	if err := a.collapseEeyesDevices(r.Context(), user.ID); err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	list, err := a.eeyes.TasksByOwner(r.Context(), user.ID)
	if err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if list == nil {
		list = []*eeyesTask{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"tasks": list})
}

func (a *App) eeyesCreateTask(w http.ResponseWriter, r *http.Request) {
	user := a.requireEeyesUnsafe(w, r)
	if user == nil {
		return
	}
	var body struct {
		Title            string   `json:"title"`
		Instructions     string   `json:"instructions"`
		DeviceID         string   `json:"deviceId"`
		Kind             string   `json:"kind"`
		NotifyAt         string   `json:"notifyAt"`
		Reminders        []string `json:"reminders"`
		DueAt            string   `json:"dueAt"`
		PhotoIntervalSec int      `json:"photoIntervalSec"`
		MaxPhotos        int      `json:"maxPhotos"`
		AudioSeconds     int      `json:"audioSeconds"`
		CameraFacing     string   `json:"cameraFacing"`
		BatchID          string   `json:"batchId"`
	}
	defer r.Body.Close()
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	title := strings.TrimSpace(body.Title)
	deviceID := strings.TrimSpace(body.DeviceID)
	kind := strings.TrimSpace(body.Kind)
	if kind == "task" {
		kind = ""
	}
	if title == "" || deviceID == "" || (kind != "" && kind != eeyesTaskKindNotice && kind != eeyesTaskKindPhoto) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	facing := ""
	if kind == eeyesTaskKindPhoto {
		facing = strings.TrimSpace(body.CameraFacing)
		if facing == "" {
			facing = eeyesCameraBack
		}
		if facing != eeyesCameraBack && facing != eeyesCameraFront {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
	}
	batchID := strings.TrimSpace(body.BatchID)
	if len(batchID) > 80 || strings.ContainsAny(batchID, " \n\r\t") {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	d, err := a.eeyes.DeviceByID(r.Context(), deviceID)
	if err != nil || d == nil || d.OwnerID != user.ID || !d.isLive(time.Now().UTC()) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	notifyAt, err := parseOptionalRFC3339(body.NotifyAt)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	dueAt, err := parseOptionalRFC3339(body.DueAt)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	reminders := make([]time.Time, 0, len(body.Reminders))
	for _, raw := range body.Reminders {
		t, err := parseOptionalRFC3339(raw)
		if err != nil || t == nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		reminders = append(reminders, *t)
	}
	maxPhotos := body.MaxPhotos
	if maxPhotos <= 0 {
		maxPhotos = eeyesMaxPhotosDefault
	}
	if maxPhotos > eeyesMaxPhotosCap {
		maxPhotos = eeyesMaxPhotosCap
	}
	audioSec := body.AudioSeconds
	if audioSec < 0 {
		audioSec = 0
	}
	if audioSec > eeyesMaxAudioSecCap {
		audioSec = eeyesMaxAudioSecCap
	}
	photoInterval := body.PhotoIntervalSec
	if photoInterval < 0 {
		photoInterval = 0
	}
	now := time.Now().UTC()
	if kind == eeyesTaskKindNotice || kind == eeyesTaskKindPhoto {
		if notifyAt == nil {
			notifyAt = &now
		}
		audioSec = 0
		reminders = nil
		dueAt = nil
	}
	if kind == eeyesTaskKindNotice {
		maxPhotos, photoInterval = 0, 0
	}
	if kind == eeyesTaskKindPhoto {
		if photoInterval > eeyesMaxBurstIntervalSec {
			photoInterval = eeyesMaxBurstIntervalSec
		}
		if photoInterval >= eeyesMinBurstIntervalSec && maxPhotos > 1 {
			// Burst: keep the interval and the shot count.
		} else {
			maxPhotos, photoInterval = 1, 0
		}
	}
	task := &eeyesTask{
		ID:               randomID(12),
		OwnerID:          user.ID,
		DeviceID:         deviceID,
		Title:            title,
		Instructions:     strings.TrimSpace(body.Instructions),
		Status:           eeyesTaskPending,
		Kind:             kind,
		NotifyAt:         notifyAt,
		Reminders:        reminders,
		DueAt:            dueAt,
		PhotoIntervalSec: photoInterval,
		MaxPhotos:        maxPhotos,
		AudioSeconds:     audioSec,
		CameraFacing:     facing,
		BatchID:          batchID,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	if err := a.eeyes.InsertTask(r.Context(), task); err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.eeyesWake.bump(task.DeviceID)
	a.auditEvent(r, "eeyes_task_create", "ok", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{"task": task})
}

func (a *App) eeyesPatchTask(w http.ResponseWriter, r *http.Request) {
	user := a.requireEeyesUnsafe(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	task, err := a.eeyes.TaskByID(r.Context(), id)
	if err != nil || task == nil || task.OwnerID != user.ID {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body struct {
		Title        *string `json:"title"`
		Instructions *string `json:"instructions"`
		Status       *string `json:"status"`
	}
	defer r.Body.Close()
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if body.Title != nil {
		title := strings.TrimSpace(*body.Title)
		if title == "" {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		task.Title = title
	}
	if body.Instructions != nil {
		task.Instructions = strings.TrimSpace(*body.Instructions)
	}
	if body.Status != nil {
		st := strings.TrimSpace(*body.Status)
		if st != eeyesTaskPending && st != eeyesTaskCancelled {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		task.Status = st
	}
	task.UpdatedAt = time.Now().UTC()
	if err := a.eeyes.UpdateTask(r.Context(), task); err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.eeyesWake.bump(task.DeviceID)
	writeJSON(w, http.StatusOK, map[string]any{"task": task})
}

func (a *App) eeyesDeleteTask(w http.ResponseWriter, r *http.Request) {
	user := a.requireEeyesUnsafe(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	task, err := a.eeyes.TaskByID(r.Context(), id)
	if err != nil || task == nil || task.OwnerID != user.ID {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err := a.eeyes.DeleteTask(r.Context(), id); err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.eeyesWake.bump(task.DeviceID)
	a.auditEvent(r, "eeyes_task_delete", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) eeyesPatchPackAnalysis(w http.ResponseWriter, r *http.Request) {
	user := a.requireEeyesUnsafe(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	task, err := a.eeyes.TaskByID(r.Context(), id)
	if err != nil || task == nil || task.OwnerID != user.ID {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body struct {
		Analysis string `json:"analysis"`
	}
	defer r.Body.Close()
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	analysis := strings.TrimSpace(body.Analysis)
	if analysis == "" || utf8.RuneCountInString(analysis) > eeyesMaxPackAnalysisRunes {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	tasks, err := a.eeyes.TasksByOwner(r.Context(), user.ID)
	if err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	key := task.BatchID
	if key == "" {
		key = task.ID
	}
	now := time.Now().UTC()
	updated := 0
	for _, t := range tasks {
		if t == nil || t.OwnerID != user.ID {
			continue
		}
		tKey := t.BatchID
		if tKey == "" {
			tKey = t.ID
		}
		if tKey != key {
			continue
		}
		t.PackAnalysis = analysis
		t.UpdatedAt = now
		if err := a.eeyes.UpdateTask(r.Context(), t); err != nil {
			a.logUnexpected(r, "eeyes", err.Error())
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		updated++
	}
	a.auditEvent(r, "eeyes_pack_analysis", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"packAnalysis": analysis, "tasks": updated})
}

func (a *App) eeyesListCompletions(w http.ResponseWriter, r *http.Request) {
	user := a.requireEeyesUser(w, r)
	if user == nil {
		return
	}
	tasks, err := a.eeyes.TasksByOwner(r.Context(), user.ID)
	if err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	type completion struct {
		Task  *eeyesTask    `json:"task"`
		Media []*eeyesMedia `json:"media"`
	}
	out := make([]completion, 0)
	for _, t := range tasks {
		if t.Kind == eeyesTaskKindNotice {
			continue
		}
		openBurst := t.Kind == eeyesTaskKindPhoto && t.Status == eeyesTaskInProgress
		if t.Status != eeyesTaskCompleted && !openBurst {
			continue
		}
		media, err := a.eeyes.MediaByTask(r.Context(), t.ID)
		if err != nil {
			a.logUnexpected(r, "eeyes", err.Error())
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		if media == nil {
			media = []*eeyesMedia{}
		}
		out = append(out, completion{Task: t, Media: media})
	}
	writeJSON(w, http.StatusOK, map[string]any{"completions": out})
}

func (a *App) eeyesGetHubMedia(w http.ResponseWriter, r *http.Request) {
	user := a.requireEeyesUser(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	m, err := a.eeyes.MediaByID(r.Context(), id)
	if err != nil || m == nil || m.OwnerID != user.ID {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	a.serveEeyesMediaFile(w, r, m)
}

func (a *App) eeyesPatchMedia(w http.ResponseWriter, r *http.Request) {
	user := a.requireEeyesUnsafe(w, r)
	if user == nil {
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	m, err := a.eeyes.MediaByID(r.Context(), id)
	if err != nil || m == nil || m.OwnerID != user.ID {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body struct {
		Analysis string `json:"analysis"`
	}
	defer r.Body.Close()
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	analysis := strings.TrimSpace(body.Analysis)
	if utf8.RuneCountInString(analysis) > eeyesMaxAnalysisRunes {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	m.Analysis = analysis
	if err := a.eeyes.UpdateMedia(r.Context(), m); err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eeyes_media_analysis", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"media": m})
}

func (a *App) serveEeyesMediaFile(w http.ResponseWriter, r *http.Request, m *eeyesMedia) {
	abs, err := a.eeyesFS.resolve(m.RelPath)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	f, err := os.Open(abs)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	defer f.Close()
	stat, err := f.Stat()
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	w.Header().Set("Content-Type", m.Mime)
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeContent(w, r, filepath.Base(abs), stat.ModTime(), f)
}

func (a *App) eeyesDeviceSync(w http.ResponseWriter, r *http.Request) {
	device := eeyesDeviceFrom(r)
	if device == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	tasks, err := a.eeyes.TasksByDevice(r.Context(), device.ID)
	if err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	active := make([]*eeyesTask, 0)
	notifications := make([]map[string]any, 0)
	// Shells schedule local alarms, so upcoming notifications must reach them
	// before they are due; sync runs every 15 minutes and re-arms the horizon.
	now := time.Now().UTC()
	horizon := now.Add(eeyesNotificationHorizon)
	for _, t := range tasks {
		if t.Status == eeyesTaskCancelled {
			continue
		}
		if t.Status == eeyesTaskCompleted {
			continue
		}
		if t.Kind == eeyesTaskKindPhoto {
			key := "capture:" + t.ID
			if t.NotifyAt != nil && !t.NotifyAt.After(horizon) && !containsString(t.NotifiedKeys, key) {
				imagesStored := 0
				if media, err := a.eeyes.MediaByTask(r.Context(), t.ID); err == nil {
					for _, item := range media {
						if item != nil && item.Kind == eeyesMediaKindImage {
							imagesStored++
						}
					}
				}
				notifications = append(notifications, map[string]any{
					"key":          key,
					"taskId":       t.ID,
					"title":        t.Title,
					"body":         t.Instructions,
					"at":           t.NotifyAt,
					"kind":         "capture",
					"facing":       t.CameraFacing,
					"intervalSec":  t.PhotoIntervalSec,
					"maxPhotos":    t.MaxPhotos,
					"imagesStored": imagesStored,
				})
				if t.NotifyDispatchedAt == nil {
					dispatched := now
					t.NotifyDispatchedAt = &dispatched
					_ = a.eeyes.UpdateTask(r.Context(), t)
				}
			}
			continue
		}
		if t.Kind != eeyesTaskKindNotice {
			active = append(active, t)
		}
		if t.NotifyAt != nil && !t.NotifyAt.After(horizon) {
			key := "notify:" + t.ID
			if !containsString(t.NotifiedKeys, key) {
				notifications = append(notifications, map[string]any{
					"key":     key,
					"taskId":  t.ID,
					"title":   t.Title,
					"body":    t.Instructions,
					"at":      t.NotifyAt,
					"kind":    "notify",
				})
				if t.NotifyDispatchedAt == nil {
					dispatched := now
					t.NotifyDispatchedAt = &dispatched
					_ = a.eeyes.UpdateTask(r.Context(), t)
				}
			}
		}
		for i, rem := range t.Reminders {
			if rem.After(horizon) {
				continue
			}
			key := fmt.Sprintf("reminder:%s:%d", t.ID, i)
			if containsString(t.NotifiedKeys, key) {
				continue
			}
			notifications = append(notifications, map[string]any{
				"key":    key,
				"taskId": t.ID,
				"title":  t.Title,
				"body":   t.Instructions,
				"at":     rem,
				"kind":   "reminder",
			})
		}
	}
	device.LastSyncAt = &now
	device.LastSyncNotes = len(notifications)
	_ = a.eeyes.UpdateDevice(r.Context(), device)
	a.mustLogf(r, "eeyes.device.sync", "device_id", device.ID, "tasks", len(active), "notifications", len(notifications))
	update := a.eeyesReadLatest(device.Platform)
	writeJSON(w, http.StatusOK, map[string]any{
		"deviceId":      device.ID,
		"label":         device.Label,
		"expiresAt":     device.ExpiresAt,
		"tasks":         active,
		"notifications": notifications,
		"uiVersion":     eeyesUIVersion,
		"update":        update,
	})
}

func containsString(list []string, want string) bool {
	for _, s := range list {
		if s == want {
			return true
		}
	}
	return false
}

func (a *App) eeyesDeviceStartTask(w http.ResponseWriter, r *http.Request) {
	device := eeyesDeviceFrom(r)
	if device == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	task, err := a.eeyes.TaskByID(r.Context(), id)
	if err != nil || task == nil || task.DeviceID != device.ID {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if task.Status != eeyesTaskPending && task.Status != eeyesTaskInProgress {
		a.writeSafeError(w, r, http.StatusConflict, "conflict")
		return
	}
	now := time.Now().UTC()
	task.Status = eeyesTaskInProgress
	task.StartedAt = &now
	task.UpdatedAt = now
	if err := a.eeyes.UpdateTask(r.Context(), task); err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eeyes_task_start", "ok", device.OwnerID)
	writeJSON(w, http.StatusOK, map[string]any{"task": task})
}

func (a *App) eeyesStoredImages(r *http.Request, taskID string) (int, error) {
	stored, err := a.eeyes.MediaByTask(r.Context(), taskID)
	if err != nil {
		return 0, err
	}
	n := 0
	for _, item := range stored {
		if item != nil && item.Kind == eeyesMediaKindImage {
			n++
		}
	}
	return n, nil
}

func (a *App) eeyesDeviceUploadMedia(w http.ResponseWriter, r *http.Request) {
	device := eeyesDeviceFrom(r)
	if device == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	task, err := a.eeyes.TaskByID(r.Context(), id)
	if err != nil || task == nil || task.DeviceID != device.ID {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body struct {
		ClientMediaID string `json:"clientMediaId"`
		Kind          string `json:"kind"`
		Mime          string `json:"mime"`
		CapturedAt    string `json:"capturedAt"`
		Width         int    `json:"width"`
		Height        int    `json:"height"`
		DurationMs    int    `json:"durationMs"`
		Sha256        string `json:"sha256"`
		DataBase64    string `json:"dataBase64"`
	}
	defer r.Body.Close()
	if err := json.NewDecoder(io.LimitReader(r.Body, 12<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	clientID := strings.TrimSpace(body.ClientMediaID)
	kind := strings.TrimSpace(body.Kind)
	if clientID == "" || (kind != eeyesMediaKindImage && kind != eeyesMediaKindAudio) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if existing, err := a.eeyes.MediaByClientID(r.Context(), device.ID, clientID); err == nil && existing != nil {
		writeJSON(w, http.StatusCreated, map[string]any{"media": existing, "url": eeyesDeviceMediaURL(existing.ID)})
		return
	}
	isPhoto := task.Kind == eeyesTaskKindPhoto
	if isPhoto {
		goal := task.MaxPhotos
		if goal < 1 {
			goal = 1
		}
		// A burst that closed before every shot landed can still take the
		// missing frame. A full pack, and a single photo, stay closed.
		storedNow, err := a.eeyesStoredImages(r, task.ID)
		if err != nil {
			a.logUnexpected(r, "eeyes", err.Error())
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		shortBurst := goal > 1 && storedNow < goal
		open := task.Status == eeyesTaskPending || task.Status == eeyesTaskInProgress
		if !open && !(task.Status == eeyesTaskCompleted && shortBurst) {
			a.writeSafeError(w, r, http.StatusConflict, "conflict")
			return
		}
		if kind != eeyesMediaKindImage {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
	} else if task.Status != eeyesTaskInProgress {
		a.writeSafeError(w, r, http.StatusConflict, "conflict")
		return
	}
	raw, err := decodeEeyesBase64(body.DataBase64)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var mime string
	var ext string
	switch kind {
	case eeyesMediaKindImage:
		imgKind, err := detectEeyesImage(raw)
		if err != nil {
			if errors.Is(err, errEeyesMediaTooLarge) {
				a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
				return
			}
			a.writeSafeError(w, r, http.StatusBadRequest, "unsupported_media")
			return
		}
		mime = imgKind.mime
		ext = imgKind.ext
	case eeyesMediaKindAudio:
		if err := detectEeyesAudio(raw); err != nil {
			if errors.Is(err, errEeyesMediaTooLarge) {
				a.writeSafeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large")
				return
			}
			a.writeSafeError(w, r, http.StatusBadRequest, "unsupported_media")
			return
		}
		mime = "audio/mp4"
		ext = ".m4a"
	}
	gotHash := sha256Hex(raw)
	wantHash := strings.ToLower(strings.TrimSpace(body.Sha256))
	if wantHash != "" && wantHash != gotHash {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	capturedAt, err := parseOptionalRFC3339(body.CapturedAt)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	now := time.Now().UTC()
	if capturedAt == nil {
		capturedAt = &now
	}
	mediaID := randomID(16)
	rel, err := a.eeyesFS.writeMedia(device.OwnerID, task.ID, mediaID, ext, raw)
	if err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	m := &eeyesMedia{
		ID:            mediaID,
		OwnerID:       device.OwnerID,
		DeviceID:      device.ID,
		TaskID:        task.ID,
		ClientMediaID: clientID,
		Kind:          kind,
		Mime:          mime,
		Sha256:        gotHash,
		Size:          int64(len(raw)),
		Width:         body.Width,
		Height:        body.Height,
		DurationMs:    body.DurationMs,
		RelPath:       rel,
		CapturedAt:    *capturedAt,
		CreatedAt:     now,
	}
	if err := a.eeyes.InsertMedia(r.Context(), m); err != nil {
		if errors.Is(err, errConflict) {
			existing, _ := a.eeyes.MediaByClientID(r.Context(), device.ID, clientID)
			if existing != nil {
				writeJSON(w, http.StatusCreated, map[string]any{"media": existing, "url": eeyesDeviceMediaURL(existing.ID)})
				return
			}
		}
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if isPhoto {
		if task.StartedAt == nil {
			task.StartedAt = capturedAt
		}
		goal := task.MaxPhotos
		if goal < 1 {
			goal = 1
		}
		stored, err := a.eeyes.MediaByTask(r.Context(), task.ID)
		if err != nil {
			a.logUnexpected(r, "eeyes", err.Error())
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		images := 0
		for _, item := range stored {
			if item != nil && item.Kind == eeyesMediaKindImage {
				images++
			}
		}
		if images >= goal {
			task.Status = eeyesTaskCompleted
			task.CompletedAt = &now
		} else {
			task.Status = eeyesTaskInProgress
		}
		task.UpdatedAt = now
		if err := a.eeyes.UpdateTask(r.Context(), task); err != nil {
			a.logUnexpected(r, "eeyes", err.Error())
		}
	}
	a.auditEvent(r, "eeyes_media_upload", "ok", device.OwnerID)
	a.mustLogf(r, "eeyes.media.upload", "media_id", m.ID, "task_id", task.ID, "kind", kind, "size", m.Size)
	writeJSON(w, http.StatusCreated, map[string]any{"media": m, "url": eeyesDeviceMediaURL(m.ID)})
}

func (a *App) eeyesDeviceCompleteTask(w http.ResponseWriter, r *http.Request) {
	device := eeyesDeviceFrom(r)
	if device == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	task, err := a.eeyes.TaskByID(r.Context(), id)
	if err != nil || task == nil || task.DeviceID != device.ID {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if task.Status != eeyesTaskInProgress && task.Status != eeyesTaskPending {
		a.writeSafeError(w, r, http.StatusConflict, "conflict")
		return
	}
	if task.Kind == eeyesTaskKindPhoto && task.MaxPhotos > 1 {
		storedNow, err := a.eeyesStoredImages(r, task.ID)
		if err != nil {
			a.logUnexpected(r, "eeyes", err.Error())
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		if storedNow < task.MaxPhotos {
			a.writeSafeError(w, r, http.StatusConflict, "conflict")
			return
		}
	}
	now := time.Now().UTC()
	task.Status = eeyesTaskCompleted
	task.CompletedAt = &now
	task.UpdatedAt = now
	if err := a.eeyes.UpdateTask(r.Context(), task); err != nil {
		a.logUnexpected(r, "eeyes", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eeyes_task_complete", "ok", device.OwnerID)
	writeJSON(w, http.StatusOK, map[string]any{"task": task})
}

func (a *App) eeyesDeviceAckNotifications(w http.ResponseWriter, r *http.Request) {
	device := eeyesDeviceFrom(r)
	if device == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	var body struct {
		Keys []string `json:"keys"`
	}
	defer r.Body.Close()
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	for _, key := range body.Keys {
		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}
		parts := strings.Split(key, ":")
		if len(parts) < 2 {
			continue
		}
		taskID := parts[1]
		task, err := a.eeyes.TaskByID(r.Context(), taskID)
		if err != nil || task == nil || task.DeviceID != device.ID {
			continue
		}
		if containsString(task.NotifiedKeys, key) {
			continue
		}
		now := time.Now().UTC()
		task.NotifiedKeys = append(task.NotifiedKeys, key)
		task.UpdatedAt = now
		if key == "notify:"+task.ID || key == "capture:"+task.ID {
			task.NotifyAckedAt = &now
			if task.Kind == eeyesTaskKindNotice && task.Status == eeyesTaskPending {
				task.Status = eeyesTaskCompleted
				task.CompletedAt = &now
			}
		}
		a.mustLogf(r, "eeyes.device.ack", "device_id", device.ID, "task_id", task.ID)
		_ = a.eeyes.UpdateTask(r.Context(), task)
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *App) eeyesDeviceGetMedia(w http.ResponseWriter, r *http.Request) {
	device := eeyesDeviceFrom(r)
	if device == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	id := strings.TrimSpace(r.PathValue("id"))
	m, err := a.eeyes.MediaByID(r.Context(), id)
	if err != nil || m == nil || m.DeviceID != device.ID {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	a.serveEeyesMediaFile(w, r, m)
}
