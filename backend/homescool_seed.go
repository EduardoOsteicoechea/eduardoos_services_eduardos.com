package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

var homescoolSeedFileRE = regexp.MustCompile(`(?i)^_(\d{4})_(\d{2})_(\d{2})_(.+)_ciclo(\d+)_semana(\d+)_dia(\d+)_(.+)\.html$`)

// importHomescoolSeedDir walks an elias-style tree (cicloN/semanaN/…) and upserts materials.
func importHomescoolSeedDir(ctx context.Context, store HomescoolStore, ownerUserID, cicloRoot, webAssetsDir string) (int, error) {
	if store == nil || ownerUserID == "" || cicloRoot == "" {
		return 0, fmt.Errorf("store, owner, and ciclo root required")
	}
	if webAssetsDir != "" {
		if err := store.EnsureWebAssets(ctx, webAssetsDir); err != nil {
			return 0, fmt.Errorf("web assets: %w", err)
		}
	}
	count := 0
	err := filepath.WalkDir(cicloRoot, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() || !strings.HasSuffix(strings.ToLower(d.Name()), ".html") {
			return nil
		}
		m, html, parseErr := parseHomescoolSeedFile(path, cicloRoot)
		if parseErr != nil {
			return parseErr
		}
		m.OwnerUserID = ownerUserID
		if _, err := store.UpsertMaterial(ctx, m, html); err != nil {
			return fmt.Errorf("%s: %w", path, err)
		}
		count++
		return nil
	})
	return count, err
}

func parseHomescoolSeedFile(absPath, cicloRoot string) (HomescoolMaterial, []byte, error) {
	html, err := os.ReadFile(absPath)
	if err != nil {
		return HomescoolMaterial{}, nil, err
	}
	base := filepath.Base(absPath)
	m := HomescoolMaterial{Title: strings.TrimSuffix(base, filepath.Ext(base))}
	if matches := homescoolSeedFileRE.FindStringSubmatch(base); len(matches) == 9 {
		m.SessionDate = matches[1] + "-" + matches[2] + "-" + matches[3]
		// matches[4] is subject-ish from filename; prefer path relative to ciclo root
		m.Cycle, _ = strconv.Atoi(matches[5])
		m.Week, _ = strconv.Atoi(matches[6])
		m.Day, _ = strconv.Atoi(matches[7])
		m.Slug = homescoolSlugify(matches[8])
		m.Title = strings.ReplaceAll(matches[8], "-", " ")
		if m.Title != "" {
			m.Title = strings.ToUpper(m.Title[:1]) + m.Title[1:]
		}
	}
	rel, err := filepath.Rel(cicloRoot, absPath)
	if err != nil {
		return HomescoolMaterial{}, nil, err
	}
	parts := strings.Split(filepath.ToSlash(rel), "/")
	// Expected: semanaN / subject… / diaN / file.html  (ciclo root already cicloN)
	subjectParts := make([]string, 0)
	for _, p := range parts[:len(parts)-1] {
		pl := strings.ToLower(p)
		if strings.HasPrefix(pl, "semana") {
			if n, e := strconv.Atoi(strings.TrimPrefix(pl, "semana")); e == nil && m.Week == 0 {
				m.Week = n
			}
			continue
		}
		if strings.HasPrefix(pl, "dia") {
			if n, e := strconv.Atoi(strings.TrimPrefix(pl, "dia")); e == nil && m.Day == 0 {
				m.Day = n
			}
			continue
		}
		if strings.HasPrefix(pl, "ciclo") {
			if n, e := strconv.Atoi(strings.TrimPrefix(pl, "ciclo")); e == nil && m.Cycle == 0 {
				m.Cycle = n
			}
			continue
		}
		subjectParts = append(subjectParts, pl)
	}
	if m.Subject == "" && len(subjectParts) > 0 {
		m.Subject = strings.Join(subjectParts, "/")
	}
	if m.Cycle == 0 {
		baseDir := strings.ToLower(filepath.Base(cicloRoot))
		if strings.HasPrefix(baseDir, "ciclo") {
			m.Cycle, _ = strconv.Atoi(strings.TrimPrefix(baseDir, "ciclo"))
		}
	}
	if m.Week == 0 {
		m.Week = 1
	}
	if m.Day == 0 {
		m.Day = 1
	}
	if m.Slug == "" {
		m.Slug = homescoolSlugify(m.Title)
	}
	if err := homescoolValidateMaterialMeta(&m); err != nil {
		return HomescoolMaterial{}, nil, fmt.Errorf("%s: %w", base, err)
	}
	return m, html, nil
}
