package main

import (
	"bufio"
	"context"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

var evoiceStandardPlan = []evoiceJobStep{
	{ID: "prepare", Label: "Prepare workdir", State: "pending"},
	{ID: "download_docs", Label: "Load documents", State: "pending"},
	{ID: "download_audios", Label: "Load existing audios", State: "pending"},
	{ID: "convert", Label: "Convert docs → MP3", State: "pending"},
	{ID: "upload", Label: "Persist audios", State: "pending"},
	{ID: "finalize", Label: "Finalize", State: "pending"},
}

var evoicePremiumPlan = []evoiceJobStep{
	{ID: "prepare", Label: "Prepare workdir", State: "pending"},
	{ID: "download_docs", Label: "Load documents", State: "pending"},
	{ID: "download_audios", Label: "Load existing audios", State: "pending"},
	{ID: "extract_speech", Label: "Convert to speech (extract)", State: "pending"},
	{ID: "refine_deepseek", Label: "Refine with DeepSeek", State: "pending"},
	{ID: "convert_audio", Label: "Convert to audio", State: "pending"},
	{ID: "upload", Label: "Persist audios", State: "pending"},
	{ID: "finalize", Label: "Finalize", State: "pending"},
}

type evoiceJobRunner interface {
	Run(ctx context.Context, projectDir string, onlyFiles []string, opts evoiceGenerateOpts, logFn func(string)) (evoiceJobStats, error)
}

type evoiceFakeRunner struct{}

func (evoiceFakeRunner) Run(_ context.Context, projectDir string, onlyFiles []string, opts evoiceGenerateOpts, logFn func(string)) (evoiceJobStats, error) {
	docsDir := filepath.Join(projectDir, "docs")
	audiosDir := filepath.Join(projectDir, "audios")
	_ = os.MkdirAll(audiosDir, 0o750)
	entries, err := os.ReadDir(docsDir)
	if err != nil {
		return evoiceJobStats{}, err
	}
	allow := evoiceOnlySet(onlyFiles)
	stats := evoiceJobStats{}
	deep := opts.UsesDeepSeek()
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if name == ".keep" || !isEvoiceConvertible(name) {
			continue
		}
		if len(allow) > 0 && !allow[name] {
			continue
		}
		stats.Docs++
		stem := strings.TrimSuffix(name, filepath.Ext(name))
		ver := nextEvoiceAudioVersion(audiosDir, stem)
		logFn("FILE " + name + " state=active")
		logFn("EXTRACT " + name + " pct=50 detail=fake")
		if opts.IsSuper() {
			logFn("VISION " + name + " pct=50 detail=fake_page")
			_ = os.WriteFile(filepath.Join(docsDir, stem+".v"+strconv.Itoa(ver)+".vision.txt"), []byte("vision text"), 0o640)
		}
		if deep {
			logFn("PREMIUM " + name + " pct=100 detail=chapters=2 mode=" + opts.Mode)
			marked := "<<<CHAPTER n=\"1\" title=\"Intro\">>>\nhola uno\n<<<END>>>\n" +
				"<<<CHAPTER n=\"2\" title=\"Cuerpo\">>>\nhola dos\n<<<END>>>\n"
			_ = os.WriteFile(filepath.Join(docsDir, stem+".v"+strconv.Itoa(ver)+".premium.txt"), []byte(marked), 0o640)
			for _, ch := range []string{
				stem + ".v" + strconv.Itoa(ver) + ".c01-intro.mp3",
				stem + ".v" + strconv.Itoa(ver) + ".c02-cuerpo.mp3",
			} {
				logFn("TTS " + name + " pct=50 detail=chapter " + ch)
				if err := os.WriteFile(filepath.Join(audiosDir, ch), []byte("ID3fake-evoice"), 0o640); err != nil {
					stats.Failed++
					logFn("FAIL  " + name + ": " + err.Error())
					logFn("FILE " + name + " state=failed")
					continue
				}
				logFn("ok     " + name + " -> " + ch)
			}
			stats.Generated++
			logFn("FILE " + name + " state=done")
			continue
		}
		mp3 := stem + ".v" + strconv.Itoa(ver) + ".mp3"
		logFn("TTS " + name + " pct=50 detail=fake")
		if err := os.WriteFile(filepath.Join(audiosDir, mp3), []byte("ID3fake-evoice"), 0o640); err != nil {
			stats.Failed++
			logFn("FAIL  " + name + ": " + err.Error())
			logFn("FILE " + name + " state=failed")
			continue
		}
		stats.Generated++
		logFn("ok     " + name + " -> " + mp3)
		logFn("FILE " + name + " state=done")
	}
	logFn("STATS docs=" + strconv.Itoa(stats.Docs) + " generated=" + strconv.Itoa(stats.Generated) +
		" skipped=" + strconv.Itoa(stats.Skipped) + " failed=" + strconv.Itoa(stats.Failed))
	return stats, nil
}

type evoicePythonRunner struct {
	Python string
	Script string
}

func (p evoicePythonRunner) Run(ctx context.Context, projectDir string, onlyFiles []string, opts evoiceGenerateOpts, logFn func(string)) (evoiceJobStats, error) {
	py := p.Python
	if py == "" {
		py = "python3"
	}
	script := p.Script
	if script == "" {
		script = defaultEvoiceWorkerScript()
	}
	args := []string{script, "--project-dir", projectDir, "--mode", opts.Mode, "--content-percent", strconv.Itoa(opts.ContentPercent)}
	for _, f := range onlyFiles {
		f = strings.TrimSpace(f)
		if f != "" {
			args = append(args, "--only", f)
		}
	}
	cmd := exec.CommandContext(ctx, py, args...)
	tmpDir := filepath.Dir(projectDir)
	cmd.Env = append(os.Environ(), "PYTHONUNBUFFERED=1", "TMPDIR="+tmpDir, "TEMP="+tmpDir, "TMP="+tmpDir)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return evoiceJobStats{}, err
	}
	cmd.Stderr = cmd.Stdout
	if err := cmd.Start(); err != nil {
		return evoiceJobStats{}, err
	}
	stats := evoiceJobStats{}
	scan := bufio.NewScanner(io.LimitReader(stdout, 8<<20))
	scan.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scan.Scan() {
		line := strings.TrimSpace(scan.Text())
		if line == "" {
			continue
		}
		logFn(line)
		if strings.HasPrefix(line, "STATS ") {
			parseEvoiceStatsLine(line, &stats)
		}
	}
	waitErr := cmd.Wait()
	if scanErr := scan.Err(); scanErr != nil && waitErr == nil {
		return stats, scanErr
	}
	return stats, waitErr
}

func parseEvoiceStatsLine(line string, stats *evoiceJobStats) {
	fields := strings.Fields(line)
	for _, f := range fields[1:] {
		k, v, ok := strings.Cut(f, "=")
		if !ok {
			continue
		}
		n, _ := strconv.Atoi(v)
		switch k {
		case "docs":
			stats.Docs = n
		case "generated":
			stats.Generated = n
		case "skipped":
			stats.Skipped = n
		case "failed":
			stats.Failed = n
		}
	}
}

func defaultEvoiceWorkerScript() string {
	if v := strings.TrimSpace(os.Getenv("EVOICE_WORKER_SCRIPT")); v != "" {
		return v
	}
	candidates := []string{
		filepath.Join("evoice-worker", "linux_sync.py"),
		filepath.Join("backend", "evoice-worker", "linux_sync.py"),
	}
	if exe, err := os.Executable(); err == nil {
		base := filepath.Dir(exe)
		candidates = append(candidates, filepath.Join(base, "evoice-worker", "linux_sync.py"))
	}
	for _, c := range candidates {
		if st, err := os.Stat(c); err == nil && !st.IsDir() {
			return c
		}
	}
	return "linux_sync.py"
}

func resolveEvoiceRunner(cfg config) evoiceJobRunner {
	if cfg.EvoiceFakeTTS {
		return evoiceFakeRunner{}
	}
	py := cfg.EvoicePython
	if py == "" {
		py = "python3"
	}
	script := cfg.EvoiceWorkerScript
	if script == "" {
		script = defaultEvoiceWorkerScript()
	}
	return evoicePythonRunner{Python: py, Script: script}
}

type evoiceJobStore struct {
	mu      sync.RWMutex
	jobs    map[string]*evoiceJobStatus
	cancels map[string]context.CancelFunc
	runner  evoiceJobRunner
	meta    evoiceMetaStore
	fs      *evoiceFS
	log     *slog.Logger
	mustLog bool
}

func newEvoiceJobStore(runner evoiceJobRunner, meta evoiceMetaStore, fs *evoiceFS, log *slog.Logger, mustLog bool) *evoiceJobStore {
	if runner == nil {
		runner = evoiceFakeRunner{}
	}
	return &evoiceJobStore{
		jobs:    map[string]*evoiceJobStatus{},
		cancels: map[string]context.CancelFunc{},
		runner:  runner,
		meta:    meta,
		fs:      fs,
		log:     log,
		mustLog: mustLog,
	}
}

func (s *evoiceJobStore) logTransition(jobID, from, to, detail string) {
	if s.mustLog && s.log != nil {
		s.log.Info("evoice.job.transition",
			"job_id", jobID,
			"from", from,
			"to", to,
			"detail", detail,
		)
	}
}

func cloneEvoiceSteps(src []evoiceJobStep) []evoiceJobStep {
	out := make([]evoiceJobStep, len(src))
	copy(out, src)
	return out
}

func evoiceJobPlan(premium bool) []evoiceJobStep {
	if premium {
		return cloneEvoiceSteps(evoicePremiumPlan)
	}
	return cloneEvoiceSteps(evoiceStandardPlan)
}

func newQueuedEvoiceJob(id, owner, project string, onlyFiles []string, opts evoiceGenerateOpts) *evoiceJobStatus {
	now := time.Now().UTC()
	return &evoiceJobStatus{
		ID:             id,
		State:          "queued",
		Owner:          owner,
		Project:        project,
		OnlyFiles:      append([]string(nil), onlyFiles...),
		Premium:        opts.PremiumCompat(),
		Mode:           opts.Mode,
		ContentPercent: opts.ContentPercent,
		Logs:           []string{"queued"},
		Steps:          evoiceJobPlan(opts.UsesDeepSeek()),
		CreatedAt:      now,
		UpdatedAt:      now,
	}
}

func (s *evoiceJobStore) Get(id string) (evoiceJobStatus, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	j, ok := s.jobs[id]
	if !ok {
		return evoiceJobStatus{}, false
	}
	return *cloneEvoiceJob(j), true
}

func (s *evoiceJobStore) GetOrLoad(ctx context.Context, id string) (evoiceJobStatus, bool) {
	if job, ok := s.Get(id); ok {
		return job, true
	}
	if s.meta == nil {
		return evoiceJobStatus{}, false
	}
	job, err := s.meta.GetJob(ctx, id)
	if err != nil || job == nil {
		return evoiceJobStatus{}, false
	}
	s.mu.Lock()
	if _, exists := s.jobs[id]; !exists {
		s.jobs[id] = cloneEvoiceJob(job)
	}
	s.mu.Unlock()
	return *cloneEvoiceJob(job), true
}

func (s *evoiceJobStore) persist(ctx context.Context, id string) {
	if s.meta == nil {
		return
	}
	job, ok := s.Get(id)
	if !ok {
		return
	}
	_ = s.meta.UpsertJob(ctx, &job)
}

func (s *evoiceJobStore) appendLog(ctx context.Context, id, line string) {
	s.mu.Lock()
	var n int
	if j, ok := s.jobs[id]; ok {
		j.Logs = append(j.Logs, line)
		if len(j.Logs) > 500 {
			j.Logs = j.Logs[len(j.Logs)-500:]
		}
		n = len(j.Logs)
		j.UpdatedAt = time.Now().UTC()
	}
	s.mu.Unlock()
	if n > 0 && (n%3 == 0 || strings.HasPrefix(strings.ToUpper(line), "FILE ") ||
		strings.HasPrefix(strings.ToUpper(line), "TTS ") ||
		strings.HasPrefix(strings.ToUpper(line), "STATS ")) {
		s.persist(ctx, id)
	}
}

func (s *evoiceJobStore) setState(ctx context.Context, id, state, errMsg string, stats *evoiceJobStats) {
	s.mu.Lock()
	var from string
	if j, ok := s.jobs[id]; ok {
		from = j.State
		j.State = state
		j.Error = errMsg
		j.Stats = stats
		j.UpdatedAt = time.Now().UTC()
		if state == "done" {
			j.Progress = 100
			j.CurrentStep = ""
			for i := range j.Steps {
				if j.Steps[i].State == "pending" || j.Steps[i].State == "active" {
					j.Steps[i].State = "done"
				}
			}
			for i := range j.Files {
				if j.Files[i].State == "pending" || j.Files[i].State == "active" {
					j.Files[i].State = "done"
					j.Files[i].Progress = 100
				}
			}
		}
		if state == "failed" {
			j.CurrentStep = ""
			for i := range j.Steps {
				if j.Steps[i].State == "active" {
					j.Steps[i].State = "failed"
				}
			}
		}
	}
	s.mu.Unlock()
	s.logTransition(id, from, state, errMsg)
	s.persist(ctx, id)
}

func (s *evoiceJobStore) activateStep(ctx context.Context, id, stepID string) {
	s.mu.Lock()
	if j, ok := s.jobs[id]; ok {
		found := false
		for i := range j.Steps {
			if j.Steps[i].ID == stepID {
				j.Steps[i].State = "active"
				j.CurrentStep = stepID
				found = true
			} else if !found && (j.Steps[i].State == "pending" || j.Steps[i].State == "active") {
				j.Steps[i].State = "done"
			}
		}
		j.UpdatedAt = time.Now().UTC()
	}
	s.mu.Unlock()
	if s.mustLog && s.log != nil {
		s.log.Info("evoice.job.step", "job_id", id, "step", stepID, "state", "active")
	}
	s.persist(ctx, id)
}

func (s *evoiceJobStore) completeStep(ctx context.Context, id, stepID string) {
	s.mu.Lock()
	if j, ok := s.jobs[id]; ok {
		for i := range j.Steps {
			if j.Steps[i].ID == stepID {
				j.Steps[i].State = "done"
			}
		}
		if j.CurrentStep == stepID {
			j.CurrentStep = ""
		}
		j.UpdatedAt = time.Now().UTC()
	}
	s.mu.Unlock()
	if s.mustLog && s.log != nil {
		s.log.Info("evoice.job.step", "job_id", id, "step", stepID, "state", "done")
	}
	s.persist(ctx, id)
}

func (s *evoiceJobStore) failStep(ctx context.Context, id, stepID, errMsg string) {
	s.mu.Lock()
	from := ""
	if j, ok := s.jobs[id]; ok {
		from = j.State
		for i := range j.Steps {
			if j.Steps[i].ID == stepID {
				j.Steps[i].State = "failed"
			}
		}
		j.CurrentStep = ""
		j.State = "failed"
		j.Error = errMsg
		j.UpdatedAt = time.Now().UTC()
	}
	s.mu.Unlock()
	s.logTransition(id, from, "failed", stepID+": "+errMsg)
	s.persist(ctx, id)
}

func (s *evoiceJobStore) initFiles(ctx context.Context, id string, names []string) {
	s.mu.Lock()
	if j, ok := s.jobs[id]; ok {
		files := make([]evoiceJobFileProgress, 0, len(names))
		for _, n := range names {
			files = append(files, evoiceJobFileProgress{Name: n, State: "pending", Progress: 0})
		}
		j.Files = files
		j.UpdatedAt = time.Now().UTC()
	}
	s.mu.Unlock()
	s.persist(ctx, id)
}

func (s *evoiceJobStore) updateFile(id, name, state string, progress int, detail string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	j, ok := s.jobs[id]
	if !ok {
		return
	}
	for i := range j.Files {
		if j.Files[i].Name != name {
			continue
		}
		if state != "" {
			j.Files[i].State = state
		}
		if progress >= 0 {
			j.Files[i].Progress = progress
		}
		if detail != "" {
			j.Files[i].Detail = detail
		}
		return
	}
}

func (s *evoiceJobStore) Start(ctx context.Context, ownerSafe, project string, onlyFiles []string, opts evoiceGenerateOpts) (string, error) {
	opts.Mode = normalizeEvoiceMode(opts.Mode, false)
	opts.ContentPercent = normalizeEvoiceContentPercent(opts.ContentPercent)
	cleaned := make([]string, 0, len(onlyFiles))
	for _, f := range onlyFiles {
		f = sanitizeEvoiceFileName(strings.TrimSpace(f))
		if f != "" && validEvoiceFileName(f) && isEvoiceConvertible(f) {
			cleaned = append(cleaned, f)
		}
	}
	id := randomID(16)
	jobCtx, cancel := context.WithCancel(context.WithoutCancel(ctx))
	s.mu.Lock()
	s.jobs[id] = newQueuedEvoiceJob(id, ownerSafe, project, cleaned, opts)
	s.cancels[id] = cancel
	s.mu.Unlock()
	s.logTransition(id, "", "queued", "start")
	s.persist(ctx, id)
	go s.runJob(jobCtx, id, ownerSafe, project, cleaned, opts)
	return id, nil
}

func (s *evoiceJobStore) Stop(ctx context.Context, id string) (evoiceJobStatus, bool) {
	s.mu.Lock()
	cancel := s.cancels[id]
	j, ok := s.jobs[id]
	from := ""
	if ok && (j.State == "queued" || j.State == "running") {
		from = j.State
		j.State = "stopped"
		j.Error = "stopped by user"
		j.CurrentStep = ""
		for i := range j.Steps {
			if j.Steps[i].State == "active" {
				j.Steps[i].State = "pending"
			}
		}
		j.UpdatedAt = time.Now().UTC()
	}
	s.mu.Unlock()
	if cancel != nil {
		cancel()
	}
	if !ok {
		return evoiceJobStatus{}, false
	}
	s.logTransition(id, from, "stopped", "user")
	s.persist(ctx, id)
	return s.Get(id)
}

func evoiceResumeFiles(job evoiceJobStatus) []string {
	var out []string
	seen := map[string]bool{}
	for _, f := range job.Files {
		if f.State == "done" || f.State == "skipped" {
			continue
		}
		if !seen[f.Name] {
			seen[f.Name] = true
			out = append(out, f.Name)
		}
	}
	if len(out) == 0 {
		for _, f := range job.OnlyFiles {
			if !seen[f] {
				seen[f] = true
				out = append(out, f)
			}
		}
	}
	return out
}

func (s *evoiceJobStore) runJob(ctx context.Context, id, ownerSafe, project string, onlyFiles []string, opts evoiceGenerateOpts) {
	premium := opts.UsesDeepSeek()
	s.setState(ctx, id, "running", "", nil)

	s.activateStep(ctx, id, "prepare")
	s.appendLog(ctx, id, "prepare: using local media project dir")
	projectDir, err := s.fs.projectDir(ownerSafe, project)
	if err != nil {
		s.appendLog(ctx, id, "prepare failed: "+err.Error())
		s.failStep(ctx, id, "prepare", err.Error())
		s.clearCancel(id)
		return
	}
	if err := s.fs.ensureProject(ownerSafe, project); err != nil {
		s.appendLog(ctx, id, "prepare failed: "+err.Error())
		s.failStep(ctx, id, "prepare", err.Error())
		s.clearCancel(id)
		return
	}
	s.appendLog(ctx, id, "prepare: projectDir="+projectDir+" mode="+opts.Mode)
	s.completeStep(ctx, id, "prepare")

	s.activateStep(ctx, id, "download_docs")
	docsDir := filepath.Join(projectDir, "docs")
	targets := listEvoiceConvertibleDocs(docsDir, onlyFiles)
	s.appendLog(ctx, id, "download_docs: "+strconv.Itoa(len(targets))+" convertible doc(s)")
	s.completeStep(ctx, id, "download_docs")

	s.activateStep(ctx, id, "download_audios")
	s.appendLog(ctx, id, "download_audios: local audios ready for versioning")
	s.completeStep(ctx, id, "download_audios")

	s.initFiles(ctx, id, targets)
	convertStep := "convert"
	if premium {
		convertStep = "extract_speech"
	}
	s.activateStep(ctx, id, convertStep)
	s.appendLog(ctx, id, "convert: starting TTS worker")
	timeout := evoiceConvertTimeout(opts)
	jobCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	stats, err := s.runner.Run(jobCtx, projectDir, onlyFiles, opts, func(line string) {
		s.appendLog(ctx, id, line)
		s.applyConvertLogLine(id, line)
	})
	if ctx.Err() != nil {
		s.appendLog(ctx, id, "stopped: cancelled")
		s.mu.Lock()
		if j, ok := s.jobs[id]; ok && j.State != "stopped" {
			j.State = "stopped"
			j.Error = "stopped by user"
		}
		delete(s.cancels, id)
		s.mu.Unlock()
		s.persist(ctx, id)
		return
	}
	if err != nil && stats.Generated+stats.Skipped == 0 {
		s.appendLog(ctx, id, "runner error: "+err.Error())
		s.failStep(ctx, id, convertStep, err.Error())
		s.setState(ctx, id, "failed", err.Error(), &stats)
		s.clearCancel(id)
		return
	}
	if err != nil {
		s.appendLog(ctx, id, "runner warning: "+err.Error())
	}
	if premium {
		s.completeStep(ctx, id, "extract_speech")
		s.completeStep(ctx, id, "refine_deepseek")
		s.completeStep(ctx, id, "convert_audio")
	} else {
		s.completeStep(ctx, id, "convert")
	}

	s.activateStep(ctx, id, "upload")
	s.appendLog(ctx, id, "upload: audios already on local media filesystem")
	s.completeStep(ctx, id, "upload")

	s.activateStep(ctx, id, "finalize")
	s.appendLog(ctx, id, "done")
	s.completeStep(ctx, id, "finalize")
	errMsg := ""
	final := "done"
	if stats.Failed > 0 {
		errMsg = strconv.Itoa(stats.Failed) + " file(s) failed conversion"
	}
	if stats.Failed > 0 && stats.Generated == 0 && stats.Skipped == 0 {
		final = "failed"
	}
	s.setState(ctx, id, final, errMsg, &stats)
	s.clearCancel(id)
}

func evoiceConvertTimeout(opts evoiceGenerateOpts) time.Duration {
	if v := strings.TrimSpace(os.Getenv("EVOICE_JOB_TIMEOUT")); v != "" {
		if d, err := time.ParseDuration(v); err == nil && d > 0 {
			return d
		}
	}
	switch opts.Mode {
	case ModeSuperPremium:
		return 6 * time.Hour
	case ModePremium:
		return 2 * time.Hour
	default:
		return 45 * time.Minute
	}
}

func (s *evoiceJobStore) clearCancel(id string) {
	s.mu.Lock()
	delete(s.cancels, id)
	s.mu.Unlock()
}

func (s *evoiceJobStore) applyConvertLogLine(id, line string) {
	fields := strings.Fields(line)
	if len(fields) == 0 {
		return
	}
	kind := strings.ToUpper(fields[0])
	switch kind {
	case "FILE":
		if len(fields) < 2 {
			return
		}
		name := fields[1]
		state := evoiceKV(line, "state")
		if state == "" {
			state = "active"
		}
		pct := 5
		if state == "done" || state == "skipped" || state == "failed" {
			pct = 100
		}
		s.updateFile(id, name, state, pct, state)
	case "EXTRACT", "PREMIUM", "TTS", "FFMPEG", "VISION":
		if len(fields) < 2 {
			return
		}
		name := fields[1]
		pct := evoiceAtoiDefault(evoiceKV(line, "pct"), 40)
		detail := evoiceKV(line, "detail")
		if detail == "" {
			detail = strings.ToLower(kind)
		}
		s.updateFile(id, name, "active", pct, detail)
	}
}

func evoiceKV(line, key string) string {
	needle := key + "="
	lower := strings.ToLower(line)
	idx := strings.Index(lower, strings.ToLower(needle))
	if idx < 0 {
		return ""
	}
	rest := line[idx+len(needle):]
	if sp := strings.IndexAny(rest, " \t"); sp >= 0 {
		rest = rest[:sp]
	}
	return strings.TrimSpace(rest)
}

func evoiceAtoiDefault(s string, def int) int {
	if s == "" {
		return def
	}
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return n
}

func evoiceOnlySet(files []string) map[string]bool {
	if len(files) == 0 {
		return nil
	}
	m := make(map[string]bool, len(files))
	for _, f := range files {
		f = strings.TrimSpace(f)
		if f != "" {
			m[f] = true
		}
	}
	return m
}

func listEvoiceConvertibleDocs(docsDir string, onlyFiles []string) []string {
	entries, err := os.ReadDir(docsDir)
	if err != nil {
		return nil
	}
	allow := evoiceOnlySet(onlyFiles)
	var names []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if name == ".keep" || !isEvoiceConvertible(name) {
			continue
		}
		if len(allow) > 0 && !allow[name] {
			continue
		}
		names = append(names, name)
	}
	return names
}
