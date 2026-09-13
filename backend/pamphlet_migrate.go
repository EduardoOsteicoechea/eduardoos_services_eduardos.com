package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type legacyEpamMetaDoc struct {
	ID       string `bson:"_id"`
	UserID   string `bson:"user_id"`
	EpamID   string `bson:"epam_id"`
	BodyPath string `bson:"body_path"`
}

// migratePamphletBodies moves legacy filesystem bodies to MongoDB before the API
// starts serving. Files are deliberately retained as an offline backup.
func migratePamphletBodies(ctx context.Context, cfg config, store DataStore) error {
	ms, ok := store.(*mongoStore)
	if !ok || ms == nil || ms.db == nil {
		return nil
	}
	epams := ms.db.Collection(colEpams)
	bodies := ms.db.Collection(colEpamBodies)
	cur, err := epams.Find(ctx, bson.M{"body_path": bson.M{"$ne": ""}})
	if err != nil {
		return err
	}
	defer cur.Close(ctx)

	for cur.Next(ctx) {
		var legacy legacyEpamMetaDoc
		if err := cur.Decode(&legacy); err != nil {
			return err
		}
		if legacy.ID == "" || legacy.UserID == "" || legacy.EpamID == "" || legacy.BodyPath == "" {
			return errors.New("invalid legacy pamphlet metadata")
		}
		path := filepath.Join(cfg.MediaRoot, filepath.FromSlash(legacy.BodyPath))
		raw, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read legacy pamphlet %s: %w", legacy.ID, err)
		}
		var body map[string]any
		if err := json.Unmarshal(raw, &body); err != nil {
			return fmt.Errorf("decode legacy pamphlet %s: %w", legacy.ID, err)
		}
		bodyDoc := epamBodyDoc{ID: legacy.ID, UserID: legacy.UserID, EpamID: legacy.EpamID, Body: body}
		if _, err := bson.Marshal(bodyDoc); err != nil {
			return fmt.Errorf("encode legacy pamphlet %s: %w", legacy.ID, err)
		}
		if _, err := bodies.ReplaceOne(ctx, bson.M{"_id": legacy.ID}, bodyDoc, options.Replace().SetUpsert(true)); err != nil {
			return err
		}
		if _, err := epams.UpdateOne(ctx, bson.M{"_id": legacy.ID}, bson.M{
			"$unset": bson.M{"body_path": "", "s3_key": ""},
		}); err != nil {
			return err
		}
	}
	return cur.Err()
}
