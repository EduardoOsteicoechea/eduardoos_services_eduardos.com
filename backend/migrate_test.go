package main

import (
	"bytes"
	"context"
	"log/slog"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type fakeApplier struct {
	mu                  sync.Mutex
	name                string
	collections         map[string]int
	indexes             map[string][]mongo.IndexModel
	records             map[string]schemaMigrationRecord
	failCreateIndexAt   int
	createIndexCalls    int
	failCollection      string
}

func newFakeApplier(name string) *fakeApplier {
	return &fakeApplier{
		name:        name,
		collections: map[string]int{},
		indexes:     map[string][]mongo.IndexModel{},
		records:     map[string]schemaMigrationRecord{},
	}
}

func (f *fakeApplier) DatabaseName() string { return f.name }

func (f *fakeApplier) EnsureCollection(_ context.Context, name string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.failCollection != "" && name == f.failCollection {
		return &migrationError{reason: "create_collection_failed"}
	}
	f.collections[name]++
	return nil
}

func (f *fakeApplier) EnsureIndexes(_ context.Context, collection string, models []mongo.IndexModel) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.createIndexCalls++
	if f.failCreateIndexAt > 0 && f.createIndexCalls == f.failCreateIndexAt {
		return &migrationError{reason: "create_index_failed"}
	}
	f.indexes[collection] = append([]mongo.IndexModel{}, models...)
	return nil
}

func (f *fakeApplier) AppliedMigration(_ context.Context, id string) (*schemaMigrationRecord, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	rec, ok := f.records[id]
	if !ok {
		return nil, nil
	}
	cp := rec
	return &cp, nil
}

func (f *fakeApplier) RecordMigration(_ context.Context, rec schemaMigrationRecord) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if _, ok := f.records[rec.ID]; ok {
		return &migrationError{reason: "record_migration_failed"}
	}
	f.records[rec.ID] = rec
	return nil
}

func (f *fakeApplier) ListMigrations(context.Context) ([]schemaMigrationRecord, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]schemaMigrationRecord, 0, len(f.records))
	for _, rec := range f.records {
		out = append(out, rec)
	}
	return out, nil
}

func testMigrationLogger(buf *bytes.Buffer) *slog.Logger {
	return slog.New(slog.NewJSONHandler(buf, nil))
}

func TestSafeMigrationsAreIdempotent(t *testing.T) {
	applier := newFakeApplier(isolatedTestDatabaseName())
	var buf bytes.Buffer
	log := testMigrationLogger(&buf)
	ctx := context.Background()
	if err := applySchemaMigrations(ctx, log, applier, "test", safeSchemaMigrations(), false, ""); err != nil {
		t.Fatalf("first apply: %v", err)
	}
	if err := applySchemaMigrations(ctx, log, applier, "test", safeSchemaMigrations(), false, ""); err != nil {
		t.Fatalf("second apply: %v", err)
	}
	if len(applier.records) != 2 {
		t.Fatalf("expected two migration records, got %d", len(applier.records))
	}
	if applier.records["001_initial_auth_schema"].Checksum == "" {
		t.Fatal("missing checksum")
	}
	if applier.records["001_initial_auth_schema"].AppliedAt.IsZero() {
		t.Fatal("missing applied_at")
	}
	if applier.collections[colUsers] < 1 || applier.collections[colSchemaMigrations] < 1 {
		t.Fatalf("collections not created: %v", applier.collections)
	}
	out := buf.String()
	if !strings.Contains(out, `"status":"applied"`) || !strings.Contains(out, `"status":"already_applied"`) {
		t.Fatalf("expected applied then already_applied: %s", out)
	}
	assertSafeMigrationLog(t, out)
}

func TestIndexDefinitionsMatchContract(t *testing.T) {
	migrations := safeSchemaMigrations()
	if len(migrations) != 2 {
		t.Fatalf("expected two safe migrations, got %d", len(migrations))
	}
	m := migrations[0]
	assertUnique := func(collection, field string) {
		t.Helper()
		idx, ok := findIndex(m.Indexes, collection, field)
		if !ok || !idx.Unique {
			t.Fatalf("missing unique index %s.%s", collection, field)
		}
	}
	assertTTL := func(collection, field string) {
		t.Helper()
		idx, ok := findIndex(m.Indexes, collection, field)
		if !ok || idx.ExpireAfterSeconds == nil || *idx.ExpireAfterSeconds != 0 {
			t.Fatalf("missing TTL index %s.%s expireAfterSeconds=0", collection, field)
		}
	}
	assertUnique(colUsers, "email_normalized")
	assertUnique(colUsers, "username_normalized")
	assertUnique(colSessions, "session_id")
	assertUnique(colSessions, "refresh_token_hash")
	if _, ok := findIndex(m.Indexes, colSessions, "family_id"); !ok {
		t.Fatal("missing session family index")
	}
	if _, ok := findIndex(m.Indexes, colSessions, "user_id"); !ok {
		t.Fatal("missing session user_id index")
	}
	avatar, ok := findIndex(m.Indexes, colUsers, "avatar_key")
	if !ok || !avatar.Sparse || avatar.Unique {
		t.Fatal("avatar_key must be a sparse non-unique lookup index")
	}
	assertTTL(colSessions, "expires_at")
	assertTTL(colEmailOTPs, "expires_at")
	assertTTL(colResetOTPs, "expires_at")
	otp, ok := findIndex(m.Indexes, colEmailOTPs, "otp_hash")
	if !ok || !otp.Unique {
		t.Fatal("email OTP hash must be unique")
	}
	resetHash, ok := findIndex(m.Indexes, colResetOTPs, "otp_hash")
	if !ok || !resetHash.Unique {
		t.Fatal("reset OTP hash must be unique")
	}
	required := []string{colUsers, colSessions, colEmailOTPs, colResetOTPs, colEntitlements, colAPIKeys}
	have := map[string]bool{}
	for _, mig := range migrations {
		for _, name := range mig.Collections {
			have[name] = true
		}
	}
	for _, name := range required {
		if !have[name] {
			t.Fatalf("missing collection %s", name)
		}
	}
	if len(destructiveSchemaMigrations()) != 0 {
		t.Fatal("destructive migrations must not ship without an explicit operator command")
	}
}

func TestTTLConfigurationUsesExpireAtField(t *testing.T) {
	for _, idx := range safeSchemaMigrations()[0].Indexes {
		if idx.ExpireAfterSeconds == nil {
			continue
		}
		if *idx.ExpireAfterSeconds != 0 {
			t.Fatalf("%s TTL must expire at expires_at, got %d", idx.Collection, *idx.ExpireAfterSeconds)
		}
		if len(idx.Keys) != 1 || idx.Keys[0].Key != "expires_at" {
			t.Fatalf("TTL index must be on expires_at, got %v", idx.Keys)
		}
		model := idx.model()
		if model.Options == nil || model.Options.ExpireAfterSeconds == nil || *model.Options.ExpireAfterSeconds != 0 {
			t.Fatalf("IndexModel TTL not set for %s", idx.Collection)
		}
	}
}

func TestUniquenessIndexModels(t *testing.T) {
	for _, idx := range safeSchemaMigrations()[0].Indexes {
		if !idx.Unique {
			continue
		}
		model := idx.model()
		if model.Options == nil || model.Options.Unique == nil || !*model.Options.Unique {
			t.Fatalf("unique flag missing on %s", idx.fingerprint())
		}
	}
}

func TestFailedMigrationIsNotRecordedAndCanRetry(t *testing.T) {
	applier := newFakeApplier(isolatedTestDatabaseName())
	applier.failCreateIndexAt = 2
	var buf bytes.Buffer
	log := testMigrationLogger(&buf)
	ctx := context.Background()
	err := applySchemaMigrations(ctx, log, applier, "test", safeSchemaMigrations(), false, "")
	if err == nil || migrationReason(err) != "create_index_failed" {
		t.Fatalf("expected create_index_failed, got %v", err)
	}
	if len(applier.records) != 0 {
		t.Fatalf("failed migration must not be recorded: %v", applier.records)
	}
	applier.failCreateIndexAt = 0
	if err := applySchemaMigrations(ctx, log, applier, "test", safeSchemaMigrations(), false, ""); err != nil {
		t.Fatalf("retry: %v", err)
	}
	if _, ok := applier.records["001_initial_auth_schema"]; !ok {
		t.Fatal("retry should record the migration")
	}
	assertSafeMigrationLog(t, buf.String())
}

func TestFailedCollectionCreateIsNotRecorded(t *testing.T) {
	applier := newFakeApplier(isolatedTestDatabaseName())
	applier.failCollection = colUsers
	err := applySchemaMigrations(context.Background(), testMigrationLogger(&bytes.Buffer{}), applier, "test", safeSchemaMigrations(), false, "")
	if err == nil || migrationReason(err) != "create_collection_failed" {
		t.Fatalf("expected create_collection_failed, got %v", err)
	}
	if len(applier.records) != 0 {
		t.Fatal("must not record a failed collection create")
	}
}

func TestChecksumMismatchFailsStartup(t *testing.T) {
	applier := newFakeApplier(isolatedTestDatabaseName())
	ctx := context.Background()
	log := testMigrationLogger(&bytes.Buffer{})
	if err := applySchemaMigrations(ctx, log, applier, "test", safeSchemaMigrations(), false, ""); err != nil {
		t.Fatal(err)
	}
	rec := applier.records["001_initial_auth_schema"]
	rec.Checksum = "tampered"
	applier.records["001_initial_auth_schema"] = rec
	err := applySchemaMigrations(ctx, log, applier, "test", safeSchemaMigrations(), false, "")
	if err == nil || migrationReason(err) != "checksum_mismatch" {
		t.Fatalf("expected checksum_mismatch, got %v", err)
	}
}

func TestDestructiveMigrationsDoNotRunAutomatically(t *testing.T) {
	applier := newFakeApplier(isolatedTestDatabaseName())
	drop := schemaMigration{
		ID:          "999_drop_users",
		Description: "drop users",
		Destructive: true,
		Collections: []string{colUsers},
	}
	err := applySchemaMigrations(context.Background(), testMigrationLogger(&bytes.Buffer{}), applier, "test", []schemaMigration{drop}, false, "")
	if err == nil || migrationReason(err) != "destructive_not_automatic" {
		t.Fatalf("expected destructive_not_automatic, got %v", err)
	}
	if len(applier.records) != 0 {
		t.Fatal("destructive migration must not be recorded automatically")
	}
	err = applySchemaMigrations(context.Background(), testMigrationLogger(&bytes.Buffer{}), applier, "test", []schemaMigration{drop}, true, "")
	if err == nil || migrationReason(err) != "destructive_not_confirmed" {
		t.Fatalf("expected destructive_not_confirmed, got %v", err)
	}
	if err := applySchemaMigrations(context.Background(), testMigrationLogger(&bytes.Buffer{}), applier, "test", []schemaMigration{drop}, true, confirmBackupToken); err != nil {
		t.Fatalf("confirmed destructive apply: %v", err)
	}
	if _, ok := applier.records["999_drop_users"]; !ok {
		t.Fatal("confirmed destructive migration should record")
	}
}

func TestProductionDatabaseNameRejectedInTestEnv(t *testing.T) {
	applier := newFakeApplier(mongoDatabase)
	err := applySchemaMigrations(context.Background(), testMigrationLogger(&bytes.Buffer{}), applier, "test", safeSchemaMigrations(), false, "")
	if err == nil || migrationReason(err) != "production_database_in_test" {
		t.Fatalf("expected production_database_in_test, got %v", err)
	}
	if len(applier.records) != 0 {
		t.Fatal("must not migrate the locked production database during tests")
	}
}

func TestWrongDatabaseNameIsRejected(t *testing.T) {
	applier := newFakeApplier("someone_elses_db")
	err := applySchemaMigrations(context.Background(), testMigrationLogger(&bytes.Buffer{}), applier, "production", safeSchemaMigrations(), false, "")
	if err == nil || migrationReason(err) != "wrong_database" {
		t.Fatalf("expected wrong_database, got %v", err)
	}
}

func TestLockedProductionDatabaseAllowedOutsideTests(t *testing.T) {
	applier := newFakeApplier(mongoDatabase)
	if err := applySchemaMigrations(context.Background(), testMigrationLogger(&bytes.Buffer{}), applier, "production", safeSchemaMigrations(), false, ""); err != nil {
		t.Fatalf("production startup should migrate %s: %v", mongoDatabase, err)
	}
}

func TestTestsUseMemoryStoreNotMongo(t *testing.T) {
	app := newTestApp(true)
	if _, ok := app.store.(*memoryStore); !ok {
		t.Fatal("unit tests must use the in-memory store")
	}
	if err := app.store.ApplySafeMigrations(context.Background(), testMigrationLogger(&bytes.Buffer{}), "test"); err != nil {
		t.Fatal(err)
	}
}

func TestOpenStoreWithoutURIUsesMemory(t *testing.T) {
	store, err := openStore(context.Background(), config{MongoDatabase: mongoDatabase, AppEnv: "test"})
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := store.(*memoryStore); !ok {
		t.Fatal("empty MONGO_URI must use memory store")
	}
}

func TestOpenStoreNeverReadsProductionURIDuringTests(t *testing.T) {
	if strings.TrimSpace(os.Getenv("TEST_MONGO_URI")) == "" && strings.TrimSpace(os.Getenv("MONGO_URI")) != "" {
		t.Log("MONGO_URI is set in the environment; tests must not pass it to openStore")
	}
	store, err := openStore(context.Background(), config{MongoURI: "", MongoDatabase: mongoDatabase, AppEnv: "test"})
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := store.(*memoryStore); !ok {
		t.Fatal("tests must not open Atlas using MONGO_URI")
	}
}

func TestMongoIntegrationProvisioningIsolatedDatabase(t *testing.T) {
	uri := strings.TrimSpace(os.Getenv("TEST_MONGO_URI"))
	if uri == "" {
		t.Skip("TEST_MONGO_URI not set; fake applier covers migration behavior")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()
	cfg := config{MongoURI: uri, MongoDatabase: isolatedTestDatabaseName(), AppEnv: "test"}
	store, err := newMongoStore(ctx, cfg)
	if err != nil {
		t.Fatalf("test mongo unavailable")
	}
	defer func() {
		_ = store.db.Drop(ctx)
		_ = store.Close(ctx)
	}()
	var buf bytes.Buffer
	log := testMigrationLogger(&buf)
	if err := store.ApplySafeMigrations(ctx, log, "test"); err != nil {
		t.Fatalf("apply: %v", err)
	}
	if err := store.ApplySafeMigrations(ctx, log, "test"); err != nil {
		t.Fatalf("idempotent apply: %v", err)
	}
	names, err := store.db.ListCollectionNames(ctx, struct{}{})
	if err != nil {
		t.Fatal(err)
	}
	want := []string{colUsers, colSessions, colEmailOTPs, colResetOTPs, colSchemaMigrations, colEntitlements, colAPIKeys}
	for _, name := range want {
		found := false
		for _, have := range names {
			if have == name {
				found = true
				break
			}
		}
		if !found {
			t.Fatalf("missing collection %s in %v", name, names)
		}
	}
	idx, err := store.users().Indexes().ListSpecifications(ctx)
	if err != nil {
		t.Fatal(err)
	}
	var sawEmail, sawUser bool
	for _, spec := range idx {
		if spec.Unique != nil && *spec.Unique {
			keys := spec.KeysDocument
			if bytes.Contains(keys, []byte("email_normalized")) {
				sawEmail = true
			}
			if bytes.Contains(keys, []byte("username_normalized")) {
				sawUser = true
			}
		}
	}
	if !sawEmail || !sawUser {
		t.Fatalf("unique email/username indexes missing: %#v", idx)
	}
	sessIdx, err := store.sessions().Indexes().ListSpecifications(ctx)
	if err != nil {
		t.Fatal(err)
	}
	var sawTTL bool
	for _, spec := range sessIdx {
		if spec.ExpireAfterSeconds != nil && *spec.ExpireAfterSeconds == 0 {
			sawTTL = true
		}
	}
	if !sawTTL {
		t.Fatal("session TTL index missing")
	}
	assertSafeMigrationLog(t, buf.String())
}

func TestNewMongoStoreDoesNotUseProductionNameInTests(t *testing.T) {
	if isolatedTestDatabaseName() == mongoDatabase {
		t.Fatal("isolated test database must not equal the locked production name")
	}
	if !strings.HasSuffix(isolatedTestDatabaseName(), testDatabaseSuffix) {
		t.Fatal("isolated test database must use _gotest suffix")
	}
}

func findIndex(indexes []indexSpec, collection, field string) (indexSpec, bool) {
	for _, idx := range indexes {
		if idx.Collection == collection && len(idx.Keys) > 0 && idx.Keys[0].Key == field {
			return idx, true
		}
	}
	return indexSpec{}, false
}

func assertSafeMigrationLog(t *testing.T, out string) {
	t.Helper()
	lower := strings.ToLower(out)
	forbidden := []string{
		"mongodb://", "mongodb+srv://", "correct-horse", "member@", "admin@",
		"test-jwt-secret", "smtp_password", "authorization:",
	}
	for _, item := range forbidden {
		if strings.Contains(lower, item) {
			t.Fatalf("migration log leaked %q: %s", item, out)
		}
	}
}

func TestIndexModelTTLOptionMatchesSpec(t *testing.T) {
	opts := options.Index().SetExpireAfterSeconds(0)
	if opts.ExpireAfterSeconds == nil || *opts.ExpireAfterSeconds != 0 {
		t.Fatal("ExpireAfterSeconds(0) is the TTL-at-field-value setting")
	}
}
