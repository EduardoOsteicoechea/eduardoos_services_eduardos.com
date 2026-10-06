package main

import (
	"net/url"
	"strings"
	"time"
)

const (
	colEoschoolCurriculumMaterials = "eoschool_curriculum_materials"

	eoschoolCurriculumMaterialRoleTeacherGuide = "teacher_guide"
	eoschoolCurriculumMaterialRoleChild        = "child"
	eoschoolCurriculumMaterialRoleProof        = "proof"

	eoschoolCurriculumMaterialKindImage    = "image"
	eoschoolCurriculumMaterialKindAudio    = "audio"
	eoschoolCurriculumMaterialKindDocument = "document"
	eoschoolCurriculumMaterialKindURL      = "url"

	eoschoolCurriculumMaterialMaxBytes = 25 << 20 // 25 MiB for audio/docs
	eoschoolCurriculumMaterialMaxPerRole = 4
	eoschoolCurriculumMaterialTitleMax   = 200
	eoschoolCurriculumMaterialDescMax    = 1000
)

var eoschoolCurriculumMaterialRoles = map[string]bool{
	eoschoolCurriculumMaterialRoleTeacherGuide: true,
	eoschoolCurriculumMaterialRoleChild:        true,
	eoschoolCurriculumMaterialRoleProof:        true,
}

// EoschoolCurriculumMaterial is one attachment or URL for a curriculum day section.
type EoschoolCurriculumMaterial struct {
	ID           string    `json:"id" bson:"id"`
	OwnerUserID  string    `json:"ownerUserId" bson:"owner_user_id"`
	StudentKey   string    `json:"studentKey" bson:"student_key"`
	DayID        string    `json:"dayId" bson:"day_id"`
	SectionID    string    `json:"sectionId" bson:"section_id"`
	Role         string    `json:"role" bson:"role"`
	Kind         string    `json:"kind" bson:"kind"`
	Title        string    `json:"title,omitempty" bson:"title,omitempty"`
	Description  string    `json:"description,omitempty" bson:"description,omitempty"`
	URL          string    `json:"url,omitempty" bson:"url,omitempty"`
	StorageName  string    `json:"storageName,omitempty" bson:"storage_name,omitempty"`
	ThumbName    string    `json:"thumbName,omitempty" bson:"thumb_name,omitempty"`
	ContentType  string    `json:"contentType,omitempty" bson:"content_type,omitempty"`
	Bytes        int64     `json:"bytes,omitempty" bson:"bytes,omitempty"`
	OriginalName string    `json:"originalName,omitempty" bson:"original_name,omitempty"`
	FileURL      string    `json:"fileUrl,omitempty" bson:"-"`
	ThumbURL     string    `json:"thumbUrl,omitempty" bson:"-"`
	CreatedAt    time.Time `json:"createdAt" bson:"created_at"`
	UpdatedAt    time.Time `json:"updatedAt" bson:"updated_at"`
}

func validateEoschoolCurriculumMaterialRole(role string) bool {
	return eoschoolCurriculumMaterialRoles[strings.TrimSpace(role)]
}

func validateEoschoolCurriculumMaterialScope(dayID, sectionID, role string) bool {
	return validateEoschoolCurriculumSectionToggle(dayID, sectionID) && validateEoschoolCurriculumMaterialRole(role)
}

func validateEoschoolCurriculumMaterialHTTPSURL(raw string) (string, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" || len(raw) > 2048 {
		return "", false
	}
	u, err := url.Parse(raw)
	if err != nil || u.Scheme != "https" || u.Host == "" {
		return "", false
	}
	return u.String(), true
}

func sanitizeEoschoolCurriculumMaterialTitle(raw string) string {
	title := strings.TrimSpace(raw)
	if len(title) > eoschoolCurriculumMaterialTitleMax {
		title = title[:eoschoolCurriculumMaterialTitleMax]
	}
	return title
}

func sanitizeEoschoolCurriculumMaterialDescription(raw string) string {
	desc := strings.TrimSpace(raw)
	if len(desc) > eoschoolCurriculumMaterialDescMax {
		desc = desc[:eoschoolCurriculumMaterialDescMax]
	}
	return desc
}

func countEoschoolCurriculumMaterialsForRole(items []EoschoolCurriculumMaterial, role string) int {
	n := 0
	for _, m := range items {
		if m.Role == role {
			n++
		}
	}
	return n
}

func eoschoolCurriculumMaterialFileURL(id string) string {
	return "/api/eoschool/curriculum/materials/" + id + "/file"
}

func eoschoolCurriculumMaterialThumbURL(id string) string {
	return "/api/eoschool/curriculum/materials/" + id + "/thumb"
}

func materialWithURLs(m EoschoolCurriculumMaterial) EoschoolCurriculumMaterial {
	if m.Kind == eoschoolCurriculumMaterialKindURL {
		return m
	}
	if m.StorageName != "" {
		m.FileURL = eoschoolCurriculumMaterialFileURL(m.ID)
	}
	if m.ThumbName != "" {
		m.ThumbURL = eoschoolCurriculumMaterialThumbURL(m.ID)
	}
	return m
}

func materialsWithURLs(items []EoschoolCurriculumMaterial) []EoschoolCurriculumMaterial {
	out := make([]EoschoolCurriculumMaterial, len(items))
	for i := range items {
		out[i] = materialWithURLs(items[i])
	}
	return out
}
