package main

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// eocode SSR: the site is Python that prints an HTML document to stdout. The
// runner executes site.py inside the user's workspace with a hard timeout, a
// scrubbed environment, and a static safety scan of every Python file before
// execution. This is the platform's only AI-code execution surface, so it is
// deliberately narrow: admin/grantees only, no network/filesystem/env access in
// the generated code, bounded output.
const (
	eocodeSSRTimeout   = 6 * time.Second
	eocodeSSRMaxOutput = 1 << 20
)

var (
	// `import X` / `from X import` where X is a dangerous module.
	eocodePythonImportRe = regexp.MustCompile(`(?m)^\s*(?:import|from)\s+([A-Za-z_][A-Za-z0-9_]*)`)
	// Dangerous builtins the generators must never call.
	eocodePythonCallRe = regexp.MustCompile(`\b(__import__|eval|exec|compile|open|input|globals|locals|getattr|setattr|delattr|breakpoint|memoryview|vars|dir)\s*\(`)
	// Sandbox-escape attributes.
	eocodePythonDunderRe = regexp.MustCompile(`__(?:globals|subclasses|class|bases|mro|code|closure|func_globals|builtins|dict|getattribute)__`)
)

var eocodePythonBlockedModules = map[string]bool{
	"os": true, "sys": true, "subprocess": true, "socket": true, "shutil": true,
	"pathlib": true, "importlib": true, "ctypes": true, "pickle": true,
	"marshal": true, "http": true, "urllib": true, "requests": true,
	"ftplib": true, "smtplib": true, "telnetlib": true, "multiprocessing": true,
	"asyncio": true, "pty": true, "platform": true, "tempfile": true,
	"signal": true, "threading": true, "resource": true, "builtins": true,
	"runpy": true, "webbrowser": true, "code": true, "codeop": true,
	"site": true, "sysconfig": true, "traceback": true, "inspect": true,
	"gc": true, "mmap": true, "struct": true, "io": true, "glob": true,
}

// eocodeScanPythonSource rejects Python that tries to leave the string-only
// sandbox. It is a defense-in-depth check, not a proof of safety.
func eocodeScanPythonSource(rel, content string) error {
	for _, m := range eocodePythonImportRe.FindAllStringSubmatch(content, -1) {
		if eocodePythonBlockedModules[m[1]] {
			return fmt.Errorf("forbidden import %q", m[1])
		}
	}
	if loc := eocodePythonCallRe.FindString(content); loc != "" {
		return fmt.Errorf("forbidden call")
	}
	if eocodePythonDunderRe.MatchString(content) {
		return fmt.Errorf("forbidden attribute access")
	}
	return nil
}

func eocodeTruncateErr(s string) string {
	s = strings.TrimSpace(s)
	if len(s) > 300 {
		return s[:300]
	}
	return s
}

// eocodeSanitizePaths removes the workspace root from a diagnostic string so
// the API never returns a VPS filesystem path.
func eocodeSanitizePaths(s, root string) string {
	root = strings.TrimSpace(root)
	if root == "" {
		return s
	}
	for _, variant := range []string{root, filepath.ToSlash(root), filepath.FromSlash(root)} {
		if variant != "" {
			s = strings.ReplaceAll(s, variant, ".")
		}
	}
	return s
}

// eocodeRenderSite runs `site.py` and returns its stdout as the HTML document.
func (a *App) eocodeRenderSite(ctx context.Context, ws *eocodeWorkspace) (string, error) {
	if !a.cfg.EocodeSSREnabled {
		return "", fmt.Errorf("ssr disabled")
	}
	if ws == nil {
		return "", fmt.Errorf("no workspace")
	}
	if _, err := os.Stat(ws.fullPath("site.py")); err != nil {
		return "", fmt.Errorf("site.py missing")
	}

	// Static safety scan across every Python file before execution.
	relFiles, err := ws.listRelFiles()
	if err != nil {
		return "", err
	}
	for _, rel := range relFiles {
		if !strings.HasSuffix(strings.ToLower(rel), ".py") {
			continue
		}
		content, err := ws.readFile(rel)
		if err != nil {
			continue
		}
		if err := eocodeScanPythonSource(rel, content); err != nil {
			a.mustLogf(nil, "eocode.ssr.blocked", "user_id", ws.UserID, "path", rel, "err", redactLogValue(err.Error()))
			return "", fmt.Errorf("%s: %w", rel, err)
		}
	}

	python := strings.TrimSpace(a.cfg.EocodePython)
	if python == "" {
		python = "python3"
	}
	a.mustLogf(nil, "eocode.ssr.run", "user_id", ws.UserID, "python", python, "files", len(relFiles))
	tctx, cancel := context.WithTimeout(ctx, eocodeSSRTimeout)
	defer cancel()
	cmd := exec.CommandContext(tctx, python, "site.py")
	cmd.Dir = ws.Root
	cmd.Env = eocodePythonEnv()
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := eocodeSanitizePaths(eocodeTruncateErr(stderr.String()), ws.Root)
		a.mustLogf(nil, "eocode.ssr.run_error", "user_id", ws.UserID, "err", redactLogValue(err.Error()), "stderr", msg)
		return "", fmt.Errorf("run: %v: %s", err, msg)
	}
	out := stdout.String()
	if len(out) > eocodeSSRMaxOutput {
		out = out[:eocodeSSRMaxOutput]
	}
	if strings.TrimSpace(out) == "" {
		a.mustLogf(nil, "eocode.ssr.empty", "user_id", ws.UserID, "stderr", eocodeTruncateErr(stderr.String()))
		return "", fmt.Errorf("empty output")
	}
	a.mustLogf(nil, "eocode.ssr.ok", "user_id", ws.UserID, "bytes", len(out))
	return out, nil
}

// eocodePythonEnv builds a minimal environment so the interpreter runs without
// inheriting the API's secrets (SMTP, Mongo URI, provider keys).
func eocodePythonEnv() []string {
	env := []string{
		"PYTHONIOENCODING=utf-8",
		"PYTHONDONTWRITEBYTECODE=1",
		"PYTHONHASHSEED=0",
		"PYTHONUNBUFFERED=1",
	}
	for _, key := range []string{"PATH", "SystemRoot", "SystemDrive", "TEMP", "TMP", "TMPDIR", "HOME", "LANG"} {
		if value := os.Getenv(key); value != "" {
			env = append(env, key+"="+value)
		}
	}
	return env
}
