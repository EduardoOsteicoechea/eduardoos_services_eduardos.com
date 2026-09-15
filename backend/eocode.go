package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode/utf8"
)

// eocode is the agent coding studio: a private workspace where an admin (or an
// admin-granted user) chats with a DeepSeek agent that writes a static site.
const (
	eocodeServiceID         = "eocode"
	eocodeDirName           = "eocode"
	eocodeMaxPromptRunes    = 4000
	eocodeMaxFileBytes      = 1024 * 1024
	eocodeMaxWorkspaceFiles = 250
	eocodeMaxImagesPerTurn  = 6
	eocodeMaxImageBytes     = 8 << 20
	eocodeMaxImageEdge      = 2048
	eocodeRateWindow        = time.Hour
	eocodeIPMax             = 240
	eocodeUserMax           = 120
	eocodeMaxTokensIdentify = 2048
	eocodeMaxTokensAnalyze  = 2048
	eocodeMaxTokensEdit     = 8192
	eocodeMaxTokensValidate = 8192
	eocodeMaxPromptBytes    = 180000
)

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

type eocodeWorkspace struct {
	UserID string
	Root   string
}

func (a *App) eocodeWorkspace(userID string) *eocodeWorkspace {
	return &eocodeWorkspace{
		UserID: userID,
		Root:   filepath.Join(a.cfg.MediaRoot, eocodeDirName, userID),
	}
}

func (w *eocodeWorkspace) ensure() error {
	if w == nil || strings.TrimSpace(w.UserID) == "" {
		return fmt.Errorf("invalid workspace")
	}
	if err := os.MkdirAll(filepath.Join(w.Root, "assets"), 0750); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(w.Root, "rules"), 0750); err != nil {
		return err
	}
	for rel, content := range eocodeInitialFiles {
		full := filepath.Join(w.Root, filepath.FromSlash(rel))
		if _, err := os.Stat(full); err == nil {
			continue
		}
		if err := os.MkdirAll(filepath.Dir(full), 0750); err != nil {
			return err
		}
		if err := os.WriteFile(full, []byte(content), 0640); err != nil {
			return err
		}
	}
	return nil
}

var eocodeAllowedExt = map[string]bool{
	".html": true, ".css": true, ".js": true, ".md": true, ".json": true,
	".svg": true, ".webp": true, ".gif": true, ".png": true, ".jpg": true,
	".jpeg": true, ".txt": true,
}

var eocodeProtectedFiles = map[string]bool{
	"index.html":           true,
	"styles.css":           true,
	"app.js":               true,
	"rules/constraints.md": true,
	"rules/index.md":       true,
}

func eocodeSafeRelPath(raw string) (string, bool) {
	p := strings.TrimSpace(raw)
	if p == "" || strings.ContainsAny(p, "\x00") {
		return "", false
	}
	p = strings.ReplaceAll(p, "\\", "/")
	p = path.Clean(p)
	if p == "." || p == "/" || strings.HasPrefix(p, "../") || strings.HasPrefix(p, "/") || strings.Contains(p, "/../") {
		return "", false
	}
	if !eocodeAllowedExt[strings.ToLower(path.Ext(p))] {
		return "", false
	}
	return p, true
}

func (w *eocodeWorkspace) fullPath(safeRel string) string {
	return filepath.Join(w.Root, filepath.FromSlash(safeRel))
}

func (w *eocodeWorkspace) listRelFiles() ([]string, error) {
	var out []string
	err := filepath.WalkDir(w.Root, func(full string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}
		if d.IsDir() {
			return nil
		}
		rel, relErr := filepath.Rel(w.Root, full)
		if relErr != nil {
			return nil
		}
		rel = filepath.ToSlash(rel)
		if _, ok := eocodeSafeRelPath(rel); !ok {
			return nil
		}
		out = append(out, rel)
		return nil
	})
	sort.Strings(out)
	return out, err
}

func (w *eocodeWorkspace) readFile(rel string) (string, error) {
	safe, ok := eocodeSafeRelPath(rel)
	if !ok {
		return "", fmt.Errorf("invalid path")
	}
	data, err := os.ReadFile(w.fullPath(safe))
	if err != nil {
		return "", err
	}
	if len(data) > eocodeMaxFileBytes {
		data = data[:eocodeMaxFileBytes]
	}
	return string(data), nil
}

func (w *eocodeWorkspace) writeFile(rel, content string) error {
	safe, ok := eocodeSafeRelPath(rel)
	if !ok {
		return fmt.Errorf("invalid path")
	}
	full := w.fullPath(safe)
	if err := os.MkdirAll(filepath.Dir(full), 0750); err != nil {
		return err
	}
	return os.WriteFile(full, []byte(content), 0640)
}

func (w *eocodeWorkspace) deleteFile(rel string) error {
	safe, ok := eocodeSafeRelPath(rel)
	if !ok {
		return fmt.Errorf("invalid path")
	}
	if eocodeProtectedFiles[safe] {
		return fmt.Errorf("protected file")
	}
	full := w.fullPath(safe)
	if !strings.HasPrefix(full, w.Root+string(os.PathSeparator)) {
		return fmt.Errorf("invalid path")
	}
	return os.Remove(full)
}

// ---------------------------------------------------------------------------
// File index
// ---------------------------------------------------------------------------

type eocodeFileEntry struct {
	Path         string   `json:"path"`
	Type         string   `json:"type"`
	Size         int64    `json:"size"`
	Dependencies []string `json:"dependencies,omitempty"`
	Routes       []string `json:"routes,omitempty"`
}

type eocodeFileIndex struct {
	Files []eocodeFileEntry `json:"files"`
	Media []string          `json:"media"`
	Rules []string          `json:"rules"`
}

var (
	eocodeHTMLRefRe = regexp.MustCompile(`(?i)(?:href|src)\s*=\s*["']([^"']+)["']`)
	eocodeCSSURLRe  = regexp.MustCompile(`(?i)url\(\s*["']?([^"')]+)`)
	eocodeViewRe    = regexp.MustCompile(`(?i)data-(?:view|route)\s*=\s*["']([^"']+)["']`)
)

func eocodeFileType(rel string) string {
	switch strings.ToLower(path.Ext(rel)) {
	case ".html":
		return "html"
	case ".css":
		return "css"
	case ".js":
		return "js"
	case ".md":
		if strings.HasPrefix(rel, "rules/") {
			return "rule"
		}
		return "markdown"
	case ".json":
		return "json"
	case ".svg":
		return "svg"
	case ".webp", ".gif", ".png", ".jpg", ".jpeg":
		return "image"
	default:
		return "other"
	}
}

func eocodeLocalRefs(content string, re *regexp.Regexp) []string {
	var out []string
	seen := map[string]bool{}
	for _, m := range re.FindAllStringSubmatch(content, -1) {
		ref := strings.TrimSpace(m[1])
		if ref == "" || strings.HasPrefix(ref, "http://") || strings.HasPrefix(ref, "https://") ||
			strings.HasPrefix(ref, "//") || strings.HasPrefix(ref, "data:") || strings.HasPrefix(ref, "#") {
			continue
		}
		ref = strings.TrimPrefix(ref, "./")
		if ref == "" || seen[ref] {
			continue
		}
		seen[ref] = true
		out = append(out, ref)
	}
	sort.Strings(out)
	return out
}

func (w *eocodeWorkspace) buildIndex() (*eocodeFileIndex, error) {
	relFiles, err := w.listRelFiles()
	if err != nil {
		return nil, err
	}
	if len(relFiles) > eocodeMaxWorkspaceFiles {
		relFiles = relFiles[:eocodeMaxWorkspaceFiles]
	}
	index := &eocodeFileIndex{Files: []eocodeFileEntry{}}
	for _, rel := range relFiles {
		entry := eocodeFileEntry{Path: rel, Type: eocodeFileType(rel)}
		if info, statErr := os.Stat(w.fullPath(rel)); statErr == nil {
			entry.Size = info.Size()
		}
		switch entry.Type {
		case "html":
			if content, readErr := w.readFile(rel); readErr == nil {
				entry.Dependencies = eocodeLocalRefs(content, eocodeHTMLRefRe)
				for _, m := range eocodeViewRe.FindAllStringSubmatch(content, -1) {
					if v := strings.TrimSpace(m[1]); v != "" {
						entry.Routes = append(entry.Routes, v)
					}
				}
			}
		case "css":
			if content, readErr := w.readFile(rel); readErr == nil {
				entry.Dependencies = eocodeLocalRefs(content, eocodeCSSURLRe)
			}
		case "image":
			index.Media = append(index.Media, rel)
		case "rule":
			index.Rules = append(index.Rules, rel)
		}
		index.Files = append(index.Files, entry)
	}
	sort.Strings(index.Media)
	sort.Strings(index.Rules)
	return index, nil
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

type eocodeRules struct {
	Constraints string
	Index       string
	Atomics     map[string]string
}

func (w *eocodeWorkspace) loadRules() eocodeRules {
	rules := eocodeRules{Atomics: map[string]string{}}
	rules.Constraints, _ = w.readFile("rules/constraints.md")
	rules.Index, _ = w.readFile("rules/index.md")
	relFiles, _ := w.listRelFiles()
	for _, rel := range relFiles {
		if !strings.HasPrefix(rel, "rules/") || !strings.HasSuffix(rel, ".md") {
			continue
		}
		if rel == "rules/index.md" || rel == "rules/constraints.md" {
			continue
		}
		if content, err := w.readFile(rel); err == nil {
			rules.Atomics[rel] = content
		}
	}
	return rules
}

func eocodeRulesPreamble(rules eocodeRules) string {
	var b strings.Builder
	b.WriteString("# CONSTRAINTS (fijas, no editables)\n\n")
	b.WriteString(strings.TrimSpace(rules.Constraints))
	b.WriteString("\n\n# INDICE DE REGLAS ATOMICAS (siempre enviado, editable al anadir o borrar reglas)\n\n")
	b.WriteString(strings.TrimSpace(rules.Index))
	if len(rules.Atomics) > 0 {
		b.WriteString("\n\n# CONTENIDO DE REGLAS ATOMICAS\n\n")
		keys := make([]string, 0, len(rules.Atomics))
		for k := range rules.Atomics {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			b.WriteString("## " + k + "\n\n")
			b.WriteString(strings.TrimSpace(rules.Atomics[k]))
			b.WriteString("\n\n")
		}
	}
	return b.String()
}

func eocodeRelevantRule(rules eocodeRules, files []string) string {
	var b strings.Builder
	want := map[string]bool{}
	for _, rel := range files {
		switch strings.ToLower(path.Ext(rel)) {
		case ".html", ".svg":
			want["rules/atomic-html.md"] = true
		case ".css":
			want["rules/atomic-css.md"] = true
		case ".js":
			want["rules/atomic-js.md"] = true
		case ".webp", ".gif", ".png", ".jpg", ".jpeg":
			want["rules/atomic-assets.md"] = true
		}
	}
	keys := make([]string, 0, len(want))
	for k := range want {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		if content, ok := rules.Atomics[k]; ok {
			b.WriteString("# " + k + "\n\n")
			b.WriteString(strings.TrimSpace(content))
			b.WriteString("\n\n")
		}
	}
	if b.Len() == 0 {
		return strings.TrimSpace(rules.Index)
	}
	return b.String()
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

func eocodeIdentifySystem(fileIndexJSON string, rules eocodeRules) string {
	return "Eres el agente clasificador de eocode, un estudio de programacion para un nino.\n\n" +
		"# WORKSPACE FILE INDEX\n" + fileIndexJSON + "\n\n" +
		eocodeRulesPreamble(rules) + "\n\n" +
		`# TU TAREA
Decide si el mensaje del usuario es:
- "consult": una pregunta o conversacion que NO requiere editar archivos.
- "coding": una peticion de crear, editar o borrar archivos del sitio.

Responde SOLO con un JSON valido, sin texto extra:
{"type":"consult"|"coding","text":"..."}

Si type es "consult": text = respuesta clara en markdown.
Si type es "coding": text = respuesta preliminar breve. Si algo no esta claro, haz preguntas de clarificacion y NO asumas. No generes codigo todavia.

Nunca investigues temas externos. Si preguntan algo fuera de HTML/CSS/JS, pide que lo investiguen y ofrece publicarlo como contenido estatico.`
}

func eocodeAnalyzeSystem(fileIndexJSON string, rules eocodeRules) string {
	return "Eres el agente planificador de eocode. El usuario quiere un cambio de codigo.\n\n" +
		"# WORKSPACE FILE INDEX\n" + fileIndexJSON + "\n\n" +
		eocodeRulesPreamble(rules) + "\n\n" +
		`# TU TAREA
Devuelve un plan. Responde SOLO con JSON valido:
{
  "preliminary": "respuesta al usuario en markdown",
  "modified_rules_index": "contenido completo actualizado de rules/index.md",
  "files_to_edit": [{"path":"...","reason":"..."}],
  "new_files": [{"path":"...","reason":"..."}],
  "delete_files": [{"path":"...","reason":"..."}],
  "questions": ["..."]
}

Reglas del plan:
- Puedes crear, editar y borrar archivos.
- Extensiones permitidas: .html .css .js .md .json .svg .webp .gif .png .jpg .jpeg .txt
- rules/constraints.md es fija: no la edites.
- rules/index.md siempre se envia y se actualiza si anades o borras reglas atomicas.
- Las reglas atomicas (rules/atomic-*.md) se editan, crean o borran segun haga falta.
- Si necesitas clarificacion, deja las listas de archivos vacias y llena "questions".
- No incluyas el contenido de los archivos en el plan, solo las rutas y el motivo.`
}

func eocodeEditSystem(rules eocodeRules) string {
	return "Eres el agente codificador de eocode. Debes escribir el contenido COMPLETO de cada archivo.\n\n" +
		eocodeRulesPreamble(rules) + "\n\n" +
		`# TU TAREA
Responde SOLO con JSON valido:
{"files":[{"path":"...","content":"..."}]}

Restricciones:
- Solo HTML5, CSS3 y JavaScript vanilla (ES2020+). Sin frameworks, sin CDNs, sin build tools.
- El sitio es una SPA: index.html carga styles.css y app.js; las vistas se cambian con JS.
- Referencia imagenes como assets/nombre.webp (o .gif).
- Incluye @media print optimizado para US Letter vertical (8.5in x 11in) en styles.css.
- No dejes placeholders, TODO ni fragmentos elididos.
- Escribe el contenido completo de cada archivo.
- Puedes anadir o borrar reglas atomicas si el plan lo requiere.`
}

func eocodeValidateSystem(rules eocodeRules, relevant string) string {
	return "Eres el agente validador de eocode. Revisa los archivos recien escritos.\n\n" +
		eocodeRulesPreamble(rules) + "\n\n" +
		"# REGLA RELEVANTE\n" + relevant + "\n\n" +
		`# TU TAREA
Responde SOLO con JSON valido:
{"needs_correction": true|false, "files":[{"path":"...","content":"contenido completo corregido"}], "notes":"notas breves"}

- needs_correction = true solo si hay errores reales de HTML/CSS/JS, de rutas de assets o de impresion.
- Si no hay que corregir, devuelve files vacio y needs_correction false.
- Si corriges, escribe el contenido COMPLETO del archivo afectado.`
}

// ---------------------------------------------------------------------------
// Model helpers
// ---------------------------------------------------------------------------

type eocodeLongClient interface {
	CompleteLong(ctx context.Context, system string, history []ChatMessage, maxTokens int) (ChatResult, error)
}

func eocodeComplete(ctx context.Context, client ChatClient, system string, history []ChatMessage, maxTokens int) (ChatResult, error) {
	if long, ok := client.(eocodeLongClient); ok {
		return long.CompleteLong(ctx, system, history, maxTokens)
	}
	return client.Complete(ctx, system, history)
}

// eocodeExtractJSON returns the first JSON object in a model reply, tolerating
// markdown code fences and surrounding prose.
func eocodeExtractJSON(raw string) string {
	s := strings.TrimSpace(raw)
	if idx := strings.Index(s, "```"); idx >= 0 {
		s = s[idx+3:]
		if nl := strings.IndexByte(s, '\n'); nl >= 0 {
			s = s[nl+1:]
		}
		if end := strings.Index(s, "```"); end >= 0 {
			s = s[:end]
		}
	}
	s = strings.TrimSpace(s)
	start := strings.IndexByte(s, '{')
	if start < 0 {
		return ""
	}
	depth := 0
	inStr := false
	esc := false
	for i := start; i < len(s); i++ {
		c := s[i]
		if inStr {
			switch {
			case esc:
				esc = false
			case c == '\\':
				esc = true
			case c == '"':
				inStr = false
			}
			continue
		}
		switch c {
		case '"':
			inStr = true
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				return s[start : i+1]
			}
		}
	}
	return s[start:]
}

func eocodeParseJSON[T any](raw string) (T, error) {
	var out T
	extracted := eocodeExtractJSON(raw)
	if extracted == "" {
		return out, fmt.Errorf("no json in model reply")
	}
	if err := json.Unmarshal([]byte(extracted), &out); err != nil {
		return out, err
	}
	return out, nil
}

// ---------------------------------------------------------------------------
// Request/response types
// ---------------------------------------------------------------------------

type eocodeIdentifyRequest struct {
	Message string           `json:"message"`
	History []publicChatTurn `json:"history"`
}

type eocodeIdentifyResult struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

type eocodeFilePlan struct {
	Path   string `json:"path"`
	Reason string `json:"reason"`
}

type eocodeAnalyzeResult struct {
	Preliminary        string           `json:"preliminary"`
	ModifiedRulesIndex string           `json:"modified_rules_index"`
	FilesToEdit        []eocodeFilePlan `json:"files_to_edit"`
	NewFiles           []eocodeFilePlan `json:"new_files"`
	DeleteFiles        []eocodeFilePlan `json:"delete_files"`
	Questions          []string         `json:"questions"`
}

type eocodeFileContent struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type eocodeEditResult struct {
	Files []eocodeFileContent `json:"files"`
}

type eocodeValidateResult struct {
	NeedsCorrection bool                `json:"needs_correction"`
	Files           []eocodeFileContent `json:"files"`
	Notes           string              `json:"notes"`
}

type eocodeEditRequest struct {
	Message     string           `json:"message"`
	FilesToEdit []eocodeFilePlan `json:"files_to_edit"`
	NewFiles    []eocodeFilePlan `json:"new_files"`
	DeleteFiles []eocodeFilePlan `json:"delete_files"`
}

type eocodeValidateRequest struct {
	Message string   `json:"message"`
	Files   []string `json:"files"`
}

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

func (a *App) requireEocodeAccess(w http.ResponseWriter, r *http.Request) *User {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return nil
	}
	if user.Role == roleAdmin {
		return user
	}
	granted, unavailable := a.hasAdminServiceGrant(r, user.ID, eocodeServiceID)
	if unavailable {
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return nil
	}
	if granted {
		return user
	}
	a.auditEvent(r, "eocode_access", "denied", user.ID)
	a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
	return nil
}

func (a *App) requireEocodeUnsafe(w http.ResponseWriter, r *http.Request) *User {
	if !a.requireUnsafe(w, r) {
		return nil
	}
	return a.requireEocodeAccess(w, r)
}

func (a *App) eocodeRateLimited(w http.ResponseWriter, r *http.Request, userID string) bool {
	ip := clientIP(r.RemoteAddr)
	if !a.eocodeIPLimit.allow(ip) || (userID != "" && !a.eocodeUserLimit.allow(userID)) {
		a.auditEvent(r, "eocode", "rate_limited", userID)
		a.writeSafeError(w, r, http.StatusTooManyRequests, "rate_limited")
		return true
	}
	return false
}

func (a *App) eocodeClient(w http.ResponseWriter, r *http.Request) ChatClient {
	client, ok := a.chat["deepseek"]
	if !ok {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return nil
	}
	return client
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

func (a *App) eocodeStateHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEocodeAccess(w, r)
	if user == nil {
		return
	}
	ws := a.eocodeWorkspace(user.ID)
	if err := ws.ensure(); err != nil {
		a.mustLogf(r, "eocode.state.ensure_error", "err", redactLogValue(err.Error()))
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	index, err := ws.buildIndex()
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	rules := ws.loadRules()
	a.mustLogf(r, "eocode.state", "user_id", user.ID, "files", len(index.Files))
	writeJSON(w, http.StatusOK, map[string]any{
		"user_id":     user.ID,
		"is_admin":    user.Role == roleAdmin,
		"files":       index.Files,
		"media":       index.Media,
		"rules":       index.Rules,
		"preview_url": "/api/eocode/preview/index.html",
		"rules_index": rules.Index,
	})
}

func (a *App) eocodeIdentifyHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEocodeUnsafe(w, r)
	if user == nil {
		return
	}
	if a.eocodeRateLimited(w, r, user.ID) {
		return
	}
	var body eocodeIdentifyRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	message := strings.TrimSpace(body.Message)
	if message == "" || utf8.RuneCountInString(message) > eocodeMaxPromptRunes {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	client := a.eocodeClient(w, r)
	if client == nil {
		return
	}
	ws := a.eocodeWorkspace(user.ID)
	if err := ws.ensure(); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	index, err := ws.buildIndex()
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	indexJSON, _ := json.Marshal(index)
	rules := ws.loadRules()
	system := eocodeIdentifySystem(string(indexJSON), rules)
	history := sanitizeChatTurns(body.History)
	history = append(history, ChatMessage{Role: "user", Content: message})
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()
	result, err := eocodeComplete(ctx, client, system, history, eocodeMaxTokensIdentify)
	if err != nil {
		a.auditEvent(r, "eocode_identify", "failed", user.ID)
		writeJSON(w, http.StatusOK, map[string]any{
			"ok": false, "error": "provider_unavailable",
			"request_id": requestIDFrom(r, w),
			"message":    "The coding agent could not reply.",
		})
		return
	}
	parsed, parseErr := eocodeParseJSON[eocodeIdentifyResult](result.Text)
	if parseErr != nil || (parsed.Type != "consult" && parsed.Type != "coding") {
		// Fall back to a consult so the user always gets an answer.
		parsed = eocodeIdentifyResult{Type: "consult", Text: sanitizeModelTextMax(result.Text, 8000)}
	}
	parsed.Text = sanitizeModelTextMax(parsed.Text, 8000)
	a.auditEvent(r, "eocode_identify", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":         true,
		"type":       parsed.Type,
		"text":       parsed.Text,
		"request_id": requestIDFrom(r, w),
	})
}

func (a *App) eocodeAnalyzeHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEocodeUnsafe(w, r)
	if user == nil {
		return
	}
	if a.eocodeRateLimited(w, r, user.ID) {
		return
	}
	var body eocodeIdentifyRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	message := strings.TrimSpace(body.Message)
	if message == "" || utf8.RuneCountInString(message) > eocodeMaxPromptRunes {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	client := a.eocodeClient(w, r)
	if client == nil {
		return
	}
	ws := a.eocodeWorkspace(user.ID)
	if err := ws.ensure(); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	index, err := ws.buildIndex()
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	indexJSON, _ := json.Marshal(index)
	rules := ws.loadRules()
	system := eocodeAnalyzeSystem(string(indexJSON), rules)
	history := sanitizeChatTurns(body.History)
	history = append(history, ChatMessage{Role: "user", Content: message})
	ctx, cancel := context.WithTimeout(r.Context(), 75*time.Second)
	defer cancel()
	result, err := eocodeComplete(ctx, client, system, history, eocodeMaxTokensAnalyze)
	if err != nil {
		a.auditEvent(r, "eocode_analyze", "failed", user.ID)
		writeJSON(w, http.StatusOK, map[string]any{
			"ok": false, "error": "provider_unavailable",
			"request_id": requestIDFrom(r, w),
			"message":    "The coding agent could not plan the change.",
		})
		return
	}
	plan, parseErr := eocodeParseJSON[eocodeAnalyzeResult](result.Text)
	if parseErr != nil {
		a.auditEvent(r, "eocode_analyze", "parse_failed", user.ID)
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":            true,
			"preliminary":   sanitizeModelTextMax(result.Text, 8000),
			"files_to_edit": []eocodeFilePlan{},
			"new_files":     []eocodeFilePlan{},
			"delete_files":  []eocodeFilePlan{},
			"questions":     []string{},
			"request_id":    requestIDFrom(r, w),
		})
		return
	}
	if idx := strings.TrimSpace(plan.ModifiedRulesIndex); idx != "" && idx != strings.TrimSpace(rules.Index) {
		if err := ws.writeFile("rules/index.md", idx); err != nil {
			a.mustLogf(r, "eocode.analyze.rules_write_error", "err", redactLogValue(err.Error()))
		}
	}
	a.auditEvent(r, "eocode_analyze", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":            true,
		"preliminary":   sanitizeModelTextMax(plan.Preliminary, 8000),
		"files_to_edit": plan.FilesToEdit,
		"new_files":     plan.NewFiles,
		"delete_files":  plan.DeleteFiles,
		"questions":     plan.Questions,
		"request_id":    requestIDFrom(r, w),
	})
}

func (a *App) eocodeEditHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEocodeUnsafe(w, r)
	if user == nil {
		return
	}
	if a.eocodeRateLimited(w, r, user.ID) {
		return
	}
	var body eocodeEditRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	message := strings.TrimSpace(body.Message)
	if message == "" || utf8.RuneCountInString(message) > eocodeMaxPromptRunes {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	client := a.eocodeClient(w, r)
	if client == nil {
		return
	}
	ws := a.eocodeWorkspace(user.ID)
	if err := ws.ensure(); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	rules := ws.loadRules()

	paths := make([]string, 0, len(body.FilesToEdit)+len(body.NewFiles))
	for _, plan := range append(append([]eocodeFilePlan{}, body.FilesToEdit...), body.NewFiles...) {
		if safe, ok := eocodeSafeRelPath(plan.Path); ok {
			paths = append(paths, safe)
		}
	}
	if len(paths) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if len(paths) > 40 {
		paths = paths[:40]
	}

	var userMsg strings.Builder
	userMsg.WriteString("Peticion del usuario:\n")
	userMsg.WriteString(message)
	userMsg.WriteString("\n\nArchivos a crear o modificar (con su contenido actual, si existe):\n")
	for _, rel := range paths {
		content, err := ws.readFile(rel)
		if err != nil {
			content = ""
		}
		block := "\n=== " + rel + " ===\n" + content + "\n"
		if userMsg.Len()+len(block) > eocodeMaxPromptBytes {
			userMsg.WriteString("\n(Se omitieron archivos adicionales por limite de contexto.)\n")
			break
		}
		userMsg.WriteString(block)
	}
	// Mention atomic rule files the plan wants to touch too.
	for _, plan := range append(append([]eocodeFilePlan{}, body.FilesToEdit...), body.NewFiles...) {
		if safe, ok := eocodeSafeRelPath(plan.Path); ok && strings.HasPrefix(safe, "rules/") {
			userMsg.WriteString("\n(La regla " + safe + " tambien debe actualizarse si el cambio lo requiere.)\n")
		}
	}

	system := eocodeEditSystem(rules)
	history := []ChatMessage{{Role: "user", Content: userMsg.String()}}
	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()
	result, err := eocodeComplete(ctx, client, system, history, eocodeMaxTokensEdit)
	if err != nil {
		a.auditEvent(r, "eocode_edit", "failed", user.ID)
		writeJSON(w, http.StatusOK, map[string]any{
			"ok": false, "error": "provider_unavailable",
			"request_id": requestIDFrom(r, w),
			"message":    "The coding agent could not write the files.",
		})
		return
	}
	edited, parseErr := eocodeParseJSON[eocodeEditResult](result.Text)
	if parseErr != nil {
		a.auditEvent(r, "eocode_edit", "parse_failed", user.ID)
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":         false,
			"error":      "invalid_request",
			"request_id": requestIDFrom(r, w),
			"message":    "The coding agent returned an unreadable edit.",
		})
		return
	}
	written := []string{}
	for _, file := range edited.Files {
		safe, ok := eocodeSafeRelPath(file.Path)
		if !ok {
			continue
		}
		if err := ws.writeFile(safe, file.Content); err != nil {
			a.mustLogf(r, "eocode.edit.write_error", "path", safe, "err", redactLogValue(err.Error()))
			continue
		}
		written = append(written, safe)
	}
	deleted := []string{}
	for _, plan := range body.DeleteFiles {
		safe, ok := eocodeSafeRelPath(plan.Path)
		if !ok {
			continue
		}
		if err := ws.deleteFile(safe); err != nil {
			continue
		}
		deleted = append(deleted, safe)
	}
	if len(written) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":         false,
			"error":      "invalid_request",
			"request_id": requestIDFrom(r, w),
			"message":    "The coding agent did not produce valid files.",
		})
		return
	}
	a.auditEvent(r, "eocode_edit", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":         true,
		"files":      written,
		"deleted":    deleted,
		"request_id": requestIDFrom(r, w),
	})
}

func (a *App) eocodeValidateHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEocodeUnsafe(w, r)
	if user == nil {
		return
	}
	if a.eocodeRateLimited(w, r, user.ID) {
		return
	}
	var body eocodeValidateRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	message := strings.TrimSpace(body.Message)
	client := a.eocodeClient(w, r)
	if client == nil {
		return
	}
	ws := a.eocodeWorkspace(user.ID)
	paths := []string{}
	for _, raw := range body.Files {
		if safe, ok := eocodeSafeRelPath(raw); ok {
			paths = append(paths, safe)
		}
	}
	if len(paths) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "needs_correction": false})
		return
	}
	rules := ws.loadRules()
	relevant := eocodeRelevantRule(rules, paths)
	var userMsg strings.Builder
	userMsg.WriteString("Peticion original:\n" + message + "\n\nArchivos modificados:\n")
	for _, rel := range paths {
		content, err := ws.readFile(rel)
		if err != nil {
			continue
		}
		block := "\n=== " + rel + " ===\n" + content + "\n"
		if userMsg.Len()+len(block) > eocodeMaxPromptBytes {
			userMsg.WriteString("\n(Se omitieron archivos adicionales por limite de contexto.)\n")
			break
		}
		userMsg.WriteString(block)
	}
	system := eocodeValidateSystem(rules, relevant)
	history := []ChatMessage{{Role: "user", Content: userMsg.String()}}
	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()
	result, err := eocodeComplete(ctx, client, system, history, eocodeMaxTokensValidate)
	if err != nil {
		a.auditEvent(r, "eocode_validate", "failed", user.ID)
		writeJSON(w, http.StatusOK, map[string]any{
			"ok": false, "error": "provider_unavailable",
			"request_id": requestIDFrom(r, w),
			"message":    "The coding agent could not validate the change.",
		})
		return
	}
	parsed, parseErr := eocodeParseJSON[eocodeValidateResult](result.Text)
	if parseErr != nil {
		writeJSON(w, http.StatusOK, map[string]any{
			"ok": true, "needs_correction": false, "notes": "",
			"request_id": requestIDFrom(r, w),
		})
		return
	}
	corrected := []string{}
	if parsed.NeedsCorrection {
		for _, file := range parsed.Files {
			safe, ok := eocodeSafeRelPath(file.Path)
			if !ok {
				continue
			}
			if err := ws.writeFile(safe, file.Content); err != nil {
				continue
			}
			corrected = append(corrected, safe)
		}
	}
	a.auditEvent(r, "eocode_validate", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":               true,
		"needs_correction": parsed.NeedsCorrection,
		"files":            corrected,
		"notes":            sanitizeModelTextMax(parsed.Notes, 2000),
		"request_id":       requestIDFrom(r, w),
	})
}

// eocodeUploadHandler stores an uploaded image as a site asset. JPEG/PNG/WebP
// are converted to WebP; GIF is preserved so animation survives.
func (a *App) eocodeUploadHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEocodeUnsafe(w, r)
	if user == nil {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, eocodeMaxImageBytes+1<<20)
	if err := r.ParseMultipartForm(eocodeMaxImageBytes + 1<<20); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, eocodeMaxImageBytes+1))
	if err != nil || int64(len(data)) > eocodeMaxImageBytes {
		a.writeSafeError(w, r, http.StatusBadRequest, "payload_too_large")
		return
	}
	ws := a.eocodeWorkspace(user.ID)
	if err := ws.ensure(); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	name := "assets/" + randomID(12)
	var outData []byte
	var ext string
	switch {
	case bytes.HasPrefix(data, []byte("GIF87a")) || bytes.HasPrefix(data, []byte("GIF89a")):
		outData = data
		ext = ".gif"
	default:
		kind, sniffErr := sniffImage(data)
		if sniffErr != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "unsupported_media")
			return
		}
		if kind.mime == "image/gif" {
			outData = data
			ext = ".gif"
			break
		}
		cfg, cfgErr := decodeConfig(data, kind.mime)
		if cfgErr != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_image")
			return
		}
		if cfg.Width <= 0 || cfg.Height <= 0 || cfg.Width > eocodeMaxImageEdge || cfg.Height > eocodeMaxImageEdge {
			a.writeSafeError(w, r, http.StatusBadRequest, "image_too_large")
			return
		}
		converted, convErr := eoprojectToWebp(data, kind.mime)
		if convErr != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_image")
			return
		}
		outData = converted
		ext = ".webp"
	}
	rel := name + ext
	if err := ws.writeFile(rel, string(outData)); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "eocode_image_upload", "ok", user.ID)
	writeJSON(w, http.StatusCreated, map[string]any{
		"path": rel,
		"url":  "/api/eocode/preview/" + rel,
		"mime": eocodeContentType(rel),
	})
}

// eocodePreviewHandler serves the workspace static site to the preview iframe.
func (a *App) eocodePreviewHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEocodeAccess(w, r)
	if user == nil {
		return
	}
	raw := strings.TrimPrefix(r.PathValue("path"), "/")
	if strings.TrimSpace(raw) == "" {
		raw = "index.html"
	}
	safe, ok := eocodeSafeRelPath(raw)
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	ws := a.eocodeWorkspace(user.ID)
	full := ws.fullPath(safe)
	file, err := os.Open(full)
	if err != nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	defer file.Close()
	info, err := file.Stat()
	if err != nil || info.IsDir() {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	w.Header().Set("Content-Type", eocodeContentType(safe))
	w.Header().Set("Cache-Control", "private, no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeContent(w, r, safe, info.ModTime(), file)
}

func eocodeContentType(rel string) string {
	switch strings.ToLower(path.Ext(rel)) {
	case ".html":
		return "text/html; charset=utf-8"
	case ".css":
		return "text/css; charset=utf-8"
	case ".js":
		return "application/javascript; charset=utf-8"
	case ".json":
		return "application/json; charset=utf-8"
	case ".svg":
		return "image/svg+xml"
	case ".webp":
		return "image/webp"
	case ".gif":
		return "image/gif"
	case ".png":
		return "image/png"
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".md":
		return "text/markdown; charset=utf-8"
	default:
		return "text/plain; charset=utf-8"
	}
}

// ---------------------------------------------------------------------------
// Initial workspace files
// ---------------------------------------------------------------------------

var eocodeInitialFiles = map[string]string{
	"index.html":             eocodeInitialIndexHTML,
	"styles.css":             eocodeInitialStylesCSS,
	"app.js":                 eocodeInitialAppJS,
	"rules/constraints.md":   eocodeInitialConstraints,
	"rules/index.md":         eocodeInitialRulesIndex,
	"rules/atomic-html.md":   eocodeInitialAtomicHTML,
	"rules/atomic-css.md":    eocodeInitialAtomicCSS,
	"rules/atomic-js.md":     eocodeInitialAtomicJS,
	"rules/atomic-assets.md": eocodeInitialAtomicAssets,
}
