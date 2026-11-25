package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"sort"
	"strings"
	"time"
)

// ereportReportAccess is who may open a report. Branch files stay in the owner's tree.
type ereportReportAccess struct {
	OwnerUserID string
	Meta        ereportMeta
	Payload     map[string]any
	CanEditMain bool
	IsOwner     bool
}

func (a *App) lookupEreportReportAccess(user *User, orgID, reportID string) (ereportReportAccess, bool) {
	if user == nil {
		return ereportReportAccess{}, false
	}
	meta, payload, err := a.ereport.loadReport(user.ID, orgID, reportID)
	if err == nil {
		return ereportReportAccess{
			OwnerUserID: user.ID,
			Meta:        meta,
			Payload:     payload,
			CanEditMain: true,
			IsOwner:     true,
		}, true
	}
	share, meta, payload, ok := a.findShareForMember(user.ID, orgID, reportID)
	if !ok {
		return ereportReportAccess{}, false
	}
	return ereportReportAccess{
		OwnerUserID: share.OwnerUserID,
		Meta:        meta,
		Payload:     payload,
		CanEditMain: share.CanEdit,
		IsOwner:     false,
	}, true
}

func (a *App) ereportBranchAccess(w http.ResponseWriter, r *http.Request, write bool) (*User, ereportReportAccess, bool) {
	if write && !a.requireUnsafe(w, r) {
		return nil, ereportReportAccess{}, false
	}
	user := a.requireEreportUser(w, r)
	if user == nil {
		return nil, ereportReportAccess{}, false
	}
	access, ok := a.lookupEreportReportAccess(user, r.PathValue("orgId"), r.PathValue("reportId"))
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return nil, ereportReportAccess{}, false
	}
	if !access.IsOwner && !a.requireEreportEntitled(w, r, user) {
		return nil, ereportReportAccess{}, false
	}
	return user, access, true
}

func (a *App) ereportListBranchesHandler(w http.ResponseWriter, r *http.Request) {
	user, access, ok := a.ereportBranchAccess(w, r, false)
	if !ok {
		return
	}
	metas, err := a.ereport.listBranchMetas(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	sort.Slice(metas, func(i, j int) bool {
		if metas[i].CreatedAt == metas[j].CreatedAt {
			return metas[i].CreatorUserID < metas[j].CreatorUserID
		}
		return metas[i].CreatedAt < metas[j].CreatedAt
	})
	items := make([]map[string]any, 0, len(metas))
	for _, meta := range metas {
		sessions, _ := a.ereport.loadBranchSessions(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, meta.CreatorUserID)
		items = append(items, branchCard(meta, sessions, user.ID))
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (a *App) ereportCreateBranchHandler(w http.ResponseWriter, r *http.Request) {
	user, access, ok := a.ereportBranchAccess(w, r, true)
	if !ok {
		return
	}
	if !validEreportID(user.ID) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	meta, err := a.ereport.loadBranchMeta(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, user.ID)
	created := false
	if errors.Is(err, errEreportNotFound) {
		now := nowRFC3339()
		meta = ereportBranchMeta{
			CreatorUserID:       user.ID,
			CreatorLabel:        user.Email,
			CreatedAt:           now,
			UpdatedAt:           now,
			ForkedFromUpdatedAt: access.Meta.UpdatedAt,
		}
		payload := deepCloneMap(access.Payload)
		if err := a.ereport.saveBranchPayload(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, user.ID, payload); err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		if err := a.ereport.saveBranchSessions(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, user.ID, ereportBranchSessionFile{}); err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		if err := a.ereport.saveBranchMeta(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, meta); err != nil {
			a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
			return
		}
		created = true
		a.auditEvent(r, "ereport_branch_create", "ok", user.ID)
	} else if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.writeBranchView(w, r, user, access, meta, created)
}

func (a *App) ereportGetBranchHandler(w http.ResponseWriter, r *http.Request) {
	user, access, ok := a.ereportBranchAccess(w, r, false)
	if !ok {
		return
	}
	creatorID := strings.TrimSpace(r.PathValue("userId"))
	if !validEreportID(creatorID) {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	meta, err := a.ereport.loadBranchMeta(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, creatorID)
	if errors.Is(err, errEreportNotFound) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.writeBranchView(w, r, user, access, meta, false)
}

func (a *App) ereportPutBranchHandler(w http.ResponseWriter, r *http.Request) {
	user, access, ok := a.ereportBranchAccess(w, r, true)
	if !ok {
		return
	}
	creatorID := strings.TrimSpace(r.PathValue("userId"))
	if !validEreportID(creatorID) || creatorID != user.ID {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	meta, err := a.ereport.loadBranchMeta(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, creatorID)
	if errors.Is(err, errEreportNotFound) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	var body struct {
		Payload map[string]any `json:"payload"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	if body.Payload == nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	stored, err := a.ereport.loadBranchPayload(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, creatorID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	incoming := canonicalizeEreportPayload(body.Payload, access.Meta.OrgID, access.Meta.ID)
	deleted, metaChanged := stampBranchPayload(stored, incoming, meta.ActiveSessionID, nowRFC3339())
	if err := a.ereport.saveBranchPayload(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, creatorID, incoming); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if meta.ActiveSessionID != "" && (len(deleted) > 0 || metaChanged) {
		sessions, loadErr := a.ereport.loadBranchSessions(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, creatorID)
		if loadErr == nil {
			touchActiveBranchSession(&sessions, meta.ActiveSessionID, deleted, metaChanged)
			_ = a.ereport.saveBranchSessions(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, creatorID, sessions)
		}
	}
	meta.UpdatedAt = nowRFC3339()
	if err := a.ereport.saveBranchMeta(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, meta); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "ereport_branch_save", "ok", user.ID)
	a.writeBranchView(w, r, user, access, meta, false)
}

func (a *App) ereportStartBranchSessionHandler(w http.ResponseWriter, r *http.Request) {
	user, access, ok := a.ereportBranchAccess(w, r, true)
	if !ok {
		return
	}
	creatorID := strings.TrimSpace(r.PathValue("userId"))
	if !validEreportID(creatorID) || creatorID != user.ID {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	meta, err := a.ereport.loadBranchMeta(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, creatorID)
	if errors.Is(err, errEreportNotFound) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if strings.TrimSpace(meta.ActiveSessionID) != "" {
		a.writeSafeError(w, r, http.StatusConflict, "branch_session_active")
		return
	}
	sessions, err := a.ereport.loadBranchSessions(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, creatorID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	now := nowRFC3339()
	sess := ereportBranchSession{ID: randomID(16), StartedAt: now}
	sessions.Sessions = append(sessions.Sessions, sess)
	meta.ActiveSessionID = sess.ID
	meta.UpdatedAt = now
	if err := a.ereport.saveBranchSessions(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, creatorID, sessions); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if err := a.ereport.saveBranchMeta(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, meta); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "ereport_branch_session_start", "ok", user.ID)
	a.writeBranchView(w, r, user, access, meta, false)
}

func (a *App) ereportStopBranchSessionHandler(w http.ResponseWriter, r *http.Request) {
	user, access, ok := a.ereportBranchAccess(w, r, true)
	if !ok {
		return
	}
	creatorID := strings.TrimSpace(r.PathValue("userId"))
	sessionID := strings.TrimSpace(r.PathValue("sessionId"))
	if !validEreportID(creatorID) || creatorID != user.ID || !validEreportID(sessionID) {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	meta, err := a.ereport.loadBranchMeta(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, creatorID)
	if errors.Is(err, errEreportNotFound) {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if meta.ActiveSessionID != sessionID {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	sessions, err := a.ereport.loadBranchSessions(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, creatorID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	now := nowRFC3339()
	found := false
	for i := range sessions.Sessions {
		if sessions.Sessions[i].ID != sessionID {
			continue
		}
		sessions.Sessions[i].EndedAt = now
		sessions.Sessions[i].DurationMs = branchSessionDurationMs(sessions.Sessions[i].StartedAt, now)
		found = true
		break
	}
	if !found {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	meta.ActiveSessionID = ""
	meta.UpdatedAt = now
	if err := a.ereport.saveBranchSessions(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, creatorID, sessions); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if err := a.ereport.saveBranchMeta(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, meta); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.auditEvent(r, "ereport_branch_session_stop", "ok", user.ID)
	a.writeBranchView(w, r, user, access, meta, false)
}

func (a *App) writeBranchView(w http.ResponseWriter, r *http.Request, user *User, access ereportReportAccess, meta ereportBranchMeta, created bool) {
	payload, err := a.ereport.loadBranchPayload(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, meta.CreatorUserID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	sessions, err := a.ereport.loadBranchSessions(access.OwnerUserID, access.Meta.OrgID, access.Meta.ID, meta.CreatorUserID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	if !access.IsOwner {
		if rewritten, ok := rewriteSharedImageURLs(payload, access.Meta.OrgID, access.Meta.ID).(map[string]any); ok && rewritten != nil {
			payload = rewritten
		}
	}
	status := http.StatusOK
	if created {
		status = http.StatusCreated
	}
	writeJSON(w, status, map[string]any{
		"branch":   branchCard(meta, sessions, user.ID),
		"payload":  payload,
		"sessions": sessions.Sessions,
		"canEdit":  user.ID == meta.CreatorUserID,
		"created":  created,
	})
}

func branchCard(meta ereportBranchMeta, sessions ereportBranchSessionFile, callerID string) map[string]any {
	card := map[string]any{
		"creatorUserId":       meta.CreatorUserID,
		"creatorLabel":        meta.CreatorLabel,
		"createdAt":           meta.CreatedAt,
		"updatedAt":           meta.UpdatedAt,
		"forkedFromUpdatedAt": meta.ForkedFromUpdatedAt,
		"canEdit":             callerID == meta.CreatorUserID,
	}
	if meta.ActiveSessionID != "" {
		card["activeSessionId"] = meta.ActiveSessionID
		for _, sess := range sessions.Sessions {
			if sess.ID == meta.ActiveSessionID {
				card["activeSessionStartedAt"] = sess.StartedAt
				break
			}
		}
	}
	return card
}

func branchSessionDurationMs(startedAt, endedAt string) int64 {
	start, errStart := time.Parse(time.RFC3339, startedAt)
	end, errEnd := time.Parse(time.RFC3339, endedAt)
	if errStart != nil || errEnd != nil {
		return 0
	}
	dur := end.Sub(start)
	if dur < 0 {
		return 0
	}
	return dur.Milliseconds()
}

func touchActiveBranchSession(file *ereportBranchSessionFile, sessionID string, deleted []string, metaChanged bool) {
	if file == nil || sessionID == "" {
		return
	}
	for i := range file.Sessions {
		if file.Sessions[i].ID != sessionID {
			continue
		}
		file.Sessions[i].DeletedIDs = appendUniqueStrings(file.Sessions[i].DeletedIDs, deleted)
		if metaChanged {
			file.Sessions[i].MetaChanged = true
		}
		return
	}
}

func appendUniqueStrings(dst, extra []string) []string {
	seen := map[string]bool{}
	for _, item := range dst {
		seen[item] = true
	}
	for _, item := range extra {
		if item == "" || seen[item] {
			continue
		}
		seen[item] = true
		dst = append(dst, item)
	}
	return dst
}

type branchNodeSnap struct {
	fp    string
	marks []any
}

func stampBranchPayload(prev, next map[string]any, sessionID, at string) (deleted []string, metaChanged bool) {
	if next == nil {
		return nil, false
	}
	if prev == nil {
		prev = map[string]any{}
	}
	if sessionID != "" && branchMetaFingerprint(prev) != branchMetaFingerprint(next) {
		metaChanged = true
	}
	prevSecs, prevGroups, prevItems := snapshotBranchNodes(prev)
	seenSec := map[string]bool{}
	seenGrp := map[string]bool{}
	seenItem := map[string]bool{}
	for _, sec := range asMapSlice(next["sections"]) {
		if id := branchNodeID(sec); id != "" {
			seenSec[id] = true
			applyBranchMarks(sec, prevSecs, branchNodeFingerprint(sec, "groups", "items"), sessionID, at)
		}
		for _, it := range asMapSlice(sec["items"]) {
			if id := branchNodeID(it); id != "" {
				seenItem[id] = true
				applyBranchMarks(it, prevItems, branchNodeFingerprint(it), sessionID, at)
			}
		}
		for _, grp := range asMapSlice(sec["groups"]) {
			if id := branchNodeID(grp); id != "" {
				seenGrp[id] = true
				applyBranchMarks(grp, prevGroups, branchNodeFingerprint(grp, "items"), sessionID, at)
			}
			for _, it := range asMapSlice(grp["items"]) {
				if id := branchNodeID(it); id != "" {
					seenItem[id] = true
					applyBranchMarks(it, prevItems, branchNodeFingerprint(it), sessionID, at)
				}
			}
		}
	}
	if sessionID == "" {
		return nil, false
	}
	deleted = append(deleted, missingBranchIDs(prevSecs, seenSec)...)
	deleted = append(deleted, missingBranchIDs(prevGroups, seenGrp)...)
	deleted = append(deleted, missingBranchIDs(prevItems, seenItem)...)
	return deleted, metaChanged
}

func snapshotBranchNodes(payload map[string]any) (secs, groups, items map[string]branchNodeSnap) {
	secs = map[string]branchNodeSnap{}
	groups = map[string]branchNodeSnap{}
	items = map[string]branchNodeSnap{}
	for _, sec := range asMapSlice(payload["sections"]) {
		if id := branchNodeID(sec); id != "" {
			secs[id] = branchNodeSnap{fp: branchNodeFingerprint(sec, "groups", "items"), marks: copySessionMarks(sec["sessionMarks"])}
		}
		for _, it := range asMapSlice(sec["items"]) {
			if id := branchNodeID(it); id != "" {
				items[id] = branchNodeSnap{fp: branchNodeFingerprint(it), marks: copySessionMarks(it["sessionMarks"])}
			}
		}
		for _, grp := range asMapSlice(sec["groups"]) {
			if id := branchNodeID(grp); id != "" {
				groups[id] = branchNodeSnap{fp: branchNodeFingerprint(grp, "items"), marks: copySessionMarks(grp["sessionMarks"])}
			}
			for _, it := range asMapSlice(grp["items"]) {
				if id := branchNodeID(it); id != "" {
					items[id] = branchNodeSnap{fp: branchNodeFingerprint(it), marks: copySessionMarks(it["sessionMarks"])}
				}
			}
		}
	}
	return secs, groups, items
}

func applyBranchMarks(node map[string]any, prev map[string]branchNodeSnap, fp, sessionID, at string) {
	id := branchNodeID(node)
	snap, ok := prev[id]
	marks := []any{}
	if ok {
		marks = copySessionMarks(snap.marks)
	}
	if (!ok || fp != snap.fp) && sessionID != "" {
		marks = appendSessionMark(marks, sessionID, at)
	}
	if len(marks) == 0 {
		delete(node, "sessionMarks")
	} else {
		node["sessionMarks"] = marks
	}
}

func branchNodeID(node map[string]any) string {
	if node == nil {
		return ""
	}
	return strings.TrimSpace(asString(node["id"]))
}

func branchNodeFingerprint(node map[string]any, childKeys ...string) string {
	drop := map[string]bool{"sessionMarks": true}
	for _, key := range childKeys {
		drop[key] = true
	}
	cp := make(map[string]any, len(node)+1)
	for key, val := range node {
		if drop[key] {
			continue
		}
		cp[key] = val
	}
	if len(childKeys) > 0 {
		order := make(map[string]any, len(childKeys))
		for _, key := range childKeys {
			order[key] = orderedChildIDs(node, key)
		}
		cp["__children"] = order
	}
	raw, _ := json.Marshal(cp)
	return string(raw)
}

func orderedChildIDs(node map[string]any, key string) []string {
	children := asMapSlice(node[key])
	out := make([]string, 0, len(children))
	for _, child := range children {
		out = append(out, branchNodeID(child))
	}
	return out
}

func branchMetaFingerprint(payload map[string]any) string {
	pick := map[string]any{}
	for _, key := range []string{"reportName", "orgName", "reportDate", "reportNumber", "appTitle", "validationCriteria"} {
		if val, ok := payload[key]; ok {
			pick[key] = val
		}
	}
	raw, _ := json.Marshal(pick)
	return string(raw)
}

func copySessionMarks(v any) []any {
	arr, ok := v.([]any)
	if !ok || len(arr) == 0 {
		return nil
	}
	out := make([]any, 0, len(arr))
	for _, raw := range arr {
		mark, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		sessionID := strings.TrimSpace(asString(mark["sessionId"]))
		if sessionID == "" {
			continue
		}
		out = append(out, map[string]any{"sessionId": sessionID, "at": asString(mark["at"])})
	}
	return out
}

func appendSessionMark(marks []any, sessionID, at string) []any {
	for _, raw := range marks {
		mark, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		if asString(mark["sessionId"]) == sessionID {
			return marks
		}
	}
	return append(marks, map[string]any{"sessionId": sessionID, "at": at})
}

func missingBranchIDs(prev map[string]branchNodeSnap, seen map[string]bool) []string {
	out := make([]string, 0)
	for id := range prev {
		if !seen[id] {
			out = append(out, id)
		}
	}
	sort.Strings(out)
	return out
}
