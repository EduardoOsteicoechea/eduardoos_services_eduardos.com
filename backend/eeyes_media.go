package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var (
	errEeyesMediaInvalid = errors.New("invalid eeyes media")
	errEeyesMediaTooLarge = errors.New("eeyes media too large")
	errEeyesTraversal    = errors.New("eeyes path traversal")
)

type eeyesFS struct {
	root string
}

func newEeyesFS(root string) *eeyesFS {
	return &eeyesFS{root: root}
}

func (fs *eeyesFS) abs(parts ...string) (string, error) {
	joined := filepath.Join(append([]string{fs.root}, parts...)...)
	clean := filepath.Clean(joined)
	rootClean := filepath.Clean(fs.root)
	rel, err := filepath.Rel(rootClean, clean)
	if err != nil || strings.HasPrefix(rel, "..") || rel == ".." {
		return "", errEeyesTraversal
	}
	return clean, nil
}

func (fs *eeyesFS) tempDir() (string, error) {
	dir := filepath.Join(filepath.Dir(fs.root), ".media-tmp", "eeyes")
	if err := os.MkdirAll(dir, 0750); err != nil {
		return "", err
	}
	return dir, nil
}

func (fs *eeyesFS) writeMedia(ownerID, taskID, id, ext string, data []byte) (relPath string, err error) {
	relPath = filepath.ToSlash(filepath.Join(ownerID, taskID, id+ext))
	abs, err := fs.abs(ownerID, taskID, id+ext)
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(filepath.Dir(abs), 0750); err != nil {
		return "", err
	}
	tmpRoot, err := fs.tempDir()
	if err != nil {
		return "", err
	}
	tmp := filepath.Join(tmpRoot, id+ext+".tmp")
	if err := os.WriteFile(tmp, data, 0640); err != nil {
		return "", err
	}
	if err := os.Rename(tmp, abs); err != nil {
		_ = os.Remove(tmp)
		return "", err
	}
	return relPath, nil
}

func (fs *eeyesFS) resolve(rel string) (string, error) {
	rel = filepath.Clean(filepath.FromSlash(strings.TrimSpace(rel)))
	if rel == "." || strings.HasPrefix(rel, "..") {
		return "", errEeyesTraversal
	}
	parts := strings.Split(filepath.ToSlash(rel), "/")
	return fs.abs(parts...)
}

func decodeEeyesBase64(raw string) ([]byte, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, errEeyesMediaInvalid
	}
	if i := strings.Index(raw, ","); i >= 0 && strings.Contains(strings.ToLower(raw[:i]), "base64") {
		raw = raw[i+1:]
	}
	data, err := base64.StdEncoding.DecodeString(raw)
	if err != nil {
		data, err = base64.RawStdEncoding.DecodeString(raw)
	}
	if err != nil {
		return nil, errEeyesMediaInvalid
	}
	return data, nil
}

func detectEeyesImage(data []byte) (avatarKind, error) {
	if len(data) > eeyesMaxImageBytes {
		return avatarKind{}, errEeyesMediaTooLarge
	}
	kind, err := sniffImage(data)
	if err != nil {
		return avatarKind{}, errEeyesMediaInvalid
	}
	if kind.mime != "image/jpeg" && kind.mime != "image/webp" {
		return avatarKind{}, errEeyesMediaInvalid
	}
	return kind, nil
}

func detectEeyesAudio(data []byte) error {
	if len(data) > eeyesMaxAudioBytes {
		return errEeyesMediaTooLarge
	}
	if len(data) < 12 {
		return errEeyesMediaInvalid
	}
	// ISO BMFF: ....ftyp....
	if !bytes.Equal(data[4:8], []byte("ftyp")) {
		return errEeyesMediaInvalid
	}
	return nil
}

func sha256Hex(data []byte) string {
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

func eeyesMediaPublicURL(id string) string {
	return fmt.Sprintf("/api/eeyes/media/%s", id)
}

func eeyesDeviceMediaURL(id string) string {
	return fmt.Sprintf("/api/eeyes/device/media/%s", id)
}

func parseOptionalRFC3339(raw string) (*time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	t, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return nil, err
	}
	t = t.UTC()
	return &t, nil
}
