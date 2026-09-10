package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
)

func (a *App) requireOwnedReport(w http.ResponseWriter, r *http.Request) (user *User, orgID, reportID string, ok bool) {
	user = apiUserFrom(r)
	orgID = r.PathValue("orgId")
	reportID = r.PathValue("reportId")
	_, _, err := a.ereport.loadReport(user.ID, orgID, reportID)
	if err != nil {
		a.writeEreportNotFound(w, r, orgID, reportID, ereportMissingReason(err))
		return nil, "", "", false
	}
	return user, orgID, reportID, true
}

func (a *App) ereportV1PostExecutionHandler(w http.ResponseWriter, r *http.Request) {
	user, orgID, reportID, ok := a.requireOwnedReport(w, r)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, a.cfg.EreportMaxPayloadBytes)
	var run executionRun
	if err := json.NewDecoder(r.Body).Decode(&run); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	saved, err := a.ereport.appendExecutionRun(user.ID, orgID, reportID, run)
	if err != nil {
		if errors.Is(err, errExecutionConflict) {
			writeJSON(w, http.StatusConflict, map[string]any{
				"error":      "conflict",
				"message":    safeErrorMessage("conflict"),
				"request_id": requestIDFrom(r, w),
				"hint":       "execution_id already exists; executions are append-only",
			})
			return
		}
		if errors.Is(err, errExecutionInvalid) || strings.Contains(err.Error(), "invalid execution") {
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"error":      "invalid_request",
				"message":    safeErrorMessage("invalid_request"),
				"request_id": requestIDFrom(r, w),
				"hint":       err.Error(),
			})
			return
		}
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"orgId":       orgID,
		"reportId":    reportID,
		"execution":   saved,
		"viewUrl":     a.ereportViewURL(r, displayOwnerSafe(user.Email), orgID, reportID),
	})
}

func (a *App) ereportV1ListExecutionsHandler(w http.ResponseWriter, r *http.Request) {
	user, orgID, reportID, ok := a.requireOwnedReport(w, r)
	if !ok {
		return
	}
	limit, _ := strconv.Atoi(strings.TrimSpace(r.URL.Query().Get("limit")))
	rows, err := a.ereport.listExecutionSummaries(user.ID, orgID, reportID, r.URL.Query().Get("stream"), r.URL.Query().Get("step_id"), limit)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	statusLine, _ := a.ereport.readExecutionLastStatus(user.ID, orgID, reportID)
	writeJSON(w, http.StatusOK, map[string]any{
		"orgId":       orgID,
		"reportId":    reportID,
		"last_status": statusLine,
		"executions":  rows,
		"count":       len(rows),
	})
}

func (a *App) ereportV1GetExecutionIndexHandler(w http.ResponseWriter, r *http.Request) {
	user, orgID, reportID, ok := a.requireOwnedReport(w, r)
	if !ok {
		return
	}
	idx, err := a.ereport.loadExecutionIndex(user.ID, orgID, reportID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	stream := strings.TrimSpace(r.URL.Query().Get("stream"))
	stepID := strings.TrimSpace(r.URL.Query().Get("step_id"))
	out := map[string]any{
		"orgId":          orgID,
		"reportId":       reportID,
		"schema_version": idx.SchemaVersion,
		"by_stream":      idx.ByStream,
	}
	if stream != "" {
		byStep := idx.ByStream[stream]
		if byStep == nil {
			byStep = map[string]executionStepIndex{}
		}
		if stepID != "" {
			out["step"] = byStep[stepID]
			out["stream"] = stream
			out["step_id"] = stepID
			delete(out, "by_stream")
		} else {
			out["by_stream"] = map[string]map[string]executionStepIndex{stream: byStep}
		}
	}
	writeJSON(w, http.StatusOK, out)
}

func (a *App) ereportV1GetExecutionHandler(w http.ResponseWriter, r *http.Request) {
	user, orgID, reportID, ok := a.requireOwnedReport(w, r)
	if !ok {
		return
	}
	executionID := r.PathValue("executionId")
	run, err := a.ereport.getExecutionRun(user.ID, orgID, reportID, executionID)
	if err != nil {
		if errors.Is(err, errEreportNotFound) {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"orgId":     orgID,
		"reportId":  reportID,
		"execution": run,
	})
}

func (a *App) ereportV1GetExecutionStatusHandler(w http.ResponseWriter, r *http.Request) {
	user, orgID, reportID, ok := a.requireOwnedReport(w, r)
	if !ok {
		return
	}
	line, err := a.ereport.readExecutionLastStatus(user.ID, orgID, reportID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"orgId":       orgID,
		"reportId":    reportID,
		"last_status": line,
	})
}

func (a *App) ereportV1PutExecutionIdentityHandler(w http.ResponseWriter, r *http.Request) {
	user, orgID, reportID, ok := a.requireOwnedReport(w, r)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	var id executionIdentity
	if err := json.NewDecoder(r.Body).Decode(&id); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	saved, err := a.ereport.saveExecutionIdentity(user.ID, orgID, reportID, id)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"orgId":    orgID,
		"reportId": reportID,
		"identity": saved,
	})
}

func (a *App) ereportV1GetExecutionIdentityHandler(w http.ResponseWriter, r *http.Request) {
	user, orgID, reportID, ok := a.requireOwnedReport(w, r)
	if !ok {
		return
	}
	id, err := a.ereport.loadExecutionIdentity(user.ID, orgID, reportID)
	if err != nil {
		if errors.Is(err, errEreportNotFound) {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"orgId":    orgID,
		"reportId": reportID,
		"identity": id,
	})
}

func (a *App) ereportV1ExecutionToAppendItemsHandler(w http.ResponseWriter, r *http.Request) {
	user, orgID, reportID, ok := a.requireOwnedReport(w, r)
	if !ok {
		return
	}
	executionID := r.PathValue("executionId")
	run, err := a.ereport.getExecutionRun(user.ID, orgID, reportID, executionID)
	if err != nil {
		if errors.Is(err, errEreportNotFound) {
			a.writeSafeError(w, r, http.StatusNotFound, "not_found")
			return
		}
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	items := mapFailStepsToEreportItems(run)
	writeJSON(w, http.StatusOK, map[string]any{
		"orgId":         orgID,
		"reportId":      reportID,
		"execution_id":  run.ExecutionID,
		"item_count":    len(items),
		"suggestedAppend": map[string]any{
			"confirmOverwrite": true,
			"mode":             "append",
			"tema":             nil,
			"payload": map[string]any{
				"lastExecutionId": run.ExecutionID,
				"stream":          run.Identity.Stream,
				"commit":          run.Identity.Commit,
				"sections": []any{
					map[string]any{
						"id":    "execution-findings",
						"title": "Execution findings",
						"kind":  "funcionalidades",
						"groups": []any{
							map[string]any{
								"id":    "execution-findings-g",
								"title": "From " + run.ExecutionID,
								"items": toAnySliceMaps(items),
							},
						},
					},
				},
			},
		},
		"hint": "POST this suggestedAppend body to the report URL (mode append). Does not auto-close issues.",
	})
}

func toAnySliceMaps(rows []map[string]any) []any {
	out := make([]any, len(rows))
	for i := range rows {
		out[i] = rows[i]
	}
	return out
}
