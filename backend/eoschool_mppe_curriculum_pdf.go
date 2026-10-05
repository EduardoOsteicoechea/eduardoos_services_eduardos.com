package main

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/EduardoOsteicoechea/eduardoos_services_eduardos.com/pkg/pdf"
)

type mppeCurriculumDaySheetJSON struct {
	Format   string `json:"format"`
	Version  int    `json:"version"`
	PlanDay  int    `json:"planDay"`
	Week     int    `json:"week"`
	Grade    string `json:"grade"`
	Title    string `json:"title"`
	Sections []struct {
		ID         string   `json:"id"`
		Label      string   `json:"label"`
		Objective  string   `json:"objective"`
		Learning   string   `json:"learning"`
		Activities []string `json:"activities"`
	} `json:"sections"`
}

func parseMPPECurriculumDaySheet(raw []byte) (pdf.MPPECurriculumDayDoc, error) {
	var in mppeCurriculumDaySheetJSON
	if err := json.Unmarshal(raw, &in); err != nil {
		return pdf.MPPECurriculumDayDoc{}, err
	}
	if strings.TrimSpace(in.Format) != "mppe-curriculum-day" {
		return pdf.MPPECurriculumDayDoc{}, fmt.Errorf("invalid format")
	}
	if in.PlanDay < 1 || len(in.Sections) == 0 {
		return pdf.MPPECurriculumDayDoc{}, fmt.Errorf("invalid plan day")
	}
	out := pdf.MPPECurriculumDayDoc{
		PlanDay: in.PlanDay,
		Week:    in.Week,
		Grade:   strings.TrimSpace(in.Grade),
		Title:   strings.TrimSpace(in.Title),
	}
	for _, s := range in.Sections {
		out.Sections = append(out.Sections, pdf.MPPECurriculumDaySection{
			ID:         strings.TrimSpace(s.ID),
			Label:      strings.TrimSpace(s.Label),
			Objective:  strings.TrimSpace(s.Objective),
			Learning:   strings.TrimSpace(s.Learning),
			Activities: s.Activities,
		})
	}
	return out, nil
}
