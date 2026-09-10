package main

import (
	"crypto/sha256"
	"encoding/hex"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	productEoproject     = "eoproject"
	colEoprojectProjects = "eoproject_projects"
	colEoprojectStages   = "eoproject_stages"
	colEoprojectPhotos   = "eoproject_photos"
	colEoprojectIFC      = "eoproject_ifc_versions"
	colEoprojectShares   = "eoproject_shares"

	eoprojectMaxPhotoBytes = 12 << 20
	eoprojectMaxIFCBytes   = 80 << 20
	eoprojectMaxNameLen    = 120
	eoprojectMaxDescLen    = 2000
	eoprojectMaxLabelLen   = 80
	eoprojectShareMinHours = 1
	eoprojectShareMaxHours = 24 * 90
)

var eoprojectNameRe = regexp.MustCompile(`^[\p{L}\p{N}][\p{L}\p{N} ._'-]{0,119}$`)

type eoprojectProject struct {
	ID          string    `json:"id" bson:"_id"`
	UserID      string    `json:"userId" bson:"user_id"`
	Name        string    `json:"name" bson:"name"`
	Description string    `json:"description,omitempty" bson:"description,omitempty"`
	CreatedAt   time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt   time.Time `json:"updatedAt" bson:"updated_at"`
}

type eoprojectStage struct {
	ID        string    `json:"id" bson:"_id"`
	ProjectID string    `json:"projectId" bson:"project_id"`
	UserID    string    `json:"userId" bson:"user_id"`
	Name      string    `json:"name" bson:"name"`
	SortOrder int       `json:"sortOrder" bson:"sort_order"`
	CreatedAt time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" bson:"updated_at"`
}

type eoprojectPhoto struct {
	ID           string    `json:"id" bson:"_id"`
	ProjectID    string    `json:"projectId" bson:"project_id"`
	StageID      string    `json:"stageId" bson:"stage_id"`
	UserID       string    `json:"userId" bson:"user_id"`
	StorageName  string    `json:"-" bson:"storage_name"`
	OriginalName string    `json:"originalName" bson:"original_name"`
	ContentType  string    `json:"contentType" bson:"content_type"`
	Size         int64     `json:"size" bson:"size"`
	CreatedAt    time.Time `json:"createdAt" bson:"created_at"`
	URL          string    `json:"url,omitempty" bson:"-"`
}

type eoprojectIFCVersion struct {
	ID           string    `json:"id" bson:"_id"`
	ProjectID    string    `json:"projectId" bson:"project_id"`
	StageID      string    `json:"stageId" bson:"stage_id"`
	UserID       string    `json:"userId" bson:"user_id"`
	Version      int       `json:"version" bson:"version"`
	Label        string    `json:"label,omitempty" bson:"label,omitempty"`
	StorageName  string    `json:"-" bson:"storage_name"`
	OriginalName string    `json:"originalName" bson:"original_name"`
	Size         int64     `json:"size" bson:"size"`
	CreatedAt    time.Time `json:"createdAt" bson:"created_at"`
	URL          string    `json:"url,omitempty" bson:"-"`
}

type eoprojectShare struct {
	ID        string    `json:"id" bson:"_id"`
	TokenHash string    `json:"-" bson:"token_hash"`
	UserID    string    `json:"userId" bson:"user_id"`
	ProjectID string    `json:"projectId" bson:"project_id"`
	Label     string    `json:"label,omitempty" bson:"label,omitempty"`
	ExpiresAt time.Time `json:"expiresAt" bson:"expires_at"`
	CreatedAt time.Time `json:"createdAt" bson:"created_at"`
	RawToken  string    `json:"token,omitempty" bson:"-"`
	Link      string    `json:"link,omitempty" bson:"-"`
}

type eoprojectStageBundle struct {
	Stage       eoprojectStage       `json:"stage"`
	Photos      []eoprojectPhoto     `json:"photos"`
	IFCVersions []eoprojectIFCVersion `json:"ifcVersions"`
}

type eoprojectDashboard struct {
	Project eoprojectProject       `json:"project"`
	Stages  []eoprojectStageBundle `json:"stages"`
}

func hashEoprojectToken(raw string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(raw)))
	return hex.EncodeToString(sum[:])
}

func sanitizeEoprojectText(s string, max int) string {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, "\x00", "")
	if max > 0 && utf8.RuneCountInString(s) > max {
		runes := []rune(s)
		s = string(runes[:max])
	}
	return s
}

func validEoprojectName(name string) bool {
	name = sanitizeEoprojectText(name, eoprojectMaxNameLen)
	if name == "" || name == "." || name == ".." {
		return false
	}
	return eoprojectNameRe.MatchString(name)
}

func looksLikeIFC(data []byte) bool {
	if len(data) < 16 {
		return false
	}
	head := strings.ToUpper(string(data[:minInt(64, len(data))]))
	return strings.Contains(head, "ISO-10303-21")
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func eoprojectPhotoURL(projectID, stageID, photoID string) string {
	return "/api/eoproject/projects/" + projectID + "/stages/" + stageID + "/photos/" + photoID + "/file"
}

func eoprojectIFCURL(projectID, stageID, versionID string) string {
	return "/api/eoproject/projects/" + projectID + "/stages/" + stageID + "/ifc/" + versionID + "/file"
}

func eoprojectSharePhotoURL(token, photoID string) string {
	return "/api/eoproject/invite/" + token + "/photos/" + photoID + "/file"
}

func eoprojectShareIFCURL(token, versionID string) string {
	return "/api/eoproject/invite/" + token + "/ifc/" + versionID + "/file"
}
