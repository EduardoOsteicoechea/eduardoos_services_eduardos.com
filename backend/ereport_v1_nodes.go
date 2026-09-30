package main

import (
	"encoding/json"
	"net/http"
	"strings"
)

const (
	ereportNodeStatusAprobado  = "aprobado"
	ereportNodeStatusReprobado = "reprobado"
	ereportNodeStatusNA        = "no_aplica"
)

// Additive granular v1 mutations for the web connector embed.
// Does not use or alter mergeAppend / replace semantics.

func (a *App) ereportV1PostSectionHandler(w http.ResponseWriter, r *http.Request) {
	a.ereportV1MutateReport(w, r, func(payload map[string]any, body map[string]any) (any, error) {
		title := strings.TrimSpace(asString(body["title"]))
		if title == "" {
			return nil, apiWriteErr("invalid_request", "title required")
		}
		kind := strings.TrimSpace(asString(body["kind"]))
		if kind == "" {
			kind = "funcionalidades"
		}
		if kind != "funcionalidades" && kind != "subarticulos" {
			return nil, apiWriteErr("invalid_request", "kind must be funcionalidades or subarticulos")
		}
		id := strings.TrimSpace(asString(body["id"]))
		if id == "" {
			id = "section-" + randomID(10)
		}
		secs := asMapSlice(payload["sections"])
		for _, s := range secs {
			if strings.TrimSpace(asString(s["id"])) == id {
				return nil, apiWriteErr("conflict", "section id already exists")
			}
		}
		sec := map[string]any{
			"id":             id,
			"title":          title,
			"kind":           kind,
			"productHistory": asString(body["productHistory"]),
			"groups":         []any{},
			"items":          []any{},
		}
		secs = append(secs, sec)
		payload["sections"] = mapSliceToAny(secs)
		return sec, nil
	})
}

func (a *App) ereportV1PatchSectionHandler(w http.ResponseWriter, r *http.Request) {
	sectionID := r.PathValue("sectionId")
	a.ereportV1MutateReport(w, r, func(payload map[string]any, body map[string]any) (any, error) {
		sec, idx, err := findSection(payload, sectionID)
		if err != nil {
			return nil, err
		}
		if v, ok := body["title"]; ok {
			title := strings.TrimSpace(asString(v))
			if title == "" {
				return nil, apiWriteErr("invalid_request", "title cannot be empty")
			}
			sec["title"] = title
		}
		if v, ok := body["productHistory"]; ok {
			sec["productHistory"] = asString(v)
		}
		if v, ok := body["kind"]; ok {
			kind := strings.TrimSpace(asString(v))
			if kind != "funcionalidades" && kind != "subarticulos" {
				return nil, apiWriteErr("invalid_request", "kind must be funcionalidades or subarticulos")
			}
			sec["kind"] = kind
		}
		secs := asMapSlice(payload["sections"])
		secs[idx] = sec
		payload["sections"] = mapSliceToAny(secs)
		return sec, nil
	})
}

func (a *App) ereportV1PostGroupHandler(w http.ResponseWriter, r *http.Request) {
	sectionID := r.PathValue("sectionId")
	a.ereportV1MutateReport(w, r, func(payload map[string]any, body map[string]any) (any, error) {
		sec, secIdx, err := findSection(payload, sectionID)
		if err != nil {
			return nil, err
		}
		title := strings.TrimSpace(asString(body["title"]))
		if title == "" {
			return nil, apiWriteErr("invalid_request", "title required")
		}
		id := strings.TrimSpace(asString(body["id"]))
		if id == "" {
			id = "group-" + randomID(10)
		}
		groups := asMapSlice(sec["groups"])
		for _, g := range groups {
			if strings.TrimSpace(asString(g["id"])) == id {
				return nil, apiWriteErr("conflict", "group id already exists")
			}
		}
		grp := map[string]any{
			"id":             id,
			"title":          title,
			"productHistory": asString(body["productHistory"]),
			"items":          []any{},
		}
		groups = append(groups, grp)
		sec["groups"] = mapSliceToAny(groups)
		secs := asMapSlice(payload["sections"])
		secs[secIdx] = sec
		payload["sections"] = mapSliceToAny(secs)
		return grp, nil
	})
}

func (a *App) ereportV1PatchGroupHandler(w http.ResponseWriter, r *http.Request) {
	sectionID := r.PathValue("sectionId")
	groupID := r.PathValue("groupId")
	a.ereportV1MutateReport(w, r, func(payload map[string]any, body map[string]any) (any, error) {
		sec, secIdx, err := findSection(payload, sectionID)
		if err != nil {
			return nil, err
		}
		grp, grpIdx, err := findGroup(sec, groupID)
		if err != nil {
			return nil, err
		}
		if v, ok := body["title"]; ok {
			title := strings.TrimSpace(asString(v))
			if title == "" {
				return nil, apiWriteErr("invalid_request", "title cannot be empty")
			}
			grp["title"] = title
		}
		if v, ok := body["productHistory"]; ok {
			grp["productHistory"] = asString(v)
		}
		groups := asMapSlice(sec["groups"])
		groups[grpIdx] = grp
		sec["groups"] = mapSliceToAny(groups)
		secs := asMapSlice(payload["sections"])
		secs[secIdx] = sec
		payload["sections"] = mapSliceToAny(secs)
		return grp, nil
	})
}

func (a *App) ereportV1PostItemHandler(w http.ResponseWriter, r *http.Request) {
	sectionID := r.PathValue("sectionId")
	groupID := r.PathValue("groupId")
	a.ereportV1MutateReport(w, r, func(payload map[string]any, body map[string]any) (any, error) {
		sec, secIdx, err := findSection(payload, sectionID)
		if err != nil {
			return nil, err
		}
		grp, grpIdx, err := findGroup(sec, groupID)
		if err != nil {
			return nil, err
		}
		id := strings.TrimSpace(asString(body["id"]))
		if id == "" {
			id = "item-" + randomID(10)
		}
		items := asMapSlice(grp["items"])
		for _, it := range items {
			if strings.TrimSpace(asString(it["id"])) == id {
				return nil, apiWriteErr("conflict", "item id already exists")
			}
		}
		item := emptyEreportItem(id)
		if v, ok := body["nombre"]; ok {
			item["nombre"] = asString(v)
		}
		if v, ok := body["incidencia"]; ok {
			item["incidencia"] = asString(v)
		}
		if v, ok := body["fechaIncidencia"]; ok {
			item["fechaIncidencia"] = asString(v)
		}
		if v, ok := body["solucion"]; ok {
			item["solucion"] = asString(v)
		}
		if v, ok := body["fechaSolucion"]; ok {
			item["fechaSolucion"] = asString(v)
		}
		item["status"] = ereportNodeStatusReprobado
		if v, ok := body["status"]; ok {
			st := asString(v)
			if st != "" && st != ereportNodeStatusReprobado {
				return nil, apiWriteErr("append_invalid_new_item_status", "new issues must have status reprobado")
			}
			item["status"] = ereportNodeStatusReprobado
		}
		if v, ok := body["checklist"]; ok {
			item["checklist"] = v
		}
		if err := validateNewAPIItem(item); err != nil {
			return nil, err
		}
		items = append(items, item)
		grp["items"] = mapSliceToAny(items)
		groups := asMapSlice(sec["groups"])
		groups[grpIdx] = grp
		sec["groups"] = mapSliceToAny(groups)
		secs := asMapSlice(payload["sections"])
		secs[secIdx] = sec
		payload["sections"] = mapSliceToAny(secs)
		return item, nil
	})
}

func (a *App) ereportV1PatchItemHandler(w http.ResponseWriter, r *http.Request) {
	sectionID := r.PathValue("sectionId")
	groupID := r.PathValue("groupId")
	itemID := r.PathValue("itemId")
	a.ereportV1MutateReport(w, r, func(payload map[string]any, body map[string]any) (any, error) {
		sec, secIdx, err := findSection(payload, sectionID)
		if err != nil {
			return nil, err
		}
		grp, grpIdx, err := findGroup(sec, groupID)
		if err != nil {
			return nil, err
		}
		item, itemIdx, err := findItem(grp, itemID)
		if err != nil {
			return nil, err
		}
		if v, ok := body["nombre"]; ok {
			item["nombre"] = asString(v)
		}
		if v, ok := body["incidencia"]; ok {
			item["incidencia"] = asString(v)
		}
		if v, ok := body["fechaIncidencia"]; ok {
			item["fechaIncidencia"] = asString(v)
		}
		if v, ok := body["solucion"]; ok {
			item["solucion"] = asString(v)
		}
		if v, ok := body["fechaSolucion"]; ok {
			item["fechaSolucion"] = asString(v)
		}
		if v, ok := body["status"]; ok {
			st := asString(v)
			if !validEreportItemStatus(st) {
				return nil, apiWriteErr("invalid_request", "status must be aprobado|reprobado|no_aplica|empty")
			}
			item["status"] = st
		}
		if v, ok := body["checklist"]; ok {
			item["checklist"] = v
		}
		items := asMapSlice(grp["items"])
		items[itemIdx] = item
		grp["items"] = mapSliceToAny(items)
		groups := asMapSlice(sec["groups"])
		groups[grpIdx] = grp
		sec["groups"] = mapSliceToAny(groups)
		secs := asMapSlice(payload["sections"])
		secs[secIdx] = sec
		payload["sections"] = mapSliceToAny(secs)
		return item, nil
	})
}

type ereportNodeMutator func(payload map[string]any, body map[string]any) (node any, err error)

func (a *App) ereportV1MutateReport(w http.ResponseWriter, r *http.Request, mutate ereportNodeMutator) {
	user := apiUserFrom(r)
	orgID := r.PathValue("orgId")
	reportID := r.PathValue("reportId")
	meta, payload, err := a.ereport.loadReport(user.ID, orgID, reportID)
	if err != nil {
		a.writeEreportNotFound(w, r, orgID, reportID, ereportMissingReason(err))
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, a.cfg.EreportMaxPayloadBytes)
	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if body == nil {
		body = map[string]any{}
	}
	working := deepCloneMap(payload)
	node, mutErr := mutate(working, body)
	if mutErr != nil {
		apiErr := asAPIWriteErr(mutErr)
		status := http.StatusBadRequest
		switch apiErr.Code {
		case "not_found":
			status = http.StatusNotFound
		case "conflict":
			status = http.StatusConflict
		}
		out := map[string]any{
			"error":      apiErr.Code,
			"message":    safeErrorMessage(apiErr.Code),
			"request_id": requestIDFrom(r, w),
		}
		if apiErr.Detail != "" {
			out["hint"] = apiErr.Detail
		}
		// conflict may not have a safe message mapping — keep generic message
		if apiErr.Code == "conflict" {
			out["message"] = "That resource already exists."
		}
		if apiErr.Code == "not_found" {
			out["message"] = safeErrorMessage("not_found")
		}
		writeJSON(w, status, out)
		return
	}
	var snapshotID string
	if payload != nil {
		sid, snapErr := a.ereport.saveSnapshot(user.ID, orgID, reportID, meta.Tema, "api-node", apiKeyPrefixFrom(r), payload)
		if snapErr != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		snapshotID = sid
	}
	now := nowRFC3339()
	meta.UpdatedAt = now
	meta = displayMeta(user, meta)
	if err := a.ereport.saveReport(user.ID, meta, working); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.touchLibrary(user.ID, meta)
	ownerSafe := displayOwnerSafe(user.Email)
	status := http.StatusOK
	if r.Method == http.MethodPost {
		status = http.StatusCreated
	}
	out := map[string]any{
		"orgId":       orgID,
		"reportId":    reportID,
		"ownerUserId": user.ID,
		"ownerSafe":   ownerSafe,
		"viewUrl":     a.ereportViewURL(r, ownerSafe, orgID, reportID),
		"meta":        meta,
		"node":        node,
		"payload":     working,
	}
	if snapshotID != "" {
		out["snapshotId"] = snapshotID
	}
	writeJSON(w, status, out)
}

func findSection(payload map[string]any, sectionID string) (map[string]any, int, error) {
	id := strings.TrimSpace(sectionID)
	if id == "" {
		return nil, -1, apiWriteErr("not_found", "section missing")
	}
	secs := asMapSlice(payload["sections"])
	for i, s := range secs {
		if strings.TrimSpace(asString(s["id"])) == id {
			return deepCloneMap(s), i, nil
		}
	}
	return nil, -1, apiWriteErr("not_found", "section not found")
}

func findGroup(sec map[string]any, groupID string) (map[string]any, int, error) {
	id := strings.TrimSpace(groupID)
	if id == "" {
		return nil, -1, apiWriteErr("not_found", "group missing")
	}
	groups := asMapSlice(sec["groups"])
	for i, g := range groups {
		if strings.TrimSpace(asString(g["id"])) == id {
			return deepCloneMap(g), i, nil
		}
	}
	return nil, -1, apiWriteErr("not_found", "group not found")
}

func findItem(grp map[string]any, itemID string) (map[string]any, int, error) {
	id := strings.TrimSpace(itemID)
	if id == "" {
		return nil, -1, apiWriteErr("not_found", "item missing")
	}
	items := asMapSlice(grp["items"])
	for i, it := range items {
		if strings.TrimSpace(asString(it["id"])) == id {
			return deepCloneMap(it), i, nil
		}
	}
	return nil, -1, apiWriteErr("not_found", "item not found")
}

func mapSliceToAny(in []map[string]any) []any {
	out := make([]any, 0, len(in))
	for _, m := range in {
		out = append(out, m)
	}
	return out
}

func validEreportItemStatus(st string) bool {
	switch st {
	case "", ereportNodeStatusAprobado, ereportNodeStatusReprobado, ereportNodeStatusNA:
		return true
	default:
		return false
	}
}
