package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	colUsers              = "users"
	colSessions           = "auth_sessions"
	colEmailOTPs          = "email_verification_otps"
	colResetOTPs          = "password_reset_tokens"
	colCSRF               = "csrf_challenges"
	colEntitlements       = "entitlements"
	colAPIKeys            = "api_keys"
	colPaymentIntents     = "payment_intents"
	colUserPreferences    = "user_preferences"
	colSchemaMigrations   = "schema_migrations"
	confirmBackupToken    = "I_HAVE_A_BACKUP"
	testDatabaseSuffix    = "_gotest"
	migrationSetupTimeout = 45 * time.Second
)

type migrationError struct {
	reason string
}

func (e *migrationError) Error() string { return e.reason }

func migrationReason(err error) string {
	var me *migrationError
	if errors.As(err, &me) {
		return me.reason
	}
	return "database_setup_failed"
}

type schemaMigrationRecord struct {
	ID          string    `bson:"_id" json:"id"`
	Description string    `bson:"description" json:"description"`
	Checksum    string    `bson:"checksum" json:"checksum"`
	AppliedAt   time.Time `bson:"applied_at" json:"applied_at"`
	Destructive bool      `bson:"destructive" json:"destructive"`
}

type indexSpec struct {
	Collection         string
	Keys               bson.D
	Unique             bool
	Sparse             bool
	ExpireAfterSeconds *int32
}

func ttlExpireAt() *int32 {
	zero := int32(0)
	return &zero
}

func (idx indexSpec) model() mongo.IndexModel {
	opts := options.Index()
	if idx.Unique {
		opts.SetUnique(true)
	}
	if idx.Sparse {
		opts.SetSparse(true)
	}
	if idx.ExpireAfterSeconds != nil {
		opts.SetExpireAfterSeconds(*idx.ExpireAfterSeconds)
	}
	return mongo.IndexModel{Keys: idx.Keys, Options: opts}
}

func (idx indexSpec) fingerprint() string {
	ttl := "none"
	if idx.ExpireAfterSeconds != nil {
		ttl = fmt.Sprintf("%d", *idx.ExpireAfterSeconds)
	}
	keys := make([]string, 0, len(idx.Keys))
	for _, k := range idx.Keys {
		keys = append(keys, fmt.Sprintf("%s=%v", k.Key, k.Value))
	}
	return fmt.Sprintf("%s|%s|unique=%t|sparse=%t|ttl=%s", idx.Collection, strings.Join(keys, ","), idx.Unique, idx.Sparse, ttl)
}

type schemaMigration struct {
	ID          string
	Description string
	Destructive bool
	Collections []string
	Indexes     []indexSpec
}

func (m schemaMigration) checksum() string {
	h := sha256.New()
	fmt.Fprintf(h, "%s\n%s\ndestructive=%t\n", m.ID, m.Description, m.Destructive)
	for _, name := range m.Collections {
		fmt.Fprintf(h, "collection:%s\n", name)
	}
	for _, idx := range m.Indexes {
		fmt.Fprintf(h, "index:%s\n", idx.fingerprint())
	}
	return hex.EncodeToString(h.Sum(nil))
}

func safeSchemaMigrations() []schemaMigration {
	otpIndexes := func(collection string) []indexSpec {
		return []indexSpec{
			{Collection: collection, Keys: bson.D{{Key: "otp_hash", Value: 1}}, Unique: true},
			{Collection: collection, Keys: bson.D{{Key: "email_normalized", Value: 1}}},
			{Collection: collection, Keys: bson.D{{Key: "expires_at", Value: 1}}, ExpireAfterSeconds: ttlExpireAt()},
		}
	}
	return []schemaMigration{
		{
			ID:          "001_initial_auth_schema",
			Description: "Create users, sessions, OTP, CSRF collections and required indexes",
			Collections: []string{colUsers, colSessions, colEmailOTPs, colResetOTPs, colCSRF},
			Indexes: append([]indexSpec{
				{Collection: colUsers, Keys: bson.D{{Key: "email_normalized", Value: 1}}, Unique: true},
				{Collection: colUsers, Keys: bson.D{{Key: "username_normalized", Value: 1}}, Unique: true},
				{Collection: colUsers, Keys: bson.D{{Key: "status", Value: 1}}},
				{Collection: colUsers, Keys: bson.D{{Key: "role", Value: 1}}},
				{Collection: colUsers, Keys: bson.D{{Key: "avatar_key", Value: 1}}, Sparse: true},
				{Collection: colSessions, Keys: bson.D{{Key: "session_id", Value: 1}}, Unique: true},
				{Collection: colSessions, Keys: bson.D{{Key: "refresh_token_hash", Value: 1}}, Unique: true},
				{Collection: colSessions, Keys: bson.D{{Key: "family_id", Value: 1}}},
				{Collection: colSessions, Keys: bson.D{{Key: "user_id", Value: 1}}},
				{Collection: colSessions, Keys: bson.D{{Key: "expires_at", Value: 1}}, ExpireAfterSeconds: ttlExpireAt()},
			}, append(append(otpIndexes(colEmailOTPs), otpIndexes(colResetOTPs)...), indexSpec{
				Collection: colCSRF, Keys: bson.D{{Key: "expires_at", Value: 1}}, ExpireAfterSeconds: ttlExpireAt(),
			})...),
		},
		{
			ID:          "002_ereport_platform_keys",
			Description: "Create entitlements and API keys collections for eReport platform checks",
			Collections: []string{colEntitlements, colAPIKeys},
			Indexes: []indexSpec{
				{Collection: colEntitlements, Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "product", Value: 1}}},
				{Collection: colEntitlements, Keys: bson.D{{Key: "expires_at", Value: 1}}, Sparse: true},
				{Collection: colAPIKeys, Keys: bson.D{{Key: "secret_hash", Value: 1}}, Unique: true},
				{Collection: colAPIKeys, Keys: bson.D{{Key: "user_id", Value: 1}}},
				{Collection: colAPIKeys, Keys: bson.D{{Key: "prefix", Value: 1}}},
			},
		},
		{
			ID:          "003_product_suite_payments_prefs",
			Description: "Create payment_intents and user_preferences for product suite subscriptions",
			Collections: []string{colPaymentIntents, colUserPreferences},
			Indexes: []indexSpec{
				{Collection: colPaymentIntents, Keys: bson.D{{Key: "user_id", Value: 1}}},
				{Collection: colPaymentIntents, Keys: bson.D{{Key: "status", Value: 1}}},
				{Collection: colPaymentIntents, Keys: bson.D{{Key: "updated_at", Value: 1}}},
				{Collection: colUserPreferences, Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "key", Value: 1}}, Unique: true},
				{Collection: colUserPreferences, Keys: bson.D{{Key: "updated_at", Value: 1}}},
			},
		},
		{
			ID:          "004_evoice_collections",
			Description: "Create eVoice projects, jobs, and hashed playlist share collections",
			Collections: []string{colEvoiceProjects, colEvoiceJobs, colEvoiceShares},
			Indexes: []indexSpec{
				{Collection: colEvoiceProjects, Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "name", Value: 1}}, Unique: true},
				{Collection: colEvoiceJobs, Keys: bson.D{{Key: "owner_user_id", Value: 1}}},
				{Collection: colEvoiceJobs, Keys: bson.D{{Key: "updated_at", Value: 1}}},
				{Collection: colEvoiceShares, Keys: bson.D{{Key: "token_hash", Value: 1}}, Unique: true},
				{Collection: colEvoiceShares, Keys: bson.D{{Key: "expires_at", Value: 1}}, ExpireAfterSeconds: ttlExpireAt()},
			},
		},
		{
			ID:          "005_scrib_epams",
			Description: "Create Scrib and Pamphlet (epam) Mongo collections",
			Collections: []string{colScribLibraries, colScribBooks, colScribSheets, colEpams, colEpamFooters},
			Indexes: []indexSpec{
				{Collection: colScribBooks, Keys: bson.D{{Key: "user_id", Value: 1}}},
				{Collection: colScribSheets, Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "bookId", Value: 1}}},
				{Collection: colEpams, Keys: bson.D{{Key: "user_id", Value: 1}}},
				{Collection: colEpamFooters, Keys: bson.D{{Key: "user_id", Value: 1}}},
			},
		},
		{
			ID:          "006_homescool",
			Description: "Create Homescool links, tasks, templates, and catalogs collections",
			Collections: []string{
				colHomescoolLinks, colHomescoolTasks, colHomescoolTemplates, colHomescoolCatalogs,
			},
			Indexes: []indexSpec{
				{Collection: colHomescoolLinks, Keys: bson.D{{Key: "teacher_user_id", Value: 1}, {Key: "student_user_id", Value: 1}}, Unique: true},
				{Collection: colHomescoolLinks, Keys: bson.D{{Key: "teacher_user_id", Value: 1}, {Key: "student_slug", Value: 1}}},
				{Collection: colHomescoolLinks, Keys: bson.D{{Key: "student_user_id", Value: 1}}},
				{Collection: colHomescoolTasks, Keys: bson.D{{Key: "teacher_user_id", Value: 1}, {Key: "student_user_id", Value: 1}}},
				{Collection: colHomescoolTemplates, Keys: bson.D{{Key: "teacher_user_id", Value: 1}}},
				{Collection: colHomescoolCatalogs, Keys: bson.D{{Key: "teacher_user_id", Value: 1}, {Key: "kind", Value: 1}}},
			},
		},
		{
			ID:          "007_eoadmin",
			Description: "Create eoadmin assignment options and purchase statements collections",
			Collections: []string{colEoadminOptions, colEoadminStatements},
			Indexes: []indexSpec{
				{Collection: colEoadminOptions, Keys: bson.D{{Key: "active", Value: 1}, {Key: "sort_order", Value: 1}}},
				{Collection: colEoadminOptions, Keys: bson.D{{Key: "label", Value: 1}}},
				{Collection: colEoadminStatements, Keys: bson.D{{Key: "user_id", Value: 1}}},
				{Collection: colEoadminStatements, Keys: bson.D{{Key: "user_email", Value: 1}}},
				{Collection: colEoadminStatements, Keys: bson.D{{Key: "status", Value: 1}}},
				{Collection: colEoadminStatements, Keys: bson.D{{Key: "updated_at", Value: 1}}},
			},
		},
		{
			ID:          "008_eostore",
			Description: "Create eostore companies, sections, types, and products collections",
			Collections: []string{colEostoreCompanies, colEostoreSections, colEostoreTypes, colEostoreProducts},
			Indexes: []indexSpec{
				{Collection: colEostoreCompanies, Keys: bson.D{{Key: "friendly_id", Value: 1}}, Unique: true},
				{Collection: colEostoreCompanies, Keys: bson.D{{Key: "name", Value: 1}}},
				{Collection: colEostoreSections, Keys: bson.D{{Key: "company_guid", Value: 1}, {Key: "friendly_id", Value: 1}}, Unique: true},
				{Collection: colEostoreSections, Keys: bson.D{{Key: "company_guid", Value: 1}}},
				{Collection: colEostoreTypes, Keys: bson.D{{Key: "section_guid", Value: 1}, {Key: "friendly_id", Value: 1}}, Unique: true},
				{Collection: colEostoreTypes, Keys: bson.D{{Key: "company_guid", Value: 1}}},
				{Collection: colEostoreProducts, Keys: bson.D{{Key: "company_guid", Value: 1}, {Key: "friendly_id", Value: 1}}, Unique: true},
				{Collection: colEostoreProducts, Keys: bson.D{{Key: "type_guid", Value: 1}}},
				{Collection: colEostoreProducts, Keys: bson.D{{Key: "section_guid", Value: 1}}},
				{Collection: colEostoreProducts, Keys: bson.D{{Key: "visible", Value: 1}}},
			},
		},
		{
			ID:          "009_eostore_carts",
			Description: "Create eostore per-user company carts collection",
			Collections: []string{colEostoreCarts},
			Indexes: []indexSpec{
				{Collection: colEostoreCarts, Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "company_guid", Value: 1}}, Unique: true},
				{Collection: colEostoreCarts, Keys: bson.D{{Key: "updated_at", Value: 1}}},
			},
		},
		{
			ID:          "010_eoproject",
			Description: "Create eoproject projects, stages, photos, IFC, and shares collections",
			Collections: []string{colEoprojectProjects, colEoprojectStages, colEoprojectPhotos, colEoprojectIFC, colEoprojectShares},
			Indexes: []indexSpec{
				{Collection: colEoprojectProjects, Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "updated_at", Value: -1}}},
				{Collection: colEoprojectStages, Keys: bson.D{{Key: "project_id", Value: 1}, {Key: "sort_order", Value: 1}}},
				{Collection: colEoprojectPhotos, Keys: bson.D{{Key: "stage_id", Value: 1}, {Key: "created_at", Value: -1}}},
				{Collection: colEoprojectPhotos, Keys: bson.D{{Key: "project_id", Value: 1}}},
				{Collection: colEoprojectIFC, Keys: bson.D{{Key: "stage_id", Value: 1}, {Key: "version", Value: -1}}},
				{Collection: colEoprojectIFC, Keys: bson.D{{Key: "project_id", Value: 1}}},
				{Collection: colEoprojectShares, Keys: bson.D{{Key: "token_hash", Value: 1}}, Unique: true},
				{Collection: colEoprojectShares, Keys: bson.D{{Key: "project_id", Value: 1}}},
			},
		},
		{
			ID:          "011_epam_bodies",
			Description: "Create MongoDB storage for Pamphlet document bodies",
			Collections: []string{colEpamBodies},
			Indexes: []indexSpec{
				{Collection: colEpamBodies, Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "epam_id", Value: 1}}, Unique: true},
			},
		},
	}
}

func destructiveSchemaMigrations() []schemaMigration {
	return nil
}

type schemaApplier interface {
	DatabaseName() string
	EnsureCollection(ctx context.Context, name string) error
	EnsureIndexes(ctx context.Context, collection string, models []mongo.IndexModel) error
	AppliedMigration(ctx context.Context, id string) (*schemaMigrationRecord, error)
	RecordMigration(ctx context.Context, rec schemaMigrationRecord) error
	ListMigrations(ctx context.Context) ([]schemaMigrationRecord, error)
}

func isolatedTestDatabaseName() string {
	return mongoDatabase + testDatabaseSuffix
}

func migrationDatabaseAllowed(name, appEnv string) bool {
	name = strings.TrimSpace(name)
	env := strings.ToLower(strings.TrimSpace(appEnv))
	if name == isolatedTestDatabaseName() {
		return env == "test" || env == "development"
	}
	if name == mongoDatabase {
		return env != "test"
	}
	return false
}

func applySchemaMigrations(ctx context.Context, log *slog.Logger, applier schemaApplier, appEnv string, migrations []schemaMigration, destructive bool, confirmBackup string) error {
	if log == nil {
		log = newJSONLogger()
	}
	if !migrationDatabaseAllowed(applier.DatabaseName(), appEnv) {
		if strings.ToLower(strings.TrimSpace(appEnv)) == "test" && applier.DatabaseName() == mongoDatabase {
			return &migrationError{reason: "production_database_in_test"}
		}
		return &migrationError{reason: "wrong_database"}
	}
	if destructive {
		if strings.TrimSpace(confirmBackup) != confirmBackupToken {
			return &migrationError{reason: "destructive_not_confirmed"}
		}
	} else {
		for _, m := range migrations {
			if m.Destructive {
				return &migrationError{reason: "destructive_not_automatic"}
			}
		}
	}
	if err := applier.EnsureCollection(ctx, colSchemaMigrations); err != nil {
		return err
	}
	if err := applier.EnsureIndexes(ctx, colSchemaMigrations, []mongo.IndexModel{
		{Keys: bson.D{{Key: "applied_at", Value: 1}}},
	}); err != nil {
		return err
	}
	for _, m := range migrations {
		sum := m.checksum()
		existing, err := applier.AppliedMigration(ctx, m.ID)
		if err != nil {
			return err
		}
		if existing != nil {
			if existing.Checksum != sum {
				log.Error("migration", slog.String("id", m.ID), slog.String("status", "checksum_mismatch"))
				return &migrationError{reason: "checksum_mismatch"}
			}
			log.Info("migration",
				slog.String("id", m.ID),
				slog.String("status", "already_applied"),
				slog.String("description", m.Description),
				slog.String("checksum", sum),
				slog.Int("collections", len(m.Collections)),
				slog.Int("indexes", len(m.Indexes)),
			)
			continue
		}
		for _, name := range m.Collections {
			if err := applier.EnsureCollection(ctx, name); err != nil {
				log.Error("migration", slog.String("id", m.ID), slog.String("status", "create_collection_failed"), slog.String("collection", name))
				return err
			}
		}
		byCol := map[string][]mongo.IndexModel{}
		for _, idx := range m.Indexes {
			byCol[idx.Collection] = append(byCol[idx.Collection], idx.model())
		}
		for _, name := range m.Collections {
			if err := applier.EnsureIndexes(ctx, name, byCol[name]); err != nil {
				log.Error("migration", slog.String("id", m.ID), slog.String("status", "create_index_failed"), slog.String("collection", name))
				return err
			}
		}
		rec := schemaMigrationRecord{
			ID:          m.ID,
			Description: m.Description,
			Checksum:    sum,
			AppliedAt:   time.Now().UTC(),
			Destructive: m.Destructive,
		}
		if err := applier.RecordMigration(ctx, rec); err != nil {
			log.Error("migration", slog.String("id", m.ID), slog.String("status", "record_migration_failed"))
			return err
		}
		log.Info("migration",
			slog.String("id", m.ID),
			slog.String("status", "applied"),
			slog.String("description", m.Description),
			slog.String("checksum", sum),
			slog.Int("collections", len(m.Collections)),
			slog.Int("indexes", len(m.Indexes)),
		)
	}
	return nil
}

func (s *memoryStore) ApplySafeMigrations(context.Context, *slog.Logger, string) error {
	return nil
}

func (s *memoryStore) MigrationStatus(context.Context) ([]schemaMigrationRecord, error) {
	return nil, nil
}

func (s *memoryStore) ApplyDestructiveMigrations(context.Context, *slog.Logger, string, string) error {
	return nil
}

func (s *mongoStore) migrations() *mongo.Collection { return s.db.Collection(colSchemaMigrations) }

func (s *mongoStore) DatabaseName() string { return s.db.Name() }

func (s *mongoStore) EnsureCollection(ctx context.Context, name string) error {
	err := s.db.CreateCollection(ctx, name)
	if err != nil && !isNamespaceExists(err) {
		return &migrationError{reason: "create_collection_failed"}
	}
	return nil
}

func (s *mongoStore) EnsureIndexes(ctx context.Context, collection string, models []mongo.IndexModel) error {
	if len(models) == 0 {
		return nil
	}
	if _, err := s.db.Collection(collection).Indexes().CreateMany(ctx, models); err != nil {
		return &migrationError{reason: "create_index_failed"}
	}
	return nil
}

func (s *mongoStore) AppliedMigration(ctx context.Context, id string) (*schemaMigrationRecord, error) {
	var rec schemaMigrationRecord
	err := s.migrations().FindOne(ctx, bson.M{"_id": id}).Decode(&rec)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, nil
	}
	if err != nil {
		return nil, &migrationError{reason: "load_migrations_failed"}
	}
	return &rec, nil
}

func (s *mongoStore) RecordMigration(ctx context.Context, rec schemaMigrationRecord) error {
	_, err := s.migrations().InsertOne(ctx, rec)
	if err == nil {
		return nil
	}
	if isDup(err) {
		existing, lookErr := s.AppliedMigration(ctx, rec.ID)
		if lookErr != nil {
			return lookErr
		}
		if existing != nil && existing.Checksum == rec.Checksum {
			return nil
		}
		return &migrationError{reason: "checksum_mismatch"}
	}
	return &migrationError{reason: "record_migration_failed"}
}

func (s *mongoStore) ListMigrations(ctx context.Context) ([]schemaMigrationRecord, error) {
	cur, err := s.migrations().Find(ctx, bson.M{}, options.Find().SetSort(bson.D{{Key: "_id", Value: 1}}))
	if err != nil {
		return nil, &migrationError{reason: "load_migrations_failed"}
	}
	defer func() { _ = cur.Close(ctx) }()
	var out []schemaMigrationRecord
	if err := cur.All(ctx, &out); err != nil {
		return nil, &migrationError{reason: "load_migrations_failed"}
	}
	return out, nil
}

func (s *mongoStore) ApplySafeMigrations(ctx context.Context, log *slog.Logger, appEnv string) error {
	return applySchemaMigrations(ctx, log, s, appEnv, safeSchemaMigrations(), false, "")
}

func (s *mongoStore) MigrationStatus(ctx context.Context) ([]schemaMigrationRecord, error) {
	return s.ListMigrations(ctx)
}

func (s *mongoStore) ApplyDestructiveMigrations(ctx context.Context, log *slog.Logger, appEnv, confirmBackup string) error {
	pending := destructiveSchemaMigrations()
	if len(pending) == 0 {
		if log != nil {
			log.Info("migration", slog.String("status", "no_pending_destructive_migrations"))
		}
		return nil
	}
	return applySchemaMigrations(ctx, log, s, appEnv, pending, true, confirmBackup)
}

func isNamespaceExists(err error) bool {
	var cmd mongo.CommandError
	if errors.As(err, &cmd) {
		return cmd.Code == 48
	}
	return false
}

func logMigrationStatus(ctx context.Context, store DataStore, log *slog.Logger) error {
	records, err := store.MigrationStatus(ctx)
	if err != nil {
		return err
	}
	if len(records) == 0 {
		log.Info("migration_status", slog.String("status", "none_applied"), slog.Int("count", 0))
		return nil
	}
	for _, rec := range records {
		log.Info("migration_status",
			slog.String("id", rec.ID),
			slog.String("description", rec.Description),
			slog.String("checksum", rec.Checksum),
			slog.Time("applied_at", rec.AppliedAt),
			slog.Bool("destructive", rec.Destructive),
		)
	}
	return nil
}
