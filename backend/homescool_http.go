package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

func (a *App) requireHomescoolSession(w http.ResponseWriter, r *http.Request) *User {
	user := a.currentUser(r)
	if user == nil {
		a.writeSafeError(w, r, http.StatusUnauthorized, "unauthorized")
		return nil
	}
	return user
}

func (a *App) requireHomescoolTeacher(w http.ResponseWriter, r *http.Request) *User {
	user := a.requireHomescoolSession(w, r)
	if user == nil {
		return nil
	}
	if user.Role == roleAdmin {
		return user
	}
	ok, unavailable := a.hasProductEntitlement(r, user, productHomescool)
	if unavailable {
		a.writeSafeError(w, r, http.StatusServiceUnavailable, "internal_error")
		return nil
	}
	if !ok {
		a.auditEvent(r, "homescool_entitlement", "denied", user.ID)
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return nil
	}
	return user
}

func (a *App) requireHomescoolTeacherWrite(w http.ResponseWriter, r *http.Request) *User {
	if !a.requireUnsafe(w, r) {
		return nil
	}
	return a.requireHomescoolTeacher(w, r)
}

func (a *App) registerHomescoolStudentHandler(w http.ResponseWriter, r *http.Request) {
	teacher := a.requireHomescoolTeacherWrite(w, r)
	if teacher == nil {
		return
	}
	var body struct {
		StudentEmail string `json:"studentEmail"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	_, emailNorm, ok := normalizeEmail(body.StudentEmail)
	if !ok {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if emailNorm == teacher.EmailNormalized {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	student, err := a.store.UserByEmail(r.Context(), emailNorm)
	if err != nil || student == nil {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	link := HomescoolLink{
		TeacherUserID: teacher.ID,
		StudentUserID: student.ID,
		TeacherEmail:  teacher.Email,
		StudentEmail:  student.Email,
		StudentSlug:   homescoolStudentSlug(student.Email),
		S3Prefix:      homescoolRelationshipPrefix(teacher.ID, student.ID),
		Folders:       append([]string(nil), homescoolFolderNames...),
	}
	saved, err := a.homescool.CreateLink(r.Context(), link)
	already := false
	if errors.Is(err, errHomescoolDuplicate) {
		existing, found, getErr := a.homescool.GetLinkByTeacherAndStudent(r.Context(), teacher.ID, student.ID)
		if getErr != nil || !found {
			a.writeSafeError(w, r, http.StatusConflict, "conflict")
			return
		}
		saved = existing
		already = true
	} else if err != nil {
		a.mustLogf(r, "homescool.register.error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if err := a.homescool.EnsureStudentFolders(r.Context(), teacher.ID, student.ID); err != nil {
		a.mustLogf(r, "homescool.register.folders_error", "err", err.Error())
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	status := http.StatusCreated
	if already {
		status = http.StatusOK
	}
	a.mustLogf(r, "homescool.register.ok", "teacher", teacher.ID, "student", student.ID, "existing", already)
	a.auditEvent(r, "homescool_register_student", "ok", teacher.ID)
	writeJSON(w, status, map[string]any{
		"link": saved, "folders": homescoolFolderNames, "existing": already,
	})
}

func (a *App) listHomescoolStudentsHandler(w http.ResponseWriter, r *http.Request) {
	teacher := a.requireHomescoolTeacher(w, r)
	if teacher == nil {
		return
	}
	items, err := a.homescool.ListLinksByTeacher(r.Context(), teacher.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"students": items, "count": len(items)})
}

func (a *App) getHomescoolStudentHandler(w http.ResponseWriter, r *http.Request) {
	teacher := a.requireHomescoolTeacher(w, r)
	if teacher == nil {
		return
	}
	slug := r.PathValue("studentSlug")
	link, ok, err := a.homescool.GetLinkByTeacherAndSlug(r.Context(), teacher.ID, slug)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"link": link, "folders": homescoolFolderNames})
}

func (a *App) listTeacherStudentFolderHandler(w http.ResponseWriter, r *http.Request) {
	teacher := a.requireHomescoolTeacher(w, r)
	if teacher == nil {
		return
	}
	slug := r.PathValue("studentSlug")
	folder := r.PathValue("folder")
	if !homescoolIsValidFolder(folder) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	link, ok, err := a.homescool.GetLinkByTeacherAndSlug(r.Context(), teacher.ID, slug)
	if err != nil || !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	objects, err := a.homescool.ListFolder(r.Context(), link.TeacherUserID, link.StudentUserID, folder)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"folder": folder, "prefix": homescoolFolderPrefix(link.TeacherUserID, link.StudentUserID, folder),
		"objects": objects, "count": len(objects), "link": link,
	})
}

func (a *App) listHomescoolLearningHandler(w http.ResponseWriter, r *http.Request) {
	student := a.requireHomescoolSession(w, r)
	if student == nil {
		return
	}
	items, err := a.homescool.ListLinksByStudent(r.Context(), student.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"links": items, "count": len(items), "folders": homescoolFolderNames,
	})
}

func (a *App) resolveLearningLink(r *http.Request, student *User, teacherSlug string) (HomescoolLink, bool, error) {
	links, err := a.homescool.ListLinksByStudent(r.Context(), student.ID)
	if err != nil {
		return HomescoolLink{}, false, err
	}
	for _, item := range links {
		if homescoolSafeEmailKey(item.TeacherEmail) == teacherSlug || item.TeacherEmail == teacherSlug || item.TeacherUserID == teacherSlug {
			if item.StudentUserID != student.ID {
				return HomescoolLink{}, false, nil
			}
			return item, true, nil
		}
	}
	return HomescoolLink{}, false, nil
}

func (a *App) listLearningFolderHandler(w http.ResponseWriter, r *http.Request) {
	student := a.requireHomescoolSession(w, r)
	if student == nil {
		return
	}
	folder := r.PathValue("folder")
	if !homescoolIsValidFolder(folder) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	link, ok, err := a.resolveLearningLink(r, student, r.PathValue("teacherSlug"))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	objects, err := a.homescool.ListFolder(r.Context(), link.TeacherUserID, link.StudentUserID, folder)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"folder": folder, "prefix": homescoolFolderPrefix(link.TeacherUserID, link.StudentUserID, folder),
		"objects": objects, "count": len(objects), "link": link,
	})
}

func (a *App) createTaskTemplateHandler(w http.ResponseWriter, r *http.Request) {
	teacher := a.requireHomescoolTeacherWrite(w, r)
	if teacher == nil {
		return
	}
	var body struct {
		Name, Description, Period, StudyArea string
		StudyAreas                           []string
		DurationMin, MaxScore                int
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	areas := homescoolNormalizeStudyAreas(body.StudyAreas, body.StudyArea)
	tpl, err := a.homescool.CreateTemplate(r.Context(), HomescoolTaskTemplate{
		TeacherEmail: teacher.Email, TeacherUserID: teacher.ID,
		Name: body.Name, Description: body.Description, Period: strings.TrimSpace(body.Period),
		StudyAreas: areas, StudyArea: homescoolFormatStudyAreas(areas),
		DurationMin: body.DurationMin, MaxScore: body.MaxScore,
	})
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"template": tpl})
}

func (a *App) listTaskTemplatesHandler(w http.ResponseWriter, r *http.Request) {
	teacher := a.requireHomescoolTeacher(w, r)
	if teacher == nil {
		return
	}
	items, err := a.homescool.ListTemplates(r.Context(), teacher.ID, r.URL.Query().Get("period"), r.URL.Query().Get("studyArea"))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"templates": items, "count": len(items)})
}

func (a *App) getTaskTemplateHandler(w http.ResponseWriter, r *http.Request) {
	teacher := a.requireHomescoolTeacher(w, r)
	if teacher == nil {
		return
	}
	tpl, ok, err := a.homescool.GetTemplate(r.Context(), teacher.ID, r.PathValue("templateId"))
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"template": tpl})
}

func (a *App) updateTaskTemplateHandler(w http.ResponseWriter, r *http.Request) {
	teacher := a.requireHomescoolTeacherWrite(w, r)
	if teacher == nil {
		return
	}
	existing, ok, err := a.homescool.GetTemplate(r.Context(), teacher.ID, r.PathValue("templateId"))
	if err != nil || !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body struct {
		Name, Description, Period, StudyArea string
		StudyAreas                           []string
		DurationMin, MaxScore                int
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	areas := homescoolNormalizeStudyAreas(body.StudyAreas, body.StudyArea)
	if len(areas) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	existing.Name = name
	existing.Description = body.Description
	existing.Period = strings.TrimSpace(body.Period)
	existing.StudyAreas = areas
	existing.StudyArea = homescoolFormatStudyAreas(areas)
	existing.DurationMin = body.DurationMin
	existing.MaxScore = body.MaxScore
	updated, err := a.homescool.UpdateTemplate(r.Context(), existing)
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"template": updated})
}

func (a *App) createCatalogEntryHandler(w http.ResponseWriter, r *http.Request) {
	teacher := a.requireHomescoolTeacherWrite(w, r)
	if teacher == nil {
		return
	}
	var body struct {
		Kind, Label string
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	entry, err := a.homescool.CreateCatalogEntry(r.Context(), HomescoolCatalogEntry{
		TeacherEmail: teacher.Email, TeacherUserID: teacher.ID,
		Kind: body.Kind, Label: body.Label,
	})
	if err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"entry": entry})
}

func (a *App) listCatalogEntriesHandler(w http.ResponseWriter, r *http.Request) {
	teacher := a.requireHomescoolTeacher(w, r)
	if teacher == nil {
		return
	}
	kind := r.URL.Query().Get("kind")
	if kind != "" && !homescoolIsValidCatalogKind(kind) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	items, err := a.homescool.ListCatalogEntries(r.Context(), teacher.ID, kind)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"entries": items, "count": len(items)})
}

func (a *App) assignTasksHandler(w http.ResponseWriter, r *http.Request) {
	teacher := a.requireHomescoolTeacherWrite(w, r)
	if teacher == nil {
		return
	}
	link, ok, err := a.homescool.GetLinkByTeacherAndSlug(r.Context(), teacher.ID, r.PathValue("studentSlug"))
	if err != nil || !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	var body struct {
		TemplateIDs                          []string
		StartDate, EndDate                   string
		Frequency                            *HomescoolTaskFrequency
		Name, Description, Period, StudyArea string
		StudyAreas                           []string
		DurationMin, MaxScore                int
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	freq := homescoolNormalizeFrequency(body.Frequency)
	if err := homescoolValidateFrequency(freq); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	startDate := strings.TrimSpace(body.StartDate)
	endDate := strings.TrimSpace(body.EndDate)
	if startDate == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if endDate == "" {
		endDate = startDate
	}
	if err := homescoolValidateFrequencyWindow(startDate, endDate, freq); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if _, err := homescoolExpandOccurrenceDates(startDate, endDate, freq); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	created := make([]HomescoolAssignedTask, 0)
	for _, tid := range body.TemplateIDs {
		tid = strings.TrimSpace(tid)
		if tid == "" {
			continue
		}
		tpl, found, getErr := a.homescool.GetTemplate(r.Context(), teacher.ID, tid)
		if getErr != nil || !found {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		task, createErr := a.homescool.CreateTask(r.Context(), HomescoolAssignedTask{
			TemplateID: tpl.ID, TeacherEmail: teacher.Email, StudentEmail: link.StudentEmail,
			TeacherUserID: teacher.ID, StudentUserID: link.StudentUserID,
			Name: tpl.Name, Description: tpl.Description, Period: tpl.Period,
			StudyAreas: append([]string(nil), tpl.StudyAreas...), StudyArea: tpl.StudyArea,
			StartDate: startDate, EndDate: endDate, Frequency: freq,
			DurationMin: tpl.DurationMin, MaxScore: tpl.MaxScore, Status: homescoolTaskPending,
			ImageKeys: append([]string(nil), tpl.ImageKeys...),
		})
		if createErr != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		created = append(created, task)
	}
	if strings.TrimSpace(body.Name) != "" {
		areas := homescoolNormalizeStudyAreas(body.StudyAreas, body.StudyArea)
		task, createErr := a.homescool.CreateTask(r.Context(), HomescoolAssignedTask{
			TeacherEmail: teacher.Email, StudentEmail: link.StudentEmail,
			TeacherUserID: teacher.ID, StudentUserID: link.StudentUserID,
			Name: body.Name, Description: body.Description, Period: strings.TrimSpace(body.Period),
			StudyAreas: areas, StudyArea: homescoolFormatStudyAreas(areas),
			StartDate: startDate, EndDate: endDate, Frequency: freq,
			DurationMin: body.DurationMin, MaxScore: body.MaxScore, Status: homescoolTaskPending,
		})
		if createErr != nil {
			a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
			return
		}
		created = append(created, task)
	}
	if len(created) == 0 {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	a.mustLogf(r, "homescool.task.assign", "teacher", teacher.ID, "count", len(created))
	writeJSON(w, http.StatusCreated, map[string]any{"tasks": created, "count": len(created)})
}

func homescoolTaskBoards(items []HomescoolAssignedTask) map[string][]HomescoolAssignedTask {
	boards := map[string][]HomescoolAssignedTask{
		homescoolTaskPending: {}, homescoolTaskActioned: {},
		homescoolTaskReady: {}, homescoolTaskArchived: {},
	}
	for _, t := range items {
		st := t.Status
		if !homescoolIsValidTaskStatus(st) {
			st = homescoolTaskPending
		}
		boards[st] = append(boards[st], t)
	}
	return boards
}

func (a *App) listTeacherStudentTasksHandler(w http.ResponseWriter, r *http.Request) {
	teacher := a.requireHomescoolTeacher(w, r)
	if teacher == nil {
		return
	}
	link, ok, err := a.homescool.GetLinkByTeacherAndSlug(r.Context(), teacher.ID, r.PathValue("studentSlug"))
	if err != nil || !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	items, err := a.homescool.ListTasksByPair(r.Context(), teacher.ID, link.StudentUserID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"tasks": items, "count": len(items), "boards": homescoolTaskBoards(items), "link": link,
	})
}

func (a *App) gradeTaskHandler(w http.ResponseWriter, r *http.Request) {
	teacher := a.requireHomescoolTeacherWrite(w, r)
	if teacher == nil {
		return
	}
	link, ok, err := a.homescool.GetLinkByTeacherAndSlug(r.Context(), teacher.ID, r.PathValue("studentSlug"))
	if err != nil || !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	task, found, err := a.homescool.GetTask(r.Context(), teacher.ID, link.StudentUserID, r.PathValue("taskId"))
	if err != nil || !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if task.Status != homescoolTaskActioned {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body struct {
		Decision string `json:"decision"`
		Score    int    `json:"score"`
		Note     string `json:"note"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8<<10)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	decision := strings.ToLower(strings.TrimSpace(body.Decision))
	if decision != homescoolGradeValidate && decision != homescoolGradeReject {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if err := homescoolValidateScore(body.Score, task.MaxScore); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	task.Grade = &HomescoolTaskGrade{
		Decision: decision, Score: body.Score, GradedAt: homescoolNow(), Note: strings.TrimSpace(body.Note),
	}
	if decision == homescoolGradeValidate {
		task.Status = homescoolTaskReady
	} else {
		task.Status = homescoolTaskPending
	}
	updated, err := a.homescool.UpdateTask(r.Context(), task)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"task": updated, "scoreBand": homescoolScoreBand(body.Score)})
}

func (a *App) archiveTaskHandler(w http.ResponseWriter, r *http.Request) {
	teacher := a.requireHomescoolTeacherWrite(w, r)
	if teacher == nil {
		return
	}
	link, ok, err := a.homescool.GetLinkByTeacherAndSlug(r.Context(), teacher.ID, r.PathValue("studentSlug"))
	if err != nil || !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	task, found, err := a.homescool.GetTask(r.Context(), teacher.ID, link.StudentUserID, r.PathValue("taskId"))
	if err != nil || !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	task.Status = homescoolTaskArchived
	updated, err := a.homescool.UpdateTask(r.Context(), task)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"task": updated})
}

func (a *App) listLearningTasksHandler(w http.ResponseWriter, r *http.Request) {
	student := a.requireHomescoolSession(w, r)
	if student == nil {
		return
	}
	link, ok, err := a.resolveLearningLink(r, student, r.PathValue("teacherSlug"))
	if err != nil || !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	items, err := a.homescool.ListTasksByPair(r.Context(), link.TeacherUserID, student.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	statusFilter := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("status")))
	if statusFilter != "" {
		filtered := make([]HomescoolAssignedTask, 0)
		for _, t := range items {
			if t.Status == statusFilter {
				filtered = append(filtered, t)
			}
		}
		items = filtered
	}
	writeJSON(w, http.StatusOK, map[string]any{"tasks": items, "count": len(items), "link": link})
}

func (a *App) getLearningTaskHandler(w http.ResponseWriter, r *http.Request) {
	student := a.requireHomescoolSession(w, r)
	if student == nil {
		return
	}
	link, ok, err := a.resolveLearningLink(r, student, r.PathValue("teacherSlug"))
	if err != nil || !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	task, found, err := a.homescool.GetTask(r.Context(), link.TeacherUserID, student.ID, r.PathValue("taskId"))
	if err != nil || !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"task": task, "link": link})
}

func (a *App) submitLearningTaskHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	student := a.requireHomescoolSession(w, r)
	if student == nil {
		return
	}
	link, ok, err := a.resolveLearningLink(r, student, r.PathValue("teacherSlug"))
	if err != nil || !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	task, found, err := a.homescool.GetTask(r.Context(), link.TeacherUserID, student.ID, r.PathValue("taskId"))
	if err != nil || !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if task.Status != homescoolTaskPending {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	var body struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	text := strings.TrimSpace(body.Text)
	if text == "" {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	task.Submission = &HomescoolTaskSubmission{
		Text: text, Files: []HomescoolTaskFile{}, SubmittedAt: homescoolNow(),
	}
	task.Status = homescoolTaskActioned
	updated, err := a.homescool.UpdateTask(r.Context(), task)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.mustLogf(r, "homescool.task.submit", "task_id", task.ID, "text_len", len(text))
	writeJSON(w, http.StatusOK, map[string]any{"task": updated})
}
