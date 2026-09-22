package main

import (
	"context"
	"os"
	"path/filepath"
	"strings"
)

func (a *App) maybeSeedHomescoolMaterials() {
	owner := strings.TrimSpace(os.Getenv("HOMESCOOL_SEED_OWNER_ID"))
	if owner == "" || a.homescool == nil {
		return
	}
	ciclo := strings.TrimSpace(os.Getenv("HOMESCOOL_SEED_DIR"))
	if ciclo == "" {
		// Prefer committed seed pack, then sibling elias/ciclo3 in monorepo.
		candidates := []string{
			filepath.Join("homescool_seed", "ciclo3"),
			filepath.Join("..", "..", "elias", "ciclo3"),
		}
		for _, c := range candidates {
			if st, err := os.Stat(c); err == nil && st.IsDir() {
				ciclo = c
				break
			}
		}
	}
	if ciclo == "" {
		return
	}
	assets := strings.TrimSpace(os.Getenv("HOMESCOOL_SEED_ASSETS_DIR"))
	if assets == "" {
		for _, c := range []string{
			filepath.Join("homescool_seed", "web_assets"),
			filepath.Join(filepath.Dir(ciclo), "..", "web_assets"),
			filepath.Join("..", "..", "elias", "web_assets"),
		} {
			if st, err := os.Stat(c); err == nil && st.IsDir() {
				assets = c
				break
			}
		}
	}
	existing, err := a.homescool.ListMaterials(context.Background(), []string{owner}, 3)
	if err == nil && len(existing) > 0 {
		a.log.Info("homescool.seed.skip", "owner", owner, "count", len(existing))
		return
	}
	n, err := importHomescoolSeedDir(context.Background(), a.homescool, owner, ciclo, assets)
	if err != nil {
		a.log.Error("homescool.seed.error", "err", err.Error())
		return
	}
	a.log.Info("homescool.seed.ok", "owner", owner, "count", n, "dir", ciclo)
}
