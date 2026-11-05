package main

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type eeyesReleaseInfo struct {
	VersionCode    int    `json:"versionCode"`
	VersionName    string `json:"versionName"`
	Sha256         string `json:"sha256"`
	Size           int64  `json:"size"`
	MinVersionCode int    `json:"minVersionCode"`
	Notes          string `json:"notes,omitempty"`
	File           string `json:"file"`
	Platform       string `json:"platform,omitempty"`
	DownloadPath   string `json:"downloadPath,omitempty"`
}

func (a *App) eeyesReleaseDir(platform string) string {
	return filepath.Join(a.cfg.EeyesReleasesRoot, platform)
}

func (a *App) eeyesReadLatest(platform string) *eeyesReleaseInfo {
	platform = strings.ToLower(strings.TrimSpace(platform))
	if platform != "android" && platform != "desktop" {
		return nil
	}
	path := filepath.Join(a.eeyesReleaseDir(platform), "latest.json")
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var info eeyesReleaseInfo
	if err := json.Unmarshal(raw, &info); err != nil {
		return nil
	}
	if info.File == "" || info.VersionCode <= 0 {
		return nil
	}
	info.Platform = platform
	info.DownloadPath = "/api/eeyes/downloads/" + platform
	return &info
}

// eeyesResolveReleaseFile maps latest.json `file` to a regular file inside the
// platform dir. CI publishes binaries under `<versionCode>/`, so a bare file
// name also falls back to that subdirectory.
func eeyesResolveReleaseFile(platformDir string, info *eeyesReleaseInfo) (string, bool) {
	base := filepath.Clean(platformDir)
	rel := filepath.Clean(filepath.FromSlash(strings.TrimSpace(info.File)))
	if rel == "." || filepath.IsAbs(rel) || filepath.VolumeName(rel) != "" {
		return "", false
	}
	candidates := []string{rel}
	if !strings.ContainsRune(rel, filepath.Separator) {
		candidates = append(candidates, filepath.Join(strconv.Itoa(info.VersionCode), rel))
	}
	for _, c := range candidates {
		abs := filepath.Join(base, c)
		inside, err := filepath.Rel(base, abs)
		if err != nil || inside == ".." || strings.HasPrefix(inside, ".."+string(filepath.Separator)) {
			continue
		}
		if st, err := os.Stat(abs); err == nil && st.Mode().IsRegular() {
			return abs, true
		}
	}
	return "", false
}

func (a *App) eeyesListReleases(w http.ResponseWriter, r *http.Request) {
	user := a.requireEeyesUser(w, r)
	if user == nil {
		return
	}
	android := a.eeyesReadLatest("android")
	desktop := a.eeyesReadLatest("desktop")
	writeJSON(w, http.StatusOK, map[string]any{
		"android": android,
		"desktop": desktop,
	})
}

func (a *App) eeyesDownloadRelease(w http.ResponseWriter, r *http.Request) {
	user := a.requireEeyesUser(w, r)
	if user == nil {
		return
	}
	platform := strings.ToLower(strings.TrimSpace(r.PathValue("platform")))
	info := a.eeyesReadLatest(platform)
	if info == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	abs, ok := eeyesResolveReleaseFile(a.eeyesReleaseDir(platform), info)
	if !ok {
		a.mustLogf(r, "eeyes.download.missing", "platform", platform, "version_code", info.VersionCode)
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	fileName := filepath.Base(abs)
	f, err := os.Open(abs)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	defer f.Close()
	stat, err := f.Stat()
	if err != nil || stat.IsDir() {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	ctype := "application/octet-stream"
	if platform == "android" {
		ctype = "application/vnd.android.package-archive"
	} else if strings.HasSuffix(strings.ToLower(fileName), ".exe") {
		ctype = "application/vnd.microsoft.portable-executable"
	}
	w.Header().Set("Content-Type", ctype)
	w.Header().Set("Content-Disposition", `attachment; filename="`+fileName+`"`)
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeContent(w, r, fileName, stat.ModTime(), f)
}
