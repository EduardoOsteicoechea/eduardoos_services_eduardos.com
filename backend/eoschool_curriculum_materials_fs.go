package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type eoschoolCurriculumMaterialsFS struct{ root string }

func newEoschoolCurriculumMaterialsFS(mediaRoot string) *eoschoolCurriculumMaterialsFS {
	return &eoschoolCurriculumMaterialsFS{
		root: filepath.Join(mediaRoot, "eoschool", "curriculum"),
	}
}

func (fs *eoschoolCurriculumMaterialsFS) dir(owner, student, dayID, sectionID string) (string, error) {
	p := filepath.Clean(filepath.Join(
		fs.root,
		filepath.Base(owner),
		filepath.Base(student),
		filepath.Base(dayID),
		filepath.Base(sectionID),
	))
	rel, err := filepath.Rel(filepath.Clean(fs.root), p)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", fmt.Errorf("path escape")
	}
	return p, nil
}

func (fs *eoschoolCurriculumMaterialsFS) put(owner, student, dayID, sectionID, name string, body []byte) error {
	dir, err := fs.dir(owner, student, dayID, sectionID)
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

func (fs *eoschoolCurriculumMaterialsFS) delete(owner, student, dayID, sectionID, name string) error {
	dir, err := fs.dir(owner, student, dayID, sectionID)
	if err != nil {
		return err
	}
	err = os.Remove(filepath.Join(dir, filepath.Base(name)))
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

func (fs *eoschoolCurriculumMaterialsFS) open(owner, student, dayID, sectionID, name string) (*os.File, os.FileInfo, error) {
	dir, err := fs.dir(owner, student, dayID, sectionID)
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

func (fs *eoschoolCurriculumMaterialsFS) exists(owner, student, dayID, sectionID, name string) bool {
	dir, err := fs.dir(owner, student, dayID, sectionID)
	if err != nil {
		return false
	}
	_, err = os.Stat(filepath.Join(dir, filepath.Base(name)))
	return err == nil
}
