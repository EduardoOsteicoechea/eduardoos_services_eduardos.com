package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	executionSchemaVersion   = 1
	executionMaxRunsPerStream = 50
	executionMaxMessagesStep  = 500
	executionMaxListDefault   = 20
	executionMaxListCap       = 50
)

var (
	errExecutionConflict = errors.New("execution already exists")
	errExecutionInvalid  = errors.New("invalid execution")
)

type executionIdentity struct {
	Stream        string `json:"stream"`
	Commit        string `json:"commit,omitempty"`
	BuiltAtUTC    string `json:"built_at_utc,omitempty"`
	AppVersion    string `json:"app_version,omitempty"`
	Source        string `json:"source,omitempty"`
	SourcePath    string `json:"source_path,omitempty"`
	PublishedAtUTC string `json:"published_at_utc,omitempty"`
}

type executionSubject struct {
	Title string `json:"title,omitempty"`
	URI   string `json:"uri,omitempty"`
}

type executionArtifact struct {
	Role string `json:"role,omitempty"`
	URI  string `json:"uri,omitempty"`
}

type executionFeedback struct {
	ID    string `json:"id,omitempty"`
	Text  string `json:"text,omitempty"`
	State string `json:"state,omitempty"`
}

// executionMessage accepts a string or {text,...} object via json.RawMessage helpers.
type executionMessage any

type executionStep struct {
	StepID         string               `json:"step_id"`
	GroupID        string               `json:"group_id,omitempty"`
	Kind           string               `json:"kind,omitempty"`
	Label          string               `json:"label,omitempty"`
	Implementation string               `json:"implementation,omitempty"`
	Status         string               `json:"status"`
	Pass           bool                 `json:"pass"`
	DurationMS     int64                `json:"duration_ms,omitempty"`
	Messages       []executionMessage   `json:"messages,omitempty"`
	Methods        []string             `json:"methods,omitempty"`
	Artifacts      []executionArtifact  `json:"artifacts,omitempty"`
	FeedbackOpen   []executionFeedback  `json:"feedback_open,omitempty"`
	Notes          []string             `json:"notes,omitempty"`
	Meta           map[string]any       `json:"meta,omitempty"`
}

type executionRun struct {
	ExecutionID   string             `json:"execution_id"`
	TimestampUTC  string             `json:"timestamp_utc"`
	Identity      executionIdentity  `json:"identity"`
	Subject       executionSubject   `json:"subject"`
	Steps         []executionStep    `json:"steps"`
	ProjectID     string             `json:"project_id,omitempty"`
}

type executionDB struct {
	SchemaVersion int            `json:"schema_version"`
	ProjectID     string         `json:"project_id,omitempty"`
	Runs          []executionRun `json:"runs"`
}

type executionStepIndex struct {
	Total            int    `json:"total"`
	Pass             int    `json:"pass"`
	Fail             int    `json:"fail"`
	Review           int    `json:"review"`
	Skipped          int    `json:"skipped"`
	Error            int    `json:"error"`
	LastExecutionID  string `json:"last_execution_id,omitempty"`
	LastSubject      string `json:"last_subject,omitempty"`
	LastStatus       string `json:"last_status,omitempty"`
	LastLogURI       string `json:"last_log_uri,omitempty"`
	LastTimestampUTC string `json:"last_timestamp_utc,omitempty"`
}

type executionIndex struct {
	SchemaVersion int                                  `json:"schema_version"`
	ByStream      map[string]map[string]executionStepIndex `json:"by_stream"`
}

func (fs *ereportFS) executionDir(ownerUserID, orgID, reportID string) (string, error) {
	dir, err := fs.reportDir(ownerUserID, orgID, reportID)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "execution"), nil
}

func (fs *ereportFS) executionDBPath(ownerUserID, orgID, reportID string) (string, error) {
	dir, err := fs.executionDir(ownerUserID, orgID, reportID)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "executions.json"), nil
}

func (fs *ereportFS) executionIndexPath(ownerUserID, orgID, reportID string) (string, error) {
	dir, err := fs.executionDir(ownerUserID, orgID, reportID)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "executions.index.json"), nil
}

func (fs *ereportFS) executionIdentityPath(ownerUserID, orgID, reportID string) (string, error) {
	dir, err := fs.executionDir(ownerUserID, orgID, reportID)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "identity.json"), nil
}

func (fs *ereportFS) executionLastStatusPath(ownerUserID, orgID, reportID string) (string, error) {
	dir, err := fs.executionDir(ownerUserID, orgID, reportID)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "last_status.txt"), nil
}

func (fs *ereportFS) executionFeedbackPath(ownerUserID, orgID, reportID string) (string, error) {
	dir, err := fs.executionDir(ownerUserID, orgID, reportID)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "feedback_by_step.json"), nil
}

func normalizeExecutionStatus(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "pass", "fail", "review", "skipped", "error":
		return strings.ToLower(strings.TrimSpace(s))
	default:
		return ""
	}
}

func sanitizeExecutionText(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return s
	}
	lower := strings.ToLower(s)
	if strings.Contains(lower, "eos_live_") || strings.Contains(lower, "authorization: bearer") {
		return "[redacted]"
	}
	return s
}

func normalizeExecutionMessages(raw []executionMessage, max int) []executionMessage {
	if len(raw) == 0 {
		return nil
	}
	out := make([]executionMessage, 0, len(raw))
	for _, m := range raw {
		switch v := m.(type) {
		case string:
			t := sanitizeExecutionText(v)
			if t == "" {
				continue
			}
			out = append(out, t)
		case map[string]any:
			cp := map[string]any{}
			for k, val := range v {
				if ks, ok := val.(string); ok {
					cp[k] = sanitizeExecutionText(ks)
				} else {
					cp[k] = val
				}
			}
			if t, ok := cp["text"].(string); ok && t == "" {
				continue
			}
			out = append(out, cp)
		default:
			b, err := json.Marshal(v)
			if err != nil {
				continue
			}
			var asMap map[string]any
			if json.Unmarshal(b, &asMap) == nil {
				out = append(out, asMap)
			} else {
				out = append(out, string(b))
			}
		}
		if max > 0 && len(out) >= max {
			break
		}
	}
	return out
}

func validateAndNormalizeRun(run *executionRun) error {
	if run == nil {
		return errExecutionInvalid
	}
	run.ExecutionID = strings.TrimSpace(run.ExecutionID)
	if run.ExecutionID == "" {
		run.ExecutionID = randomID(16)
	}
	if !validEreportID(run.ExecutionID) {
		return fmt.Errorf("%w: execution_id", errExecutionInvalid)
	}
	if strings.TrimSpace(run.TimestampUTC) == "" {
		run.TimestampUTC = time.Now().UTC().Format(time.RFC3339Nano)
	}
	run.Identity.Stream = strings.TrimSpace(run.Identity.Stream)
	if run.Identity.Stream == "" {
		run.Identity.Stream = "default"
	}
	if len(run.Identity.Stream) > 64 {
		run.Identity.Stream = run.Identity.Stream[:64]
	}
	run.Identity.Commit = sanitizeExecutionText(run.Identity.Commit)
	run.Identity.AppVersion = sanitizeExecutionText(run.Identity.AppVersion)
	run.Identity.Source = sanitizeExecutionText(run.Identity.Source)
	run.Identity.SourcePath = sanitizeExecutionText(run.Identity.SourcePath)
	run.Subject.Title = sanitizeExecutionText(run.Subject.Title)
	run.Subject.URI = sanitizeExecutionText(run.Subject.URI)
	if len(run.Steps) == 0 {
		return fmt.Errorf("%w: steps required", errExecutionInvalid)
	}
	normSteps := make([]executionStep, 0, len(run.Steps))
	for _, st := range run.Steps {
		st.StepID = strings.TrimSpace(st.StepID)
		if st.StepID == "" {
			return fmt.Errorf("%w: step_id required", errExecutionInvalid)
		}
		st.Status = normalizeExecutionStatus(st.Status)
		if st.Status == "" {
			if st.Pass {
				st.Status = "pass"
			} else {
				st.Status = "fail"
			}
		}
		st.Pass = st.Status == "pass"
		st.Messages = normalizeExecutionMessages(st.Messages, executionMaxMessagesStep)
		if len(st.Methods) > 15 {
			st.Methods = st.Methods[:15]
		}
		for i := range st.Artifacts {
			st.Artifacts[i].URI = sanitizeExecutionText(st.Artifacts[i].URI)
			st.Artifacts[i].Role = sanitizeExecutionText(st.Artifacts[i].Role)
		}
		normSteps = append(normSteps, st)
	}
	run.Steps = normSteps
	return nil
}

func rebuildExecutionIndex(db executionDB) executionIndex {
	idx := executionIndex{
		SchemaVersion: executionSchemaVersion,
		ByStream:      map[string]map[string]executionStepIndex{},
	}
	for _, run := range db.Runs {
		stream := strings.TrimSpace(run.Identity.Stream)
		if stream == "" {
			stream = "default"
		}
		if idx.ByStream[stream] == nil {
			idx.ByStream[stream] = map[string]executionStepIndex{}
		}
		for _, st := range run.Steps {
			cur := idx.ByStream[stream][st.StepID]
			cur.Total++
			switch st.Status {
			case "pass":
				cur.Pass++
			case "fail":
				cur.Fail++
			case "review":
				cur.Review++
			case "skipped":
				cur.Skipped++
			case "error":
				cur.Error++
			}
			cur.LastExecutionID = run.ExecutionID
			cur.LastSubject = run.Subject.Title
			cur.LastStatus = st.Status
			cur.LastTimestampUTC = run.TimestampUTC
			for _, art := range st.Artifacts {
				if art.Role == "log" && art.URI != "" {
					cur.LastLogURI = art.URI
					break
				}
			}
			idx.ByStream[stream][st.StepID] = cur
		}
	}
	return idx
}

func trimRunsPerStream(runs []executionRun, maxPerStream int) []executionRun {
	if maxPerStream <= 0 || len(runs) == 0 {
		return runs
	}
	counts := map[string]int{}
	out := make([]executionRun, 0, len(runs))
	// Keep newest: iterate from end.
	for i := len(runs) - 1; i >= 0; i-- {
		stream := runs[i].Identity.Stream
		if stream == "" {
			stream = "default"
		}
		if counts[stream] >= maxPerStream {
			continue
		}
		counts[stream]++
		out = append(out, runs[i])
	}
	// Reverse back to chronological ascending.
	for i, j := 0, len(out)-1; i < j; i, j = i+1, j-1 {
		out[i], out[j] = out[j], out[i]
	}
	return out
}

func (fs *ereportFS) loadExecutionDB(ownerUserID, orgID, reportID string) (executionDB, error) {
	path, err := fs.executionDBPath(ownerUserID, orgID, reportID)
	if err != nil {
		return executionDB{}, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return executionDB{SchemaVersion: executionSchemaVersion, Runs: []executionRun{}}, nil
		}
		return executionDB{}, err
	}
	var db executionDB
	if err := json.Unmarshal(data, &db); err != nil {
		bad := strings.TrimSuffix(path, ".json") + ".bad-" + time.Now().UTC().Format("20060102T150405") + ".json"
		_ = os.Rename(path, bad)
		return executionDB{SchemaVersion: executionSchemaVersion, Runs: []executionRun{}}, nil
	}
	if db.SchemaVersion == 0 {
		db.SchemaVersion = executionSchemaVersion
	}
	if db.Runs == nil {
		db.Runs = []executionRun{}
	}
	return db, nil
}

func (fs *ereportFS) writeExecutionLastStatus(ownerUserID, orgID, reportID, line string) {
	path, err := fs.executionLastStatusPath(ownerUserID, orgID, reportID)
	if err != nil {
		return
	}
	_ = fs.writeAtomic(path, []byte(strings.TrimSpace(line)+"\n"))
}

func (fs *ereportFS) appendExecutionRun(ownerUserID, orgID, reportID string, run executionRun) (executionRun, error) {
	if err := validateAndNormalizeRun(&run); err != nil {
		return executionRun{}, err
	}
	fs.executionMu.Lock()
	defer fs.executionMu.Unlock()

	db, err := fs.loadExecutionDB(ownerUserID, orgID, reportID)
	if err != nil {
		fs.writeExecutionLastStatus(ownerUserID, orgID, reportID, time.Now().UTC().Format(time.RFC3339)+" reason=io_error load")
		return executionRun{}, err
	}
	for _, existing := range db.Runs {
		if existing.ExecutionID == run.ExecutionID {
			return executionRun{}, errExecutionConflict
		}
	}
	if db.ProjectID == "" && run.ProjectID != "" {
		db.ProjectID = run.ProjectID
	}
	db.Runs = append(db.Runs, run)
	db.Runs = trimRunsPerStream(db.Runs, executionMaxRunsPerStream)
	db.SchemaVersion = executionSchemaVersion

	dbPath, err := fs.executionDBPath(ownerUserID, orgID, reportID)
	if err != nil {
		return executionRun{}, err
	}
	if err := fs.writeJSON(dbPath, db); err != nil {
		fs.writeExecutionLastStatus(ownerUserID, orgID, reportID, time.Now().UTC().Format(time.RFC3339)+" reason=io_error write")
		return executionRun{}, err
	}
	idx := rebuildExecutionIndex(db)
	idxPath, err := fs.executionIndexPath(ownerUserID, orgID, reportID)
	if err != nil {
		return executionRun{}, err
	}
	if err := fs.writeJSON(idxPath, idx); err != nil {
		fs.writeExecutionLastStatus(ownerUserID, orgID, reportID, time.Now().UTC().Format(time.RFC3339)+" reason=io_error index")
		return executionRun{}, err
	}
	msgCount := 0
	for _, st := range run.Steps {
		msgCount += len(st.Messages)
	}
	fs.writeExecutionLastStatus(ownerUserID, orgID, reportID, fmt.Sprintf(
		"%s reason=ok stream=%s commit=%s execution_id=%s; n=%d; messages_stored=%d; db=%s",
		time.Now().UTC().Format(time.RFC3339),
		run.Identity.Stream,
		run.Identity.Commit,
		run.ExecutionID,
		len(run.Steps),
		msgCount,
		"executions.json",
	))
	return run, nil
}

func (fs *ereportFS) getExecutionRun(ownerUserID, orgID, reportID, executionID string) (executionRun, error) {
	fs.executionMu.Lock()
	defer fs.executionMu.Unlock()
	db, err := fs.loadExecutionDB(ownerUserID, orgID, reportID)
	if err != nil {
		return executionRun{}, err
	}
	for _, run := range db.Runs {
		if run.ExecutionID == executionID {
			return run, nil
		}
	}
	return executionRun{}, errEreportNotFound
}

func (fs *ereportFS) loadExecutionIndex(ownerUserID, orgID, reportID string) (executionIndex, error) {
	fs.executionMu.Lock()
	defer fs.executionMu.Unlock()
	path, err := fs.executionIndexPath(ownerUserID, orgID, reportID)
	if err != nil {
		return executionIndex{}, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			db, loadErr := fs.loadExecutionDB(ownerUserID, orgID, reportID)
			if loadErr != nil {
				return executionIndex{}, loadErr
			}
			return rebuildExecutionIndex(db), nil
		}
		return executionIndex{}, err
	}
	var idx executionIndex
	if err := json.Unmarshal(data, &idx); err != nil {
		db, loadErr := fs.loadExecutionDB(ownerUserID, orgID, reportID)
		if loadErr != nil {
			return executionIndex{}, loadErr
		}
		return rebuildExecutionIndex(db), nil
	}
	if idx.ByStream == nil {
		idx.ByStream = map[string]map[string]executionStepIndex{}
	}
	return idx, nil
}

func (fs *ereportFS) listExecutionSummaries(ownerUserID, orgID, reportID, stream, stepID string, limit int) ([]map[string]any, error) {
	fs.executionMu.Lock()
	defer fs.executionMu.Unlock()
	if limit <= 0 {
		limit = executionMaxListDefault
	}
	if limit > executionMaxListCap {
		limit = executionMaxListCap
	}
	db, err := fs.loadExecutionDB(ownerUserID, orgID, reportID)
	if err != nil {
		return nil, err
	}
	stream = strings.TrimSpace(stream)
	stepID = strings.TrimSpace(stepID)
	out := make([]map[string]any, 0, limit)
	for i := len(db.Runs) - 1; i >= 0 && len(out) < limit; i-- {
		run := db.Runs[i]
		if stream != "" && run.Identity.Stream != stream {
			continue
		}
		if stepID != "" {
			found := false
			for _, st := range run.Steps {
				if st.StepID == stepID {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}
		failN, passN, reviewN := 0, 0, 0
		for _, st := range run.Steps {
			switch st.Status {
			case "fail", "error":
				failN++
			case "pass":
				passN++
			case "review":
				reviewN++
			}
		}
		out = append(out, map[string]any{
			"execution_id":  run.ExecutionID,
			"timestamp_utc": run.TimestampUTC,
			"identity":      run.Identity,
			"subject":       run.Subject,
			"step_count":    len(run.Steps),
			"pass":          passN,
			"fail":          failN,
			"review":        reviewN,
		})
	}
	return out, nil
}

func (fs *ereportFS) saveExecutionIdentity(ownerUserID, orgID, reportID string, id executionIdentity) (executionIdentity, error) {
	id.Stream = strings.TrimSpace(id.Stream)
	if id.Stream == "" {
		id.Stream = "default"
	}
	id.Commit = sanitizeExecutionText(id.Commit)
	id.AppVersion = sanitizeExecutionText(id.AppVersion)
	id.Source = sanitizeExecutionText(id.Source)
	id.SourcePath = sanitizeExecutionText(id.SourcePath)
	id.PublishedAtUTC = time.Now().UTC().Format(time.RFC3339)
	path, err := fs.executionIdentityPath(ownerUserID, orgID, reportID)
	if err != nil {
		return executionIdentity{}, err
	}
	fs.executionMu.Lock()
	defer fs.executionMu.Unlock()
	if err := fs.writeJSON(path, id); err != nil {
		return executionIdentity{}, err
	}
	return id, nil
}

func (fs *ereportFS) loadExecutionIdentity(ownerUserID, orgID, reportID string) (executionIdentity, error) {
	path, err := fs.executionIdentityPath(ownerUserID, orgID, reportID)
	if err != nil {
		return executionIdentity{}, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return executionIdentity{}, errEreportNotFound
		}
		return executionIdentity{}, err
	}
	var id executionIdentity
	if err := json.Unmarshal(data, &id); err != nil {
		return executionIdentity{}, err
	}
	return id, nil
}

func (fs *ereportFS) readExecutionLastStatus(ownerUserID, orgID, reportID string) (string, error) {
	path, err := fs.executionLastStatusPath(ownerUserID, orgID, reportID)
	if err != nil {
		return "", err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil
		}
		return "", err
	}
	return strings.TrimSpace(string(data)), nil
}

// mapFailStepsToEreportItems builds append-safe reprobado items from an execution run.
func mapFailStepsToEreportItems(run executionRun) []map[string]any {
	date := ""
	if t, err := time.Parse(time.RFC3339Nano, run.TimestampUTC); err == nil {
		date = t.UTC().Format("2006-01-02")
	} else if t, err := time.Parse(time.RFC3339, run.TimestampUTC); err == nil {
		date = t.UTC().Format("2006-01-02")
	}
	prefix := run.ExecutionID
	if len(prefix) > 12 {
		prefix = prefix[:12]
	}
	items := make([]map[string]any, 0)
	for _, st := range run.Steps {
		if st.Status != "fail" && st.Status != "review" && st.Status != "error" {
			continue
		}
		slug := ereportPathChars(strings.ToLower(st.StepID))
		if slug == "" {
			slug = "step"
		}
		incidencia := joinExecutionMessages(st.Messages, 8)
		if incidencia == "" {
			incidencia = st.StepID + " " + st.Status
		}
		items = append(items, map[string]any{
			"id":               fmt.Sprintf("exec-%s-%s", prefix, slug),
			"nombre":           strings.TrimSpace(st.StepID + " " + st.Label),
			"incidencia":       incidencia,
			"solucion":         "",
			"status":           "reprobado",
			"fechaIncidencia":  date,
			"fechaSolucion":    "",
			"imagesIncidencia": []any{},
			"imagesSolucion":   []any{},
		})
	}
	return items
}

func joinExecutionMessages(msgs []executionMessage, max int) string {
	parts := make([]string, 0, max)
	for _, m := range msgs {
		if len(parts) >= max {
			parts = append(parts, fmt.Sprintf("…+%d more", len(msgs)-max))
			break
		}
		switch v := m.(type) {
		case string:
			if t := strings.TrimSpace(v); t != "" {
				parts = append(parts, t)
			}
		case map[string]any:
			if t, ok := v["text"].(string); ok && strings.TrimSpace(t) != "" {
				parts = append(parts, strings.TrimSpace(t))
			}
		}
	}
	return strings.Join(parts, "\n")
}
