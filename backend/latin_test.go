package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestResolveCalvinParagraphsRootFindsLocalPack(t *testing.T) {
	root := resolveCalvinParagraphsRoot("")
	if _, err := os.Stat(filepath.Join(root, "index.json")); err != nil {
		t.Fatalf("expected local calvin pack index under %s: %v", root, err)
	}
}
