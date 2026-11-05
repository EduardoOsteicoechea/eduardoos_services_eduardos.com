package main

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

const (
	eeyesWaitTimeout      = 50 * time.Second
	eeyesWaitMaxPerDevice = 3
)

// eeyesWaker lets each device hold a long-poll open until the hub changes its
// tasks. Versions are per process (epoch prefix), so a restart reads as a change.
type eeyesWaker struct {
	mu      sync.Mutex
	epoch   string
	seq     map[string]uint64
	ch      map[string]chan struct{}
	waiting map[string]int
	timeout time.Duration
}

func newEeyesWaker() *eeyesWaker {
	return &eeyesWaker{
		epoch:   randomID(8),
		seq:     map[string]uint64{},
		ch:      map[string]chan struct{}{},
		waiting: map[string]int{},
		timeout: eeyesWaitTimeout,
	}
}

func (w *eeyesWaker) current(deviceID string) (string, chan struct{}) {
	w.mu.Lock()
	defer w.mu.Unlock()
	c := w.ch[deviceID]
	if c == nil {
		c = make(chan struct{})
		w.ch[deviceID] = c
	}
	return fmt.Sprintf("%s.%d", w.epoch, w.seq[deviceID]), c
}

func (w *eeyesWaker) bump(deviceID string) {
	if deviceID == "" {
		return
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	w.seq[deviceID]++
	if c := w.ch[deviceID]; c != nil {
		close(c)
		delete(w.ch, deviceID)
	}
}

func (w *eeyesWaker) enter(deviceID string) bool {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.waiting[deviceID] >= eeyesWaitMaxPerDevice {
		return false
	}
	w.waiting[deviceID]++
	return true
}

func (w *eeyesWaker) leave(deviceID string) {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.waiting[deviceID] <= 1 {
		delete(w.waiting, deviceID)
		return
	}
	w.waiting[deviceID]--
}

// eeyesDeviceWait answers immediately when ?v= is stale, otherwise blocks until
// the device's tasks change or the timeout elapses. Clients then call /sync.
func (a *App) eeyesDeviceWait(w http.ResponseWriter, r *http.Request) {
	device := eeyesDeviceFrom(r)
	if device == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return
	}
	since := strings.TrimSpace(r.URL.Query().Get("v"))
	v, ch := a.eeyesWake.current(device.ID)
	if since != v {
		writeJSON(w, http.StatusOK, map[string]any{"changed": true, "v": v})
		return
	}
	if !a.eeyesWake.enter(device.ID) {
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return
	}
	defer a.eeyesWake.leave(device.ID)
	timer := time.NewTimer(a.eeyesWake.timeout)
	defer timer.Stop()
	select {
	case <-ch:
		v, _ = a.eeyesWake.current(device.ID)
		a.mustLogf(r, "eeyes.device.wait", "device_id", device.ID, "changed", "true")
		writeJSON(w, http.StatusOK, map[string]any{"changed": true, "v": v})
	case <-timer.C:
		writeJSON(w, http.StatusOK, map[string]any{"changed": false, "v": v})
	case <-r.Context().Done():
	}
}
