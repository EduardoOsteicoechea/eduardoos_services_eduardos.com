package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type eoschoolCurriculumStudentsFS struct{ root string }

func newEoschoolCurriculumStudentsFS(mediaRoot string) *eoschoolCurriculumStudentsFS {
	return &eoschoolCurriculumStudentsFS{
		root: filepath.Join(mediaRoot, "eoschool", "students"),
	}
}

func (fs *eoschoolCurriculumStudentsFS) dir(owner, studentKey string) (string, error) {
	p := filepath.Clean(filepath.Join(
		fs.root,
		filepath.Base(owner),
		filepath.Base(studentKey),
	))
	rel, err := filepath.Rel(filepath.Clean(fs.root), p)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", fmt.Errorf("path escape")
	}
	return p, nil
}

func (fs *eoschoolCurriculumStudentsFS) put(owner, studentKey, name string, body []byte) error {
	dir, err := fs.dir(owner, studentKey)
	if err != nil {
		return err
	}
	if err = os.MkdirAll(dir, 0o750); err != nil {
		return err
	}
	path := filepath.Join(dir, filepath.Base(name))
	tmp := path + ".tmp-" + randomID(8)
	if err = os.WriteFile(tmp, body, 0o640); err != nil {
		return err
	}
	if err = os.Rename(tmp, path); err != nil {
		_ = os.Remove(tmp)
		return err
	}
	return nil
}

func (fs *eoschoolCurriculumStudentsFS) delete(owner, studentKey, name string) error {
	if strings.TrimSpace(name) == "" {
		return nil
	}
	dir, err := fs.dir(owner, studentKey)
	if err != nil {
		return err
	}
	err = os.Remove(filepath.Join(dir, filepath.Base(name)))
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

func (fs *eoschoolCurriculumStudentsFS) open(owner, studentKey, name string) (*os.File, os.FileInfo, error) {
	dir, err := fs.dir(owner, studentKey)
	if err != nil {
		return nil, nil, err
	}
	f, err := os.Open(filepath.Join(dir, filepath.Base(name)))
	if err != nil {
		return nil, nil, err
	}
	info, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return nil, nil, err
	}
	return f, info, nil
}
