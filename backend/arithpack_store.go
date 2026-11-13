package main

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"time"
)

var (
	errArithpackDate  = errors.New("arithpack date")
	errArithpackCells = errors.New("arithpack cells")
	errArithpackPath  = errors.New("arithpack path")
)

type arithpackStore struct {
	root string
}

func newArithpackStore(mediaRoot string) *arithpackStore {
	return &arithpackStore{root: filepath.Join(mediaRoot, "eoschool", "arithpack")}
}

func (s *arithpackStore) studentDir(owner, student string) (string, error) {
	if !arithpackKeyPattern.MatchString(owner) || !arithpackKeyPattern.MatchString(student) {
		return "", errArithpackPath
	}
	dir := filepath.Join(s.root, owner, student)
	if !strings.HasPrefix(filepath.Clean(dir), filepath.Clean(s.root)) {
		return "", errArithpackPath
	}
	return dir, nil
}

func (s *arithpackStore) saveDay(day ArithpackDay, photos map[string][]byte) error {
	dir, err := s.studentDir(day.OwnerUserID, day.StudentKey)
	if err != nil {
		return err
	}
	dayDir := filepath.Join(dir, day.Day)
	if err := os.MkdirAll(filepath.Join(dayDir, "photos"), 0o750); err != nil {
		return err
	}
	for name, body := range photos {
		if !arithpackPhotoName(name) {
			return errArithpackPath
		}
		if err := os.WriteFile(filepath.Join(dayDir, "photos", name), body, 0o640); err != nil {
			return err
		}
	}
	raw, err := json.MarshalIndent(day, "", "  ")
	if err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(dayDir, "day.json"), append(raw, '\n'), 0o640); err != nil {
		return err
	}
	return s.writeBackup(day.OwnerUserID, day.StudentKey)
}

func (s *arithpackStore) listDays(owner, student string) ([]ArithpackDay, error) {
	dir, err := s.studentDir(owner, student)
	if err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var days []ArithpackDay
	for _, entry := range entries {
		if !entry.IsDir() || !arithpackDayPattern.MatchString(entry.Name()) {
			continue
		}
		day, err := s.readDay(owner, student, entry.Name())
		if err != nil {
			return nil, err
		}
		days = append(days, day)
	}
	return days, nil
}

func (s *arithpackStore) readDay(owner, student, dayID string) (ArithpackDay, error) {
	if !arithpackDayPattern.MatchString(dayID) {
		return ArithpackDay{}, errArithpackPath
	}
	dir, err := s.studentDir(owner, student)
	if err != nil {
		return ArithpackDay{}, err
	}
	raw, err := os.ReadFile(filepath.Join(dir, dayID, "day.json"))
	if err != nil {
		return ArithpackDay{}, err
	}
	var day ArithpackDay
	if err := json.Unmarshal(raw, &day); err != nil {
		return ArithpackDay{}, err
	}
	return day, nil
}

func (s *arithpackStore) photo(owner, student, dayID, name string) (string, error) {
	if !arithpackPhotoName(name) || !arithpackDayPattern.MatchString(dayID) {
		return "", errArithpackPath
	}
	dir, err := s.studentDir(owner, student)
	if err != nil {
		return "", err
	}
	path := filepath.Join(dir, dayID, "photos", name)
	if !strings.HasPrefix(filepath.Clean(path), filepath.Clean(dir)) {
		return "", errArithpackPath
	}
	return path, nil
}

func (s *arithpackStore) writeBackup(owner, student string) error {
	days, err := s.listDays(owner, student)
	if err != nil {
		return err
	}
	backup := struct {
		StudentKey string             `json:"studentKey"`
		UpdatedAt  time.Time          `json:"updatedAt"`
		Days       []ArithpackDay     `json:"days"`
		Analytics  ArithpackAnalytics `json:"analytics"`
	}{
		StudentKey: student,
		UpdatedAt:  time.Now().UTC(),
		Days:       days,
		Analytics:  arithpackAnalytics(days),
	}
	raw, err := json.MarshalIndent(backup, "", "  ")
	if err != nil {
		return err
	}
	dir, err := s.studentDir(owner, student)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, "backup.json"), append(raw, '\n'), 0o640)
}

func (s *arithpackStore) readBackup(owner, student string) ([]byte, error) {
	dir, err := s.studentDir(owner, student)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(filepath.Join(dir, "backup.json"))
}

func arithpackPhotoName(name string) bool {
	return arithpackKeyPattern.MatchString(strings.TrimSuffix(name, ".webp")) && strings.HasSuffix(name, ".webp")
}
