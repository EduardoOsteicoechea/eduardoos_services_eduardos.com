package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
)

func mppeDaySheetPathCandidates(planDay int) []string {
	name := fmt.Sprintf("d%d.mppe-day.json", planDay)
	rel := filepath.Join("eoschool", "requirements", "curriculum", "day-sheets", name)
	var out []string
	cwd, _ := os.Getwd()
	candidates := []string{
		filepath.Join(cwd, "..", "frontend", "public", rel),
		filepath.Join(cwd, "frontend", "public", rel),
		filepath.Join(cwd, "..", "..", "frontend", "public", rel),
		filepath.Join(cwd, "public", rel),
	}
	for _, p := range candidates {
		out = append(out, filepath.Clean(p))
	}
	return out
}

func resolveMPPEDaySheetPath(planDay int) (string, error) {
	for _, p := range mppeDaySheetPathCandidates(planDay) {
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			return p, nil
		}
	}
	return "", fmt.Errorf("day sheet not found: d%s", strconv.Itoa(planDay))
}

func loadMPPEDaySheetBytes(planDay int) ([]byte, error) {
	path, err := resolveMPPEDaySheetPath(planDay)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(path)
}
