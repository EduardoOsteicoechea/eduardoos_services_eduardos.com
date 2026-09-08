package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

var (
	errEreportPath      = errors.New("invalid path")
	errEreportNotFound  = errors.New("not found")
	errEreportTraversal = errors.New("path rejected")
)

var safeEreportID = regexp.MustCompile(`^[A-Za-z0-9._-]{4,64}$`)

// ereportOwnerIndexDir holds one pin file per user. It is reserved so it can
// never collide with a username segment.
const ereportOwnerIndexDir = ".owners"

// ereportOwnerPin records the directory a user was first given. The pin wins
// over the live username and email, so profile edits never move files (072 §2).
type ereportOwnerPin struct {
	UserID   string   `json:"userId"`
	Segments []string `json:"segments"`
}

type ereportFS struct {
	root    string
	tmpDir  string
	maxHist int

	// owner names an owner directory from the platform user record. Nil keeps
	// the directory on the user id alone.
	owner func(userID string) (username, email string, ok bool)

	mu        sync.RWMutex
	ownerDirs map[string][]string
}

func newEreportFS(root string) *ereportFS {
	root = filepath.Clean(root)
	tmp := filepath.Join(filepath.Dir(root), ".ereport-tmp")
	return &ereportFS{root: root, tmpDir: tmp, maxHist: maxHistorySnapshots, ownerDirs: map[string][]string{}}
}

func (fs *ereportFS) ensureRoot() error {
	if fs.root == "" {
		return errEreportPath
	}
	return os.MkdirAll(fs.root, 0750)
}

func validEreportID(id string) bool {
	return safeEreportID.MatchString(strings.TrimSpace(id))
}

func (fs *ereportFS) resolve(parts ...string) (string, error) {
	if fs.root == "" {
		return "", errEreportPath
	}
	cleaned := make([]string, 0, len(parts)+1)
	cleaned = append(cleaned, fs.root)
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" || p == "." || p == ".." || strings.Contains(p, "..") || strings.ContainsAny(p, `/\`) || filepath.IsAbs(p) {
			return "", errEreportTraversal
		}
		if !validEreportID(p) && p != "orgs.json" && p != "meta.json" && p != "library.json" && p != "report.ereport" && p != "history-index.json" && p != "orgs" && p != "reports" && p != "history" && p != "images" && p != "invites" {
			base := filepath.Base(p)
			if !strings.HasSuffix(base, ".json") && !strings.HasSuffix(base, ".jpg") && !strings.HasSuffix(base, ".png") && !strings.HasSuffix(base, ".webp") && !strings.HasSuffix(base, ".ereport") {
				return "", errEreportTraversal
			}
			name := strings.TrimSuffix(strings.TrimSuffix(strings.TrimSuffix(strings.TrimSuffix(base, ".json"), ".jpg"), ".png"), ".webp")
			name = strings.TrimSuffix(name, ".ereport")
			if !validEreportID(name) && base != "orgs.json" && base != "meta.json" && base != "library.json" && base != "report.ereport" && base != "history-index.json" {
				return "", errEreportTraversal
			}
		}
		cleaned = append(cleaned, p)
	}
	full := filepath.Join(cleaned...)
	rel, err := filepath.Rel(fs.root, full)
	if err != nil || strings.HasPrefix(rel, "..") || filepath.IsAbs(rel) {
		return "", errEreportTraversal
	}
	return full, nil
}

// ereportSafeEmail encodes an email address as one path segment. This is the
// authoritative half of an owner directory, so it must stay unique per address.
func ereportSafeEmail(email string) string {
	email = strings.ToLower(strings.TrimSpace(email))
	encoded := ereportPathChars(strings.ReplaceAll(email, "@", "_at_"))
	if encoded == "" {
		return ""
	}
	if len(encoded) > 64 {
		// Truncate for the filesystem but keep two long addresses apart.
		sum := sha256.Sum256([]byte(email))
		encoded = encoded[:52] + "-" + hex.EncodeToString(sum[:5])
	}
	for len(encoded) < 4 {
		encoded += "0"
	}
	return encoded
}

// ereportUsernameSegment labels the owner directory for humans reading the
// disk. It never selects or authorizes anything, so collisions are harmless.
func ereportUsernameSegment(username, email string) string {
	label := ereportPathChars(strings.ToLower(strings.TrimSpace(username)))
	if len(label) > 64 {
		label = strings.Trim(label[:64], "-")
	}
	if len(label) < 4 || label == ereportOwnerIndexDir {
		local := strings.ToLower(strings.TrimSpace(email))
		if at := strings.Index(local, "@"); at >= 0 {
			local = local[:at]
		}
		label = ereportSafeEmail(local)
	}
	if label == "" || label == ereportOwnerIndexDir {
		label = "user"
	}
	return label
}

// ereportPathChars keeps only the characters safeEreportID accepts.
func ereportPathChars(in string) string {
	var b strings.Builder
	for _, r := range in {
		switch {
		case r >= 'a' && r <= 'z', r >= '0' && r <= '9', r == '.', r == '_', r == '-':
			b.WriteRune(r)
		default:
			b.WriteByte('-')
		}
	}
	return strings.Trim(b.String(), "-")
}

func (fs *ereportFS) ownerPinPath(ownerUserID string) (string, error) {
	return fs.resolve(ereportOwnerIndexDir, ownerUserID+".json")
}

func (fs *ereportFS) readOwnerPin(ownerUserID string) ([]string, error) {
	path, err := fs.ownerPinPath(ownerUserID)
	if err != nil {
		return nil, err
	}
	var pin ereportOwnerPin
	if err := fs.readJSON(path, &pin); err != nil {
		return nil, err
	}
	if len(pin.Segments) == 0 {
		return nil, errEreportNotFound
	}
	for _, segment := range pin.Segments {
		if !validEreportID(segment) {
			return nil, errEreportPath
		}
	}
	return pin.Segments, nil
}

func (fs *ereportFS) writeOwnerPin(ownerUserID string, segments []string) error {
	path, err := fs.ownerPinPath(ownerUserID)
	if err != nil {
		return err
	}
	return fs.writeJSON(path, ereportOwnerPin{UserID: ownerUserID, Segments: segments})
}

// ownerSegments resolves the directory that belongs to a user, pinning the
// answer the first time so later renames cannot move or orphan the tree.
func (fs *ereportFS) ownerSegments(ownerUserID string) ([]string, error) {
	ownerUserID = strings.TrimSpace(ownerUserID)
	if !validEreportID(ownerUserID) {
		return nil, errEreportPath
	}
	fs.mu.RLock()
	cached, hit := fs.ownerDirs[ownerUserID]
	fs.mu.RUnlock()
	if hit {
		return cached, nil
	}

	segments, err := fs.discoverOwnerSegments(ownerUserID)
	if err != nil {
		return nil, err
	}
	fs.mu.Lock()
	if fs.ownerDirs == nil {
		fs.ownerDirs = map[string][]string{}
	}
	fs.ownerDirs[ownerUserID] = segments
	fs.mu.Unlock()
	return segments, nil
}

func (fs *ereportFS) discoverOwnerSegments(ownerUserID string) ([]string, error) {
	if pinned, err := fs.readOwnerPin(ownerUserID); err == nil {
		return pinned, nil
	}
	// Trees written before the username+email layout keep the place they have.
	if legacy, err := fs.resolve(ownerUserID); err == nil {
		if info, statErr := os.Stat(legacy); statErr == nil && info.IsDir() {
			_ = fs.writeOwnerPin(ownerUserID, []string{ownerUserID})
			return []string{ownerUserID}, nil
		}
	}
	if fs.owner == nil {
		return []string{ownerUserID}, nil
	}
	username, email, ok := fs.owner(ownerUserID)
	if !ok {
		return nil, errEreportPath
	}
	segments := []string{ereportUsernameSegment(username, email), ereportSafeEmail(email)}
	if !validEreportID(segments[0]) || !validEreportID(segments[1]) {
		return nil, errEreportPath
	}
	_ = fs.writeOwnerPin(ownerUserID, segments)
	return segments, nil
}

// resolveOwner joins parts under the owner's directory.
func (fs *ereportFS) resolveOwner(ownerUserID string, parts ...string) (string, error) {
	segments, err := fs.ownerSegments(ownerUserID)
	if err != nil {
		return "", err
	}
	return fs.resolve(append(append([]string{}, segments...), parts...)...)
}

func (fs *ereportFS) ownerDir(ownerUserID string) (string, error) {
	return fs.resolveOwner(ownerUserID)
}

func (fs *ereportFS) orgsIndexPath(ownerUserID string) (string, error) {
	return fs.resolveOwner(ownerUserID, "orgs.json")
}

func (fs *ereportFS) orgMetaPath(ownerUserID, orgID string) (string, error) {
	if !validEreportID(orgID) {
		return "", errEreportPath
	}
	return fs.resolveOwner(ownerUserID, "orgs", orgID, "meta.json")
}

func (fs *ereportFS) orgLibraryPath(ownerUserID, orgID string) (string, error) {
	if !validEreportID(orgID) {
		return "", errEreportPath
	}
	return fs.resolveOwner(ownerUserID, "orgs", orgID, "library.json")
}

func (fs *ereportFS) orgDir(ownerUserID, orgID string) (string, error) {
	if !validEreportID(orgID) {
		return "", errEreportPath
	}
	return fs.resolveOwner(ownerUserID, "orgs", orgID)
}

func (fs *ereportFS) reportDir(ownerUserID, orgID, reportID string) (string, error) {
	if !validEreportID(orgID) || !validEreportID(reportID) {
		return "", errEreportPath
	}
	return fs.resolveOwner(ownerUserID, "orgs", orgID, "reports", reportID)
}

func (fs *ereportFS) reportMetaPath(ownerUserID, orgID, reportID string) (string, error) {
	dir, err := fs.reportDir(ownerUserID, orgID, reportID)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "meta.json"), nil
}

func (fs *ereportFS) reportPayloadPath(ownerUserID, orgID, reportID string) (string, error) {
	dir, err := fs.reportDir(ownerUserID, orgID, reportID)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "report.ereport"), nil
}

func (fs *ereportFS) historyIndexPath(ownerUserID, orgID, reportID string) (string, error) {
	dir, err := fs.reportDir(ownerUserID, orgID, reportID)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "history-index.json"), nil
}

func (fs *ereportFS) historySnapshotPath(ownerUserID, orgID, reportID, snapID string) (string, error) {
	if !validEreportID(snapID) {
		return "", errEreportPath
	}
	dir, err := fs.reportDir(ownerUserID, orgID, reportID)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "history", snapID+".json"), nil
}

func (fs *ereportFS) imagePath(ownerUserID, orgID, reportID, imageID, ext string) (string, error) {
	if !validEreportID(imageID) {
		return "", errEreportPath
	}
	ext = strings.ToLower(ext)
	if ext != ".jpg" && ext != ".png" && ext != ".webp" {
		return "", errEreportPath
	}
	dir, err := fs.reportDir(ownerUserID, orgID, reportID)
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "images", imageID+ext), nil
}

func (fs *ereportFS) invitePath(inviteID string) (string, error) {
	if !validEreportID(inviteID) {
		return "", errEreportPath
	}
	if err := fs.ensureRoot(); err != nil {
		return "", err
	}
	return fs.resolve("invites", inviteID+".json")
}

func (fs *ereportFS) mediaRel(full string) (string, error) {
	parent := filepath.Dir(fs.root)
	rel, err := filepath.Rel(parent, full)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", errEreportTraversal
	}
	return filepath.ToSlash(rel), nil
}

func (fs *ereportFS) writeAtomic(path string, data []byte) error {
	if err := fs.ensureRoot(); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0750); err != nil {
		return err
	}
	if err := os.MkdirAll(fs.tmpDir, 0750); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(fs.tmpDir, "ereport-")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer func() { _ = os.Remove(tmpName) }()
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Chmod(0640); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Rename(tmpName, path); err != nil {
		if copyErr := copyFileMode(tmpName, path, 0640); copyErr != nil {
			return copyErr
		}
	}
	return os.Chmod(path, 0640)
}

func copyFileMode(src, dest string, mode os.FileMode) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()
	out, err := os.OpenFile(dest, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, mode)
	if err != nil {
		return err
	}
	if _, err := io.Copy(out, in); err != nil {
		_ = out.Close()
		_ = os.Remove(dest)
		return err
	}
	if err := out.Close(); err != nil {
		_ = os.Remove(dest)
		return err
	}
	return os.Chmod(dest, mode)
}

func (fs *ereportFS) writeJSON(path string, v any) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	return fs.writeAtomic(path, data)
}

func (fs *ereportFS) readJSON(path string, dest any) error {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return errEreportNotFound
		}
		return err
	}
	return json.Unmarshal(data, dest)
}

func (fs *ereportFS) loadOrgsIndex(ownerUserID string) (ereportOrgsIndex, error) {
	var idx ereportOrgsIndex
	path, err := fs.orgsIndexPath(ownerUserID)
	if err != nil {
		return idx, err
	}
	if err := fs.readJSON(path, &idx); err != nil {
		if errors.Is(err, errEreportNotFound) {
			idx.Orgs = []ereportOrgCard{}
			return idx, nil
		}
		return idx, err
	}
	if idx.Orgs == nil {
		idx.Orgs = []ereportOrgCard{}
	}
	return idx, nil
}

func (fs *ereportFS) saveOrgsIndex(ownerUserID string, idx ereportOrgsIndex) error {
	if idx.Orgs == nil {
		idx.Orgs = []ereportOrgCard{}
	}
	path, err := fs.orgsIndexPath(ownerUserID)
	if err != nil {
		return err
	}
	return fs.writeJSON(path, idx)
}

func (fs *ereportFS) loadOrgMeta(ownerUserID, orgID string) (ereportOrgMeta, error) {
	var meta ereportOrgMeta
	path, err := fs.orgMetaPath(ownerUserID, orgID)
	if err != nil {
		return meta, err
	}
	if err := fs.readJSON(path, &meta); err != nil {
		return meta, err
	}
	if meta.ID == "" {
		return meta, errEreportNotFound
	}
	return meta, nil
}

func (fs *ereportFS) saveOrgMeta(ownerUserID string, meta ereportOrgMeta) error {
	path, err := fs.orgMetaPath(ownerUserID, meta.ID)
	if err != nil {
		return err
	}
	return fs.writeJSON(path, meta)
}

func (fs *ereportFS) loadOrgLibrary(ownerUserID, orgID string) (ereportLibrary, error) {
	var lib ereportLibrary
	path, err := fs.orgLibraryPath(ownerUserID, orgID)
	if err != nil {
		return lib, err
	}
	if err := fs.readJSON(path, &lib); err != nil {
		if errors.Is(err, errEreportNotFound) {
			lib.Reports = []ereportCard{}
			return lib, nil
		}
		return lib, err
	}
	if lib.Reports == nil {
		lib.Reports = []ereportCard{}
	}
	return lib, nil
}

func (fs *ereportFS) saveOrgLibrary(ownerUserID, orgID string, lib ereportLibrary) error {
	if lib.Reports == nil {
		lib.Reports = []ereportCard{}
	}
	path, err := fs.orgLibraryPath(ownerUserID, orgID)
	if err != nil {
		return err
	}
	return fs.writeJSON(path, lib)
}

func (fs *ereportFS) loadReport(ownerUserID, orgID, reportID string) (ereportMeta, map[string]any, error) {
	var meta ereportMeta
	metaPath, err := fs.reportMetaPath(ownerUserID, orgID, reportID)
	if err != nil {
		return meta, nil, err
	}
	if err := fs.readJSON(metaPath, &meta); err != nil {
		return meta, nil, err
	}
	if meta.ID == "" || meta.OwnerUserID != ownerUserID || meta.OrgID != orgID {
		return ereportMeta{}, nil, errEreportNotFound
	}
	payloadPath, err := fs.reportPayloadPath(ownerUserID, orgID, reportID)
	if err != nil {
		return meta, nil, err
	}
	var payload map[string]any
	if err := fs.readJSON(payloadPath, &payload); err != nil {
		if errors.Is(err, errEreportNotFound) {
			return meta, map[string]any{}, nil
		}
		return meta, nil, err
	}
	if payload == nil {
		payload = map[string]any{}
	}
	return meta, payload, nil
}

func (fs *ereportFS) saveReport(ownerUserID string, meta ereportMeta, payload map[string]any) error {
	if meta.OwnerUserID != ownerUserID {
		return errEreportPath
	}
	metaPath, err := fs.reportMetaPath(ownerUserID, meta.OrgID, meta.ID)
	if err != nil {
		return err
	}
	if err := fs.writeJSON(metaPath, meta); err != nil {
		return err
	}
	if payload == nil {
		return nil
	}
	payloadPath, err := fs.reportPayloadPath(ownerUserID, meta.OrgID, meta.ID)
	if err != nil {
		return err
	}
	return fs.writeJSON(payloadPath, payload)
}

func (fs *ereportFS) deleteReport(ownerUserID, orgID, reportID string) error {
	dir, err := fs.reportDir(ownerUserID, orgID, reportID)
	if err != nil {
		return err
	}
	return os.RemoveAll(dir)
}

func (fs *ereportFS) deleteOrg(ownerUserID, orgID string) error {
	dir, err := fs.orgDir(ownerUserID, orgID)
	if err != nil {
		return err
	}
	return os.RemoveAll(dir)
}

func (fs *ereportFS) loadHistory(ownerUserID, orgID, reportID string) (ereportHistoryIndex, error) {
	var idx ereportHistoryIndex
	path, err := fs.historyIndexPath(ownerUserID, orgID, reportID)
	if err != nil {
		return idx, err
	}
	if err := fs.readJSON(path, &idx); err != nil {
		if errors.Is(err, errEreportNotFound) {
			idx.Items = []ereportHistoryCard{}
			return idx, nil
		}
		return idx, err
	}
	if idx.Items == nil {
		idx.Items = []ereportHistoryCard{}
	}
	return idx, nil
}

func (fs *ereportFS) saveSnapshot(ownerUserID, orgID, reportID, tema, source, keyPrefix string, payload map[string]any) (string, error) {
	if payload == nil {
		return "", nil
	}
	id := randomID(16)
	snap := ereportSnapshot{
		ID:        id,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
		Source:    source,
		KeyPrefix: keyPrefix,
		Tema:      tema,
		Payload:   payload,
	}
	path, err := fs.historySnapshotPath(ownerUserID, orgID, reportID, id)
	if err != nil {
		return "", err
	}
	if err := fs.writeJSON(path, snap); err != nil {
		return "", err
	}
	idx, err := fs.loadHistory(ownerUserID, orgID, reportID)
	if err != nil {
		return "", err
	}
	idx.Items = append([]ereportHistoryCard{{
		ID:        snap.ID,
		CreatedAt: snap.CreatedAt,
		Source:    snap.Source,
		KeyPrefix: snap.KeyPrefix,
		Tema:      snap.Tema,
	}}, idx.Items...)
	max := fs.maxHist
	if max <= 0 {
		max = maxHistorySnapshots
	}
	for len(idx.Items) > max {
		old := idx.Items[len(idx.Items)-1]
		idx.Items = idx.Items[:len(idx.Items)-1]
		oldPath, pErr := fs.historySnapshotPath(ownerUserID, orgID, reportID, old.ID)
		if pErr == nil {
			_ = os.Remove(oldPath)
		}
	}
	indexPath, err := fs.historyIndexPath(ownerUserID, orgID, reportID)
	if err != nil {
		return "", err
	}
	if err := fs.writeJSON(indexPath, idx); err != nil {
		return "", err
	}
	return id, nil
}

func (fs *ereportFS) loadSnapshot(ownerUserID, orgID, reportID, snapID string) (ereportSnapshot, error) {
	var snap ereportSnapshot
	path, err := fs.historySnapshotPath(ownerUserID, orgID, reportID, snapID)
	if err != nil {
		return snap, err
	}
	if err := fs.readJSON(path, &snap); err != nil {
		return snap, err
	}
	if snap.ID == "" || snap.Payload == nil {
		return snap, errEreportNotFound
	}
	return snap, nil
}

func (fs *ereportFS) saveInvite(inv ereportInvite) error {
	path, err := fs.invitePath(inv.ID)
	if err != nil {
		return err
	}
	return fs.writeJSON(path, inv)
}

func (fs *ereportFS) loadInvite(inviteID string) (ereportInvite, error) {
	var inv ereportInvite
	path, err := fs.invitePath(inviteID)
	if err != nil {
		return inv, err
	}
	if err := fs.readJSON(path, &inv); err != nil {
		return inv, err
	}
	if inv.ID == "" {
		return inv, errEreportNotFound
	}
	return inv, nil
}

func (fs *ereportFS) writeImage(ownerUserID, orgID, reportID, imageID, ext string, data []byte) (string, error) {
	path, err := fs.imagePath(ownerUserID, orgID, reportID, imageID, ext)
	if err != nil {
		return "", err
	}
	if err := fs.writeAtomic(path, data); err != nil {
		return "", err
	}
	return fs.mediaRel(path)
}

func (fs *ereportFS) findImage(ownerUserID, orgID, reportID, imageID string) (string, string, error) {
	for _, ext := range []string{".jpg", ".png", ".webp"} {
		path, err := fs.imagePath(ownerUserID, orgID, reportID, imageID, ext)
		if err != nil {
			return "", "", err
		}
		if _, err := os.Stat(path); err == nil {
			rel, rErr := fs.mediaRel(path)
			if rErr != nil {
				return "", "", rErr
			}
			return path, rel, nil
		}
	}
	return "", "", errEreportNotFound
}

func (fs *ereportFS) countImages(ownerUserID, orgID, reportID string) int {
	dir, err := fs.reportDir(ownerUserID, orgID, reportID)
	if err != nil {
		return 0
	}
	entries, err := os.ReadDir(filepath.Join(dir, "images"))
	if err != nil {
		return 0
	}
	n := 0
	for _, e := range entries {
		if !e.IsDir() {
			n++
		}
	}
	return n
}
