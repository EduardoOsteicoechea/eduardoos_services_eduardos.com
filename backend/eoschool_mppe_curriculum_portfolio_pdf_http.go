package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/EduardoOsteicoechea/eduardoos_services_eduardos.com/pkg/pdf"
	"github.com/gen2brain/webp"
	"image/jpeg"
)

func (a *App) postEoschoolMPPECurriculumPortfolioPreviewHandler(w http.ResponseWriter, r *http.Request) {
	if !a.validOrigin(r) || !a.validCSRF(r) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	user, _, ok := a.requireHomescoolMaterialsAccess(w, r)
	if !ok {
		return
	}
	raw, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 4096))
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body struct {
		StudentKey string `json:"studentKey"`
	}
	if err := json.Unmarshal(raw, &body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	studentKey := normalizeEoschoolCurriculumStudentKey(body.StudentKey)
	progress, found, err := a.eoschoolCurriculum.Get(r.Context(), user.ID, studentKey)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}

	done := map[string]bool{}
	for _, k := range progress.SectionsDone {
		done[k] = true
	}

	proofs, err := a.curriculumMaterials.ListByStudentRole(r.Context(), user.ID, studentKey, eoschoolCurriculumMaterialRoleProof)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	proofJPEGs := map[string][]byte{}
	for _, m := range proofs {
		if m.Kind != eoschoolCurriculumMaterialKindImage || m.StorageName == "" {
			continue
		}
		f, _, err := a.curriculumMaterialsFS.open(user.ID, m.StudentKey, m.DayID, m.SectionID, m.StorageName)
		if err != nil {
			continue
		}
		data, err := io.ReadAll(f)
		_ = f.Close()
		if err != nil || len(data) == 0 {
			continue
		}
		jpegBytes, err := eoschoolMaterialBytesToJPEG(data, m.ContentType)
		if err != nil || len(jpegBytes) == 0 {
			continue
		}
		key := m.DayID + ":" + m.SectionID
		if _, exists := proofJPEGs[key]; !exists {
			proofJPEGs[key] = jpegBytes
		}
	}

	sectionIDs := []string{"bib", "ide", "len", "mat", "cie"}
	sectionLabels := map[string]string{
		"bib": "Biblia", "ide": "Identidad", "len": "Lenguaje", "mat": "Matematicas", "cie": "Ciencias",
	}

	totalSections := 0
	doneSections := 0
	days := make([]pdf.MPPEPortfolioDay, 0, mppeCurriculumProgramDayCount)
	for day := 1; day <= mppeCurriculumProgramDayCount; day++ {
		sheetRaw, err := loadMPPEDaySheetBytes(day)
		if err != nil {
			break
		}
		sheet, err := parseMPPECurriculumDaySheet(sheetRaw)
		if err != nil {
			continue
		}
		dayID := "d" + strconv.Itoa(day)
		learnByID := map[string]string{}
		for _, s := range sheet.Sections {
			learnByID[s.ID] = s.Learning
		}
		secs := make([]pdf.MPPEPortfolioSection, 0, 5)
		doneCount := 0
		for _, sid := range sectionIDs {
			totalSections++
			isDone := done[dayID+":"+sid]
			if isDone {
				doneCount++
				doneSections++
			}
			secs = append(secs, pdf.MPPEPortfolioSection{
				ID:       sid,
				Label:    sectionLabels[sid],
				Learning: learnByID[sid],
				Done:     isDone,
			})
		}
		status := "red"
		if doneCount == 5 {
			status = "green"
		} else if doneCount > 0 {
			status = "yellow"
		}
		days = append(days, pdf.MPPEPortfolioDay{
			PlanDay:   sheet.PlanDay,
			Week:      sheet.Week,
			Title:     sheet.Title,
			DayStatus: status,
			Sections:  secs,
		})
	}

	percent := 0.0
	if totalSections > 0 {
		percent = 100 * float64(doneSections) / float64(totalSections)
	}
	student := progress.studentView()
	portfolio := pdf.MPPEPortfolioDoc{
		StudentName: student.DisplayName,
		Age:         student.Age,
		Grade:       student.Grade,
		PercentDone: percent,
		Days:        days,
		ProofJPEGs:  proofJPEGs,
	}
	pdfBytes, err := pdf.BuildMPPECurriculumPortfolioPDF(portfolio)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "mppe_curriculum_portfolio_preview", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{
		"pdf_base64":     base64.StdEncoding.EncodeToString(pdfBytes),
		"page_width_mm":  pdf.EoschoolPageWidthMm,
		"page_height_mm": pdf.EoschoolPageHeightMm,
		"studentKey":     studentKey,
	})
}

func eoschoolMaterialBytesToJPEG(data []byte, contentType string) ([]byte, error) {
	ct := strings.ToLower(strings.TrimSpace(contentType))
	if strings.Contains(ct, "jpeg") || strings.Contains(ct, "jpg") || (len(data) > 2 && data[0] == 0xff && data[1] == 0xd8) {
		return data, nil
	}
	var img image.Image
	var err error
	if strings.Contains(ct, "webp") || (len(data) >= 12 && string(data[0:4]) == "RIFF" && string(data[8:12]) == "WEBP") {
		img, err = webp.Decode(bytes.NewReader(data))
	} else {
		img, _, err = image.Decode(bytes.NewReader(data))
	}
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 85}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
