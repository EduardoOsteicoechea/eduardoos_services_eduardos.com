package main

import (
	"strings"
	"testing"
)

func TestTrimEnvQuotes(t *testing.T) {
	cases := map[string]string{
		"mongodb://host":              "mongodb://host",
		"'mongodb://host'":            "mongodb://host",
		"\"mongodb://host\"":          "mongodb://host",
		"  'mongodb://host'  ":        "mongodb://host",
		"":                            "",
	}
	for in, want := range cases {
		got := trimEnvQuotes(strings.TrimSpace(in))
		if got != want {
			t.Fatalf("trimEnvQuotes(%q) = %q, want %q", in, got, want)
		}
	}
}
