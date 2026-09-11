package main

import (
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var (
	latinBookTokenRe    = regexp.MustCompile(`^(?:I|II|III|IV)$`)
	latinChapterTokenRe = regexp.MustCompile(`^(?:PRELIMINARY|[IVXLCDM]+)$`)
)

func (a *App) calvinRoot() string {
	return resolveCalvinParagraphsRoot(a.cfg.CalvinParagraphsRoot)
}

// resolveCalvinParagraphsRoot picks an existing Institutes pack directory.
// Deploy places the pack under /var/www/eduardoos.com/data/… (persistent);
// local/dev uses backend/.data or .data next to the API process.
func resolveCalvinParagraphsRoot(explicit string) string {
	explicit = strings.TrimSpace(explicit)
	candidates := make([]string, 0, 5)
	if explicit != "" {
		candidates = append(candidates, explicit)
	}
	candidates = append(candidates,
		"/var/www/eduardoos.com/data/calvin-institutes-paragraphs",
		"/opt/apps/eduardoos/shared/calvin-institutes-paragraphs",
		filepath.Join("backend", ".data", "calvin-institutes-paragraphs"),
		filepath.Join(".data", "calvin-institutes-paragraphs"),
	)
	seen := map[string]struct{}{}
	for _, candidate := range candidates {
		if candidate == "" {
			continue
		}
		if _, ok := seen[candidate]; ok {
			continue
		}
		seen[candidate] = struct{}{}
		info, err := os.Stat(candidate)
		if err == nil && info.IsDir() {
			return candidate
		}
	}
	if explicit != "" {
		return explicit
	}
	return filepath.Join(".data", "calvin-institutes-paragraphs")
}

func (a *App) latinMustLog(r *http.Request, msg string, attrs ...any) {
	if !a.cfg.MustLog {
		return
	}
	args := []any{
		slog.String("request_id", requestIDFrom(r, nil)),
		slog.String("route", r.URL.Path),
		slog.String("method", r.Method),
	}
	args = append(args, attrs...)
	a.log.Info(msg, args...)
}

func (a *App) requireLatinUser(w http.ResponseWriter, r *http.Request) *User {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return nil
	}
	return user
}

// latinCalvinsInstitutesHandler serves the pack index.json (authenticated).
func (a *App) latinCalvinsInstitutesHandler(w http.ResponseWriter, r *http.Request) {
	if a.requireLatinUser(w, r) == nil {
		return
	}
	a.latinMustLog(r, "latin.institutes_index")
	a.serveCalvinJSON(w, r, "index.json")
}

// latinCalvinsParagraphsHandler serves the paragraphs index when present, else index.json (authenticated).
func (a *App) latinCalvinsParagraphsHandler(w http.ResponseWriter, r *http.Request) {
	if a.requireLatinUser(w, r) == nil {
		return
	}
	a.latinMustLog(r, "latin.paragraphs_index")
	root := a.calvinRoot()
	candidates := []string{
		filepath.Join("paragraphs", "index.json"),
		"paragraphs.json",
		"index.json",
	}
	for _, rel := range candidates {
		abs, ok := a.resolveCalvinPath(root, rel)
		if !ok {
			continue
		}
		if _, err := os.Stat(abs); err == nil {
			a.serveCalvinAbs(w, r, abs)
			return
		}
	}
	a.writeSafeError(w, r, http.StatusNotFound, "not_found")
}

// latinCalvinsParagraphChapterHandler serves chapters/{book}/{chapter}.json (authenticated).
func (a *App) latinCalvinsParagraphChapterHandler(w http.ResponseWriter, r *http.Request) {
	if a.requireLatinUser(w, r) == nil {
		return
	}
	book := strings.TrimSpace(r.PathValue("book"))
	chapter := strings.TrimSpace(r.PathValue("chapter"))
	a.latinMustLog(r, "latin.paragraph_chapter",
		slog.String("book", book),
		slog.String("chapter", chapter),
	)
	if !latinBookTokenRe.MatchString(book) || !latinChapterTokenRe.MatchString(chapter) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	rel := filepath.Join("chapters", book, chapter+".json")
	a.serveCalvinJSON(w, r, rel)
}

func (a *App) serveCalvinJSON(w http.ResponseWriter, r *http.Request, rel string) {
	abs, ok := a.resolveCalvinPath(a.calvinRoot(), rel)
	if !ok {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	a.serveCalvinAbs(w, r, abs)
}

func (a *App) serveCalvinAbs(w http.ResponseWriter, r *http.Request, abs string) {
	raw, err := os.ReadFile(abs)
	if err != nil {
		if os.IsNotExist(err) {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		a.latinMustLog(r, "latin.read_error", slog.String("path", filepath.Base(abs)))
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(raw)
}

// resolveCalvinPath joins root+rel and rejects path traversal outside root.
func (a *App) resolveCalvinPath(root, rel string) (string, bool) {
	root = strings.TrimSpace(root)
	if root == "" || strings.TrimSpace(rel) == "" {
		return "", false
	}
	if strings.Contains(rel, "..") {
		return "", false
	}
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return "", false
	}
	joined := filepath.Join(absRoot, filepath.FromSlash(rel))
	abs, err := filepath.Abs(joined)
	if err != nil {
		return "", false
	}
	sep := string(os.PathSeparator)
	rootPrefix := absRoot
	if !strings.HasSuffix(rootPrefix, sep) {
		rootPrefix += sep
	}
	if abs != absRoot && !strings.HasPrefix(abs, rootPrefix) {
		return "", false
	}
	return abs, true
}
