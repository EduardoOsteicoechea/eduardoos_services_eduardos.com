package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"strings"
)

type ereportImportArgs struct {
	Email       string
	MetaPath    string
	PayloadPath string
	OrgName     string
	Root        string
}

type ereportImportResult struct {
	OwnerUserID string
	OrgID       string
	ReportID    string
	Tema        string
	ViewPath    string
}

func runEreportImportCLI(ctx context.Context, cfg config, store DataStore, args []string) error {
	fs := flag.NewFlagSet("ereport-import", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	email := fs.String("email", "", "")
	metaPath := fs.String("meta", "", "")
	payloadPath := fs.String("payload", "", "")
	orgName := fs.String("org-name", "eduardoos.com", "")
	root := fs.String("root", "", "")
	if err := fs.Parse(args); err != nil {
		return err
	}
	mediaRoot := strings.TrimSpace(*root)
	if mediaRoot == "" {
		mediaRoot = strings.TrimSpace(cfg.EreportMediaRoot)
	}
	if mediaRoot == "" {
		mediaRoot = strings.TrimSpace(cfg.MediaRoot) + "/ereport"
	}
	storeFS := newEreportFS(mediaRoot)
	result, err := importEreportFromFiles(ctx, store, storeFS, ereportImportArgs{
		Email:       *email,
		MetaPath:    *metaPath,
		PayloadPath: *payloadPath,
		OrgName:     *orgName,
	})
	if err != nil {
		return err
	}
	fmt.Printf("imported org=%s report=%s view=%s\n", result.OrgID, result.ReportID, result.ViewPath)
	return nil
}

func importEreportFromFiles(ctx context.Context, store DataStore, fs *ereportFS, in ereportImportArgs) (ereportImportResult, error) {
	var out ereportImportResult
	_, emailNorm, ok := normalizeEmail(in.Email)
	if !ok {
		return out, errors.New("invalid email")
	}
	user, err := store.UserByEmail(ctx, emailNorm)
	if err != nil || user == nil {
		return out, errors.New("user not found")
	}
	if !validEreportID(user.ID) {
		return out, errors.New("invalid owner id")
	}

	legacyMeta, err := readImportMeta(in.MetaPath)
	if err != nil {
		return out, err
	}
	payload, err := readImportPayload(in.PayloadPath)
	if err != nil {
		return out, err
	}

	tema := strings.TrimSpace(legacyMeta.Tema)
	if tema == "" {
		tema = "Imported"
	}
	orgName := strings.TrimSpace(in.OrgName)
	if orgName == "" {
		orgName = "eduardoos.com"
	}
	enrichImportedPayload(payload, tema, orgName)

	reportID := strings.TrimSpace(legacyMeta.ID)
	if !validEreportID(reportID) {
		reportID = randomID(16)
	}

	org, err := ensureImportOrg(fs, user, orgName)
	if err != nil {
		return out, err
	}

	now := nowRFC3339()
	createdAt := strings.TrimSpace(legacyMeta.CreatedAt)
	if createdAt == "" {
		createdAt = now
	}
	updatedAt := strings.TrimSpace(legacyMeta.UpdatedAt)
	if updatedAt == "" {
		updatedAt = now
	}
	if existing, _, loadErr := fs.loadReport(user.ID, org.ID, reportID); loadErr == nil && existing.ID != "" {
		createdAt = existing.CreatedAt
		updatedAt = now
	}

	reportNumber, _ := payload["reportNumber"].(string)
	reportDate, _ := payload["reportDate"].(string)
	meta := displayMeta(user, ereportMeta{
		ID:           reportID,
		Tema:         tema,
		ReportNumber: strings.TrimSpace(reportNumber),
		ReportDate:   strings.TrimSpace(reportDate),
		OrgID:        org.ID,
		OwnerUserID:  user.ID,
		CreatedAt:    createdAt,
		UpdatedAt:    updatedAt,
	})
	if err := fs.saveReport(user.ID, meta, payload); err != nil {
		return out, errors.New("report write failed")
	}
	lib, _ := fs.loadOrgLibrary(user.ID, org.ID)
	lib.Reports = upsertEreportCard(lib.Reports, ereportCard{
		ID: reportID, Tema: tema, ReportNumber: meta.ReportNumber, UpdatedAt: updatedAt,
	})
	if err := fs.saveOrgLibrary(user.ID, org.ID, lib); err != nil {
		return out, errors.New("library write failed")
	}

	out.OwnerUserID = user.ID
	out.OrgID = org.ID
	out.ReportID = reportID
	out.Tema = tema
	out.ViewPath = ereportViewPath(displayOwnerSafe(user.Email), org.ID, reportID)
	return out, nil
}

type legacyEreportMetaFile struct {
	ID        string `json:"id"`
	Tema      string `json:"tema"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}

func readImportMeta(path string) (legacyEreportMetaFile, error) {
	var meta legacyEreportMetaFile
	data, err := os.ReadFile(path)
	if err != nil {
		return meta, errors.New("meta unreadable")
	}
	if err := json.Unmarshal(data, &meta); err != nil {
		return meta, errors.New("meta invalid")
	}
	return meta, nil
}

func readImportPayload(path string) (map[string]any, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, errors.New("payload unreadable")
	}
	var payload map[string]any
	if err := json.Unmarshal(data, &payload); err != nil || payload == nil {
		return nil, errors.New("payload invalid")
	}
	if _, ok := payload["sections"]; !ok {
		return nil, errors.New("payload missing sections")
	}
	return payload, nil
}

func enrichImportedPayload(payload map[string]any, tema, orgName string) {
	if payload == nil {
		return
	}
	if s, _ := payload["reportName"].(string); strings.TrimSpace(s) == "" {
		payload["reportName"] = tema
	}
	if s, _ := payload["orgName"].(string); strings.TrimSpace(s) == "" {
		payload["orgName"] = orgName
	}
	if _, ok := payload["appTitle"]; !ok {
		payload["appTitle"] = "Issue Tracker"
	}
	if _, ok := payload["validationCriteria"]; !ok {
		payload["validationCriteria"] = []any{}
	}
}

func ensureImportOrg(fs *ereportFS, user *User, orgName string) (ereportOrgMeta, error) {
	idx, err := fs.loadOrgsIndex(user.ID)
	if err != nil {
		return ereportOrgMeta{}, errors.New("orgs unreadable")
	}
	want := strings.ToLower(strings.TrimSpace(orgName))
	var chosen ereportOrgCard
	for _, card := range idx.Orgs {
		if card.Hidden {
			continue
		}
		if strings.ToLower(strings.TrimSpace(card.Name)) == want {
			chosen = card
			break
		}
		if chosen.ID == "" {
			chosen = card
		}
	}
	if chosen.ID != "" {
		meta, loadErr := fs.loadOrgMeta(user.ID, chosen.ID)
		if loadErr == nil && meta.ID != "" {
			return displayOrgMeta(user, meta), nil
		}
	}

	now := nowRFC3339()
	id := randomID(16)
	meta := displayOrgMeta(user, ereportOrgMeta{
		ID: id, Name: orgName, OwnerUserID: user.ID, Order: len(idx.Orgs),
		CreatedAt: now, UpdatedAt: now,
	})
	if err := fs.saveOrgMeta(user.ID, meta); err != nil {
		return ereportOrgMeta{}, errors.New("org write failed")
	}
	if err := fs.saveOrgLibrary(user.ID, id, ereportLibrary{Reports: []ereportCard{}}); err != nil {
		return ereportOrgMeta{}, errors.New("library write failed")
	}
	idx.Orgs = append(idx.Orgs, ereportOrgCard{
		ID: id, Name: orgName, Order: meta.Order, CreatedAt: now, UpdatedAt: now,
	})
	if err := fs.saveOrgsIndex(user.ID, idx); err != nil {
		return ereportOrgMeta{}, errors.New("orgs write failed")
	}
	return meta, nil
}

func upsertEreportCard(cards []ereportCard, next ereportCard) []ereportCard {
	for i, card := range cards {
		if card.ID == next.ID {
			cards[i] = next
			return cards
		}
	}
	return append(cards, next)
}
