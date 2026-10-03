package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type homescoolProgressFS struct{ root string }

func newHomescoolProgressFS(mediaRoot string) *homescoolProgressFS {
	return &homescoolProgressFS{root: filepath.Join(mediaRoot, "homescool", "progress")}
}
func (fs *homescoolProgressFS) dir(owner, student, cell string) (string, error) {
	p := filepath.Clean(filepath.Join(fs.root, filepath.Base(owner), filepath.Base(student), filepath.Base(cell)))
	rel, err := filepath.Rel(filepath.Clean(fs.root), p)
	if err != nil || strings.HasPrefix(rel, "..") {
		return "", fmt.Errorf("path escape")
	}
	return p, nil
}
func (fs *homescoolProgressFS) put(owner, student, cell, name string, body []byte) error {
	dir, err := fs.dir(owner, student, cell)
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
func (fs *homescoolProgressFS) delete(owner, student, cell, name string) error {
	dir, err := fs.dir(owner, student, cell)
	if err != nil {
		return err
	}
	err = os.Remove(filepath.Join(dir, filepath.Base(name)))
	if os.IsNotExist(err) {
		return nil
	}
	return err
}
func (fs *homescoolProgressFS) open(owner, student, cell, name string) (*os.File, os.FileInfo, error) {
	dir, err := fs.dir(owner, student, cell)
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
