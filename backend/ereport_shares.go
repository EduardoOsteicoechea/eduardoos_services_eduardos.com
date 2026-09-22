package main

import (
	"context"
	"errors"
	"net/http"
	"strings"
)

const ereportSharedIndexDir = ".shared"

type ereportShareRecord struct {
	ID           string `json:"id"`
	OwnerUserID  string `json:"ownerUserId"`
	OrgID        string `json:"orgId"`
	ReportID     string `json:"reportId"`
	MemberUserID string `json:"memberUserId"`
	MemberEmail  string `json:"memberEmail"`
	CanEdit      bool   `json:"canEdit"`
	InviteID     string `json:"inviteId,omitempty"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

type ereportSharesFile struct {
	Shares []ereportShareRecord `json:"shares"`
}

type ereportSharedIndex struct {
	Items []ereportSharedCard `json:"items"`
}

type ereportSharedCard struct {
	ShareID      string `json:"shareId"`
	OwnerUserID  string `json:"ownerUserId"`
	OwnerSafe    string `json:"ownerSafe,omitempty"`
	OwnerEmail   string `json:"ownerEmail,omitempty"`
	OrgID        string `json:"orgId"`
	ReportID     string `json:"reportId"`
	Tema         string `json:"tema"`
	ReportNumber string `json:"reportNumber,omitempty"`
	CanEdit      bool   `json:"canEdit"`
	UpdatedAt    string `json:"updatedAt"`
	ViewURL      string `json:"viewUrl,omitempty"`
}

func (fs *ereportFS) reportSharesPath(ownerUserID, orgID, reportID string) (string, error) {
	if !validEreportID(orgID) || !validEreportID(reportID) {
		return "", errEreportPath
	}
	return fs.resolveOwner(ownerUserID, "orgs", orgID, "reports", reportID, "shares.json")
}

func (fs *ereportFS) sharedIndexPath(memberUserID string) (string, error) {
	if !validEreportID(memberUserID) {
		return "", errEreportPath
	}
	return fs.resolve(ereportSharedIndexDir, memberUserID+".json")
}

func (fs *ereportFS) loadReportShares(ownerUserID, orgID, reportID string) (ereportSharesFile, error) {
	var file ereportSharesFile
	path, err := fs.reportSharesPath(ownerUserID, orgID, reportID)
	if err != nil {
		return file, err
	}
	if err := fs.readJSON(path, &file); err != nil {
		if errors.Is(err, errEreportNotFound) {
			file.Shares = []ereportShareRecord{}
			return file, nil
		}
		return file, err
	}
	if file.Shares == nil {
		file.Shares = []ereportShareRecord{}
	}
	return file, nil
}

func (fs *ereportFS) saveReportShares(ownerUserID, orgID, reportID string, file ereportSharesFile) error {
	path, err := fs.reportSharesPath(ownerUserID, orgID, reportID)
	if err != nil {
		return err
	}
	if file.Shares == nil {
		file.Shares = []ereportShareRecord{}
	}
	return fs.writeJSON(path, file)
}

func (fs *ereportFS) loadSharedIndex(memberUserID string) (ereportSharedIndex, error) {
	var idx ereportSharedIndex
	path, err := fs.sharedIndexPath(memberUserID)
	if err != nil {
		return idx, err
	}
	if err := fs.readJSON(path, &idx); err != nil {
		if errors.Is(err, errEreportNotFound) {
			idx.Items = []ereportSharedCard{}
			return idx, nil
		}
		return idx, err
	}
	if idx.Items == nil {
		idx.Items = []ereportSharedCard{}
	}
	return idx, nil
}

func (fs *ereportFS) saveSharedIndex(memberUserID string, idx ereportSharedIndex) error {
	path, err := fs.sharedIndexPath(memberUserID)
	if err != nil {
		return err
	}
	if idx.Items == nil {
		idx.Items = []ereportSharedCard{}
	}
	return fs.writeJSON(path, idx)
}

func (a *App) upsertAccountShare(owner *User, orgID, reportID, inviteID string, memberEmail string, canEdit bool, meta ereportMeta) {
	_, emailNorm, ok := normalizeEmail(memberEmail)
	if !ok {
		return
	}
	member, err := a.store.UserByEmail(context.Background(), emailNorm)
	if err != nil || member == nil || member.ID == owner.ID {
		return
	}
	now := nowRFC3339()
	file, err := a.ereport.loadReportShares(owner.ID, orgID, reportID)
	if err != nil {
		return
	}
	shareID := ""
	for i := range file.Shares {
		if file.Shares[i].MemberUserID == member.ID {
			file.Shares[i].CanEdit = canEdit
			file.Shares[i].InviteID = inviteID
			file.Shares[i].MemberEmail = emailNorm
			file.Shares[i].UpdatedAt = now
			shareID = file.Shares[i].ID
			break
		}
	}
	if shareID == "" {
		shareID = randomID(16)
		file.Shares = append(file.Shares, ereportShareRecord{
			ID:           shareID,
			OwnerUserID:  owner.ID,
			OrgID:        orgID,
			ReportID:     reportID,
			MemberUserID: member.ID,
			MemberEmail:  emailNorm,
			CanEdit:      canEdit,
			InviteID:     inviteID,
			CreatedAt:    now,
			UpdatedAt:    now,
		})
	}
	_ = a.ereport.saveReportShares(owner.ID, orgID, reportID, file)

	card := ereportSharedCard{
		ShareID:      shareID,
		OwnerUserID:  owner.ID,
		OwnerSafe:    displayOwnerSafe(owner.Email),
		OwnerEmail:   owner.Email,
		OrgID:        orgID,
		ReportID:     reportID,
		Tema:         meta.Tema,
		ReportNumber: meta.ReportNumber,
		CanEdit:      canEdit,
		UpdatedAt:    meta.UpdatedAt,
	}
	if card.UpdatedAt == "" {
		card.UpdatedAt = now
	}
	idx, _ := a.ereport.loadSharedIndex(member.ID)
	kept := make([]ereportSharedCard, 0, len(idx.Items)+1)
	for _, item := range idx.Items {
		if item.OwnerUserID == owner.ID && item.OrgID == orgID && item.ReportID == reportID {
			continue
		}
		kept = append(kept, item)
	}
	kept = append([]ereportSharedCard{card}, kept...)
	idx.Items = kept
	_ = a.ereport.saveSharedIndex(member.ID, idx)
}

func (a *App) findShareForMember(memberUserID, orgID, reportID string) (ereportShareRecord, ereportMeta, map[string]any, bool) {
	idx, err := a.ereport.loadSharedIndex(memberUserID)
	if err != nil {
		return ereportShareRecord{}, ereportMeta{}, nil, false
	}
	var card *ereportSharedCard
	for i := range idx.Items {
		if idx.Items[i].OrgID == orgID && idx.Items[i].ReportID == reportID {
			card = &idx.Items[i]
			break
		}
	}
	if card == nil {
		return ereportShareRecord{}, ereportMeta{}, nil, false
	}
	file, err := a.ereport.loadReportShares(card.OwnerUserID, orgID, reportID)
	if err != nil {
		return ereportShareRecord{}, ereportMeta{}, nil, false
	}
	var share ereportShareRecord
	found := false
	for _, s := range file.Shares {
		if s.MemberUserID == memberUserID && s.OrgID == orgID && s.ReportID == reportID {
			share = s
			found = true
			break
		}
	}
	if !found {
		return ereportShareRecord{}, ereportMeta{}, nil, false
	}
	meta, payload, err := a.ereport.loadReport(share.OwnerUserID, orgID, reportID)
	if err != nil {
		return ereportShareRecord{}, ereportMeta{}, nil, false
	}
	return share, meta, payload, true
}

func (a *App) requireEreportEntitled(w http.ResponseWriter, r *http.Request, user *User) bool {
	ok, unavailable := a.hasProductEntitlement(r, user, productEreport)
	if unavailable || !ok {
		a.auditEvent(r, "ereport_entitlement", "denied", user.ID)
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return false
	}
	return true
}

func (a *App) ereportListSharedHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportUser(w, r)
	if user == nil {
		return
	}
	if !a.requireEreportEntitled(w, r, user) {
		return
	}
	idx, err := a.ereport.loadSharedIndex(user.ID)
	if err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	out := make([]ereportSharedCard, 0, len(idx.Items))
	for _, item := range idx.Items {
		meta, _, loadErr := a.ereport.loadReport(item.OwnerUserID, item.OrgID, item.ReportID)
		if loadErr != nil {
			continue
		}
		item.Tema = meta.Tema
		item.ReportNumber = meta.ReportNumber
		item.UpdatedAt = meta.UpdatedAt
		if owner, oErr := a.store.UserByID(r.Context(), item.OwnerUserID); oErr == nil && owner != nil {
			item.OwnerSafe = displayOwnerSafe(owner.Email)
			item.OwnerEmail = owner.Email
		}
		item.ViewURL = a.ereportViewURL(r, item.OwnerSafe, item.OrgID, item.ReportID) + "&shared=1"
		out = append(out, item)
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (a *App) ereportGetSharedReportHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportUser(w, r)
	if user == nil {
		return
	}
	if !a.requireEreportEntitled(w, r, user) {
		return
	}
	orgID := r.PathValue("orgId")
	reportID := r.PathValue("reportId")
	share, meta, payload, ok := a.findShareForMember(user.ID, orgID, reportID)
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	owner, _ := a.store.UserByID(r.Context(), share.OwnerUserID)
	ownerSafe := meta.OwnerSafe
	if owner != nil {
		meta = displayMeta(owner, meta)
		ownerSafe = displayOwnerSafe(owner.Email)
	}
	rewritten, _ := rewriteSharedImageURLs(payload, orgID, reportID).(map[string]any)
	if rewritten == nil {
		rewritten = payload
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"meta":     meta,
		"payload":  rewritten,
		"canEdit":  share.CanEdit,
		"canShare": false,
		"isOwner":  false,
		"shared":   true,
		"viewUrl":  a.ereportViewURL(r, ownerSafe, meta.OrgID, meta.ID) + "&shared=1",
	})
}

func rewriteSharedImageURLs(v any, orgID, reportID string) any {
	switch t := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(t))
		for k, val := range t {
			if k == "url" {
				if s, ok := val.(string); ok {
					if id := extractEreportImageID(s); id != "" {
						out[k] = "/api/ereport/shared/orgs/" + orgID + "/reports/" + reportID + "/images/" + id
						continue
					}
				}
			}
			out[k] = rewriteSharedImageURLs(val, orgID, reportID)
		}
		return out
	case []any:
		out := make([]any, len(t))
		for i, item := range t {
			out[i] = rewriteSharedImageURLs(item, orgID, reportID)
		}
		return out
	default:
		return v
	}
}

func (a *App) ereportPutSharedReportHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	user := a.requireEreportUser(w, r)
	if user == nil {
		return
	}
	if !a.requireEreportEntitled(w, r, user) {
		return
	}
	orgID := r.PathValue("orgId")
	reportID := r.PathValue("reportId")
	share, meta, _, ok := a.findShareForMember(user.ID, orgID, reportID)
	if !ok {
		a.writeSafeError(w, r, http.StatusNotFound, "not_found")
		return
	}
	if !share.CanEdit {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	var body struct {
		Tema    *string        `json:"tema"`
		Payload map[string]any `json:"payload"`
	}
	if !a.decodeEreportJSON(w, r, &body) {
		return
	}
	if body.Payload == nil {
		a.writeSafeError(w, r, http.StatusBadRequest, "invalid_request")
		return
	}
	if body.Tema != nil {
		tema := strings.TrimSpace(*body.Tema)
		if tema == "" {
			tema = "Sin tema"
		}
		meta.Tema = tema
	}
	if n, ok := body.Payload["reportNumber"].(string); ok {
		meta.ReportNumber = n
	}
	if d, ok := body.Payload["reportDate"].(string); ok {
		meta.ReportDate = d
	}
	meta.UpdatedAt = nowRFC3339()
	if err := a.ereport.saveReport(share.OwnerUserID, meta, body.Payload); err != nil {
		a.writeSafeError(w, r, http.StatusInternalServerError, "internal_error")
		return
	}
	a.touchLibrary(share.OwnerUserID, meta)
	a.auditEvent(r, "ereport_shared_save", "ok", user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"meta": meta, "payload": body.Payload})
}

func (a *App) ereportSharedUploadImageHandler(w http.ResponseWriter, r *http.Request) {
	if !a.requireUnsafe(w, r) {
		return
	}
	user := a.requireEreportUser(w, r)
	if user == nil {
		return
	}
	if !a.requireEreportEntitled(w, r, user) {
		return
	}
	orgID := r.PathValue("orgId")
	reportID := r.PathValue("reportId")
	share, _, _, ok := a.findShareForMember(user.ID, orgID, reportID)
	if !ok || !share.CanEdit {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	a.saveEreportImage(w, r, share.OwnerUserID, orgID, reportID, "/api/ereport/shared/orgs/"+orgID+"/reports/"+reportID+"/images/")
}

func (a *App) ereportSharedGetImageHandler(w http.ResponseWriter, r *http.Request) {
	user := a.requireEreportUser(w, r)
	if user == nil {
		return
	}
	if !a.requireEreportEntitled(w, r, user) {
		return
	}
	orgID := r.PathValue("orgId")
	reportID := r.PathValue("reportId")
	share, _, _, ok := a.findShareForMember(user.ID, orgID, reportID)
	if !ok {
		a.writeSafeError(w, r, http.StatusForbidden, "forbidden")
		return
	}
	a.serveEreportImage(w, r, share.OwnerUserID, orgID, reportID, r.PathValue("imageId"))
}
