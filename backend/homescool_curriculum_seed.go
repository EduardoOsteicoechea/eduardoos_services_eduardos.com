package main

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
)

// maybeSeedHomescoolCurriculum upserts METHOD_V1 classes from the FE curriculum
// backup JSON into Mongo under HOMESCOOL_CURRICULUM_OWNER_ID (or SEED owner).
// FE keeps curriculum.json for agent review; Mongo is the runtime SoT.
func (a *App) maybeSeedHomescoolCurriculum() {
	owner := homescoolCurriculumOwnerID()
	if owner == "" || a.homescool == nil {
		return
	}
	path := strings.TrimSpace(os.Getenv("HOMESCOOL_CURRICULUM_PATH"))
	if path == "" {
		candidates := []string{
			filepath.Join("homescool_seed", "curriculum.json"),
			filepath.Join("..", "frontend", "public", "homescool", "curriculum.json"),
			filepath.Join("frontend", "public", "homescool", "curriculum.json"),
		}
		for _, c := range candidates {
			if st, err := os.Stat(c); err == nil && !st.IsDir() {
				path = c
				break
			}
		}
	}
	if path == "" {
		return
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		a.log.Error("homescool.curriculum_seed.read", "err", err.Error(), "path", path)
		return
	}
	var pack struct {
		Format  string            `json:"format"`
		Classes []json.RawMessage `json:"classes"`
	}
	if err := json.Unmarshal(raw, &pack); err != nil {
		a.log.Error("homescool.curriculum_seed.decode", "err", err.Error())
		return
	}
	if pack.Format != "homescool-curriculum" || len(pack.Classes) == 0 {
		a.log.Info("homescool.curriculum_seed.skip_format", "format", pack.Format, "n", len(pack.Classes))
		return
	}

	existing, err := a.homescool.ListMaterials(context.Background(), []string{owner}, 0)
	if err != nil {
		a.log.Error("homescool.curriculum_seed.list", "err", err.Error())
		return
	}
	eoschoolN := 0
	for _, m := range existing {
		if m.Format == eoschoolFormatName {
			eoschoolN++
		}
	}
	force := strings.EqualFold(strings.TrimSpace(os.Getenv("HOMESCOOL_CURRICULUM_FORCE")), "true")
	if !force && eoschoolN >= len(pack.Classes) {
		a.log.Info("homescool.curriculum_seed.skip", "owner", owner, "existing_eoschool", eoschoolN, "pack", len(pack.Classes))
		return
	}
	// Upsert pack so Mongo runtime SoT matches the FE backup (empty store or FORCE=true).
	a.log.Info("homescool.curriculum_seed.begin", "owner", owner, "path", path, "classes", len(pack.Classes), "existing_eoschool", eoschoolN, "force", force)

	ctx := context.Background()
	okN, failN := 0, 0
	for _, row := range pack.Classes {
		var meta struct {
			Key string `json:"key"`
		}
		_ = json.Unmarshal(row, &meta)
		doc, err := parseEoschoolDocument(row)
		if err != nil {
			failN++
			a.log.Error("homescool.curriculum_seed.bad_class", "key", meta.Key, "err", err.Error())
			continue
		}
		body, err := marshalEoschoolDocument(doc)
		if err != nil {
			failN++
			continue
		}
		m := HomescoolMaterial{
			OwnerUserID: owner,
			Format:      eoschoolFormatName,
			Cycle:       doc.Cycle,
			Week:        doc.Week,
			Day:         doc.Day,
			Level:       doc.Level,
			Subject:     doc.Subject,
			Title:       doc.Title,
			Slug:        doc.Subject,
		}
		if _, err := a.homescool.UpsertMaterial(ctx, m, body); err != nil {
			failN++
			a.log.Error("homescool.curriculum_seed.upsert", "key", meta.Key, "err", err.Error())
			continue
		}
		okN++
	}
	a.log.Info("homescool.curriculum_seed.ok", "owner", owner, "upserted", okN, "failed", failN)
}
