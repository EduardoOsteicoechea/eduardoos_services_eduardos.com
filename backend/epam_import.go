package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// runEpamImportCLI imports one local EPAM JSON file into the owner's MongoDB
// records. It is intentionally CLI-only: user documents must not transit CI or
// a public administrative HTTP endpoint.
func runEpamImportCLI(ctx context.Context, store DataStore, pamphlets PamphletStore, args []string) error {
	fs := flag.NewFlagSet("epam-import", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	email := fs.String("email", "", "owner email")
	fileName := fs.String("file", "", "path to an EPAM JSON file")
	overwrite := fs.Bool("overwrite", false, "replace an existing EPAM with the same id")
	if err := fs.Parse(args); err != nil {
		return err
	}
	_, normalizedEmail, ok := normalizeEmail(*email)
	if !ok || strings.TrimSpace(*fileName) == "" {
		return errors.New("email and file are required")
	}
	user, err := store.UserByEmail(ctx, normalizedEmail)
	if err != nil || user == nil {
		return errors.New("owner account not found")
	}
	raw, err := os.ReadFile(*fileName)
	if err != nil {
		return err
	}
	var body map[string]any
	if err := json.Unmarshal(raw, &body); err != nil {
		return errors.New("file is not valid EPAM JSON")
	}
	epamID := strings.TrimSpace(stringFromAny(body["id"]))
	if epamID == "" {
		return errors.New("EPAM document id is required")
	}
	if _, allowed := allowedPamphletTypes[strings.TrimSpace(stringFromAny(body["type"]))]; !allowed {
		return errors.New("file is not a supported pamphlet document")
	}
	existing, found, err := pamphlets.GetEpam(ctx, user.ID, epamID, "epam-import")
	if err != nil {
		return err
	}
	if found && !*overwrite {
		return fmt.Errorf("EPAM %s already exists; rerun with --overwrite to replace it", existing.EpamID)
	}
	rec := EpamRecord{
		UserID:   user.ID,
		EpamID:   epamID,
		FileName: strings.TrimSuffix(filepath.Base(*fileName), filepath.Ext(*fileName)) + ".epam",
		Body:     body,
	}
	if found {
		rec.CreatedAt = existing.CreatedAt
	}
	syncEpamMetaFromHeader(&rec)
	if rec.Title == "" {
		rec.Title = "Untitled pamphlet"
	}
	if _, err := pamphlets.SaveEpam(ctx, rec, "epam-import"); err != nil {
		return err
	}
	return nil
}

// runEpamPublishCLI publishes all pamphlets owned by one explicit account.
// It is CLI-only because it intentionally changes the visibility of private
// documents and must not be callable from a public browser endpoint.
func runEpamPublishCLI(ctx context.Context, store DataStore, pamphlets PamphletStore, args []string) error {
	fs := flag.NewFlagSet("epam-publish", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	email := fs.String("email", "", "owner email")
	all := fs.Bool("all", false, "publish every pamphlet owned by this account")
	if err := fs.Parse(args); err != nil {
		return err
	}
	_, normalizedEmail, ok := normalizeEmail(*email)
	if !ok || !*all {
		return errors.New("email and --all are required")
	}
	user, err := store.UserByEmail(ctx, normalizedEmail)
	if err != nil || user == nil {
		return errors.New("owner account not found")
	}
	records, err := pamphlets.ListEpams(ctx, user.ID, "epam-publish")
	if err != nil {
		return err
	}
	for _, record := range records {
		record.Public = true
		if _, err := pamphlets.SaveEpam(ctx, record, "epam-publish"); err != nil {
			return err
		}
	}
	return nil
}
