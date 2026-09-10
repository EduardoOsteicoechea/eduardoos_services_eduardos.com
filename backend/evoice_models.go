package main

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"path"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const (
	productEvoice     = "evoice"
	evoiceRootPrefix  = "evoice"
	evoiceMaxUpload   = 32 << 20
	evoiceProjectMark = "CREATE_A_FOLDER_BY_GENERATION_PROJECT_BESIDE_THIS_ONE"

	ModeStandard     = "standard"
	ModePremium      = "premium"
	ModeSuperPremium = "super_premium"
)

var (
	evoiceProjectNameRe = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$`)
	evoiceVersionAudio  = regexp.MustCompile(`(?i)^(.+)\.v(\d+)(?:\.c\d+-.*)?\.mp3$`)
	allowedContentPct   = map[int]bool{100: true, 75: true, 50: true, 25: true, 10: true, 5: true}
)

type evoiceObjectMeta struct {
	Name         string `json:"name"`
	Key          string `json:"key"`
	Size         int64  `json:"size"`
	LastModified string `json:"lastModified,omitempty"`
	URL          string `json:"url,omitempty"`
}

type evoiceJobStep struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	State string `json:"state"`
}

type evoiceJobFileProgress struct {
	Name     string `json:"name"`
	State    string `json:"state"`
	Progress int    `json:"progress"`
	Detail   string `json:"detail,omitempty"`
}

type evoiceJobStats struct {
	Docs      int `json:"docs"`
	Generated int `json:"generated"`
	Skipped   int `json:"skipped"`
	Failed    int `json:"failed"`
}

type evoiceJobStatus struct {
	ID             string                   `json:"id" bson:"_id"`
	State          string                   `json:"state" bson:"state"`
	Owner          string                   `json:"ownerSafe" bson:"owner_user_id"`
	Project        string                   `json:"project" bson:"project"`
	OnlyFiles      []string                 `json:"onlyFiles,omitempty" bson:"only_files,omitempty"`
	Premium        bool                     `json:"premium,omitempty" bson:"premium,omitempty"`
	Mode           string                   `json:"mode,omitempty" bson:"mode,omitempty"`
	ContentPercent int                      `json:"contentPercent,omitempty" bson:"content_percent,omitempty"`
	Logs           []string                 `json:"logs" bson:"logs"`
	Steps          []evoiceJobStep          `json:"steps" bson:"steps"`
	Files          []evoiceJobFileProgress  `json:"files" bson:"files"`
	Progress       int                      `json:"progress" bson:"progress"`
	CurrentStep    string                   `json:"currentStep,omitempty" bson:"current_step,omitempty"`
	Error          string                   `json:"error,omitempty" bson:"error,omitempty"`
	Stats          *evoiceJobStats          `json:"stats,omitempty" bson:"stats,omitempty"`
	UpdatedAt      time.Time                `json:"-" bson:"updated_at"`
	CreatedAt      time.Time                `json:"-" bson:"created_at"`
}

type evoicePlaylistShareFile struct {
	Name string `json:"name" bson:"name"`
	Size int64  `json:"size" bson:"size"`
}

type evoicePlaylistShare struct {
	ID         string                    `json:"-" bson:"_id"`
	TokenHash  string                    `json:"-" bson:"token_hash"`
	OwnerSafe  string                    `json:"ownerSafe" bson:"owner_user_id"`
	Project    string                    `json:"project" bson:"project"`
	Email      string                    `json:"email" bson:"email"`
	Files      []evoicePlaylistShareFile `json:"files" bson:"files"`
	ExpiresAt  time.Time                 `json:"expiresAt" bson:"expires_at"`
	CreatedAt  time.Time                 `json:"createdAt" bson:"created_at"`
	RawToken   string                    `json:"token,omitempty" bson:"-"`
}

type evoiceProjectDoc struct {
	ID        string    `bson:"_id"`
	UserID    string    `bson:"user_id"`
	Name      string    `bson:"name"`
	CreatedAt time.Time `bson:"created_at"`
	UpdatedAt time.Time `bson:"updated_at"`
}

type evoiceGenerateOpts struct {
	Mode           string
	ContentPercent int
}

func (o evoiceGenerateOpts) UsesDeepSeek() bool {
	if o.Mode == ModePremium || o.Mode == ModeSuperPremium {
		return true
	}
	return o.ContentPercent > 0 && o.ContentPercent < 100
}

func (o evoiceGenerateOpts) IsSuper() bool { return o.Mode == ModeSuperPremium }

func (o evoiceGenerateOpts) PremiumCompat() bool { return o.UsesDeepSeek() }

func normalizeEvoiceMode(mode string, legacyPremium bool) string {
	m := strings.ToLower(strings.TrimSpace(mode))
	switch m {
	case ModeStandard, ModePremium, ModeSuperPremium:
		return m
	case "super", "superpremium", "super-premium":
		return ModeSuperPremium
	}
	if legacyPremium {
		return ModePremium
	}
	return ModeStandard
}

func normalizeEvoiceContentPercent(n int) int {
	if allowedContentPct[n] {
		return n
	}
	return 100
}

func hashEvoiceToken(raw string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(raw)))
	return hex.EncodeToString(sum[:])
}

func sanitizeEvoiceProject(name string) string {
	name = strings.TrimSpace(name)
	name = strings.ReplaceAll(name, "/", "-")
	name = strings.ReplaceAll(name, "\\", "-")
	return name
}

func sanitizeEvoiceFileName(name string) string {
	name = path.Base(strings.TrimSpace(name))
	name = strings.ReplaceAll(name, "..", "")
	return name
}

func validEvoiceProjectName(name string) bool {
	name = sanitizeEvoiceProject(name)
	if name == "" || name == evoiceProjectMark || name == "." || name == ".." {
		return false
	}
	return evoiceProjectNameRe.MatchString(name)
}

func validEvoiceFileName(name string) bool {
	name = sanitizeEvoiceFileName(name)
	if name == "" || name == "." || name == ".." || name == ".keep" {
		return false
	}
	if strings.Contains(name, "/") || strings.Contains(name, "\\") {
		return false
	}
	return len(name) <= 200
}

func isEvoiceConvertible(name string) bool {
	lower := strings.ToLower(name)
	if strings.HasSuffix(lower, ".premium.txt") || strings.HasSuffix(lower, ".vision.txt") {
		return false
	}
	switch filepath.Ext(lower) {
	case ".docx", ".txt", ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp", ".gif":
		return true
	default:
		return false
	}
}

func evoiceContentType(name string) string {
	lower := strings.ToLower(name)
	switch {
	case strings.HasSuffix(lower, ".mp3"):
		return "audio/mpeg"
	case strings.HasSuffix(lower, ".txt"):
		return "text/plain; charset=utf-8"
	case strings.HasSuffix(lower, ".pdf"):
		return "application/pdf"
	case strings.HasSuffix(lower, ".docx"):
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	case strings.HasSuffix(lower, ".png"):
		return "image/png"
	case strings.HasSuffix(lower, ".jpg"), strings.HasSuffix(lower, ".jpeg"):
		return "image/jpeg"
	case strings.HasSuffix(lower, ".webp"):
		return "image/webp"
	case strings.HasSuffix(lower, ".gif"):
		return "image/gif"
	default:
		return "application/octet-stream"
	}
}

func evoiceRelKey(userID, project, kind, name string) string {
	return fmt.Sprintf("%s/%s/%s/%s/%s", evoiceRootPrefix, userID, sanitizeEvoiceProject(project), kind, sanitizeEvoiceFileName(name))
}

func evoiceProjectRel(userID, project string) string {
	return fmt.Sprintf("%s/%s/%s", evoiceRootPrefix, userID, sanitizeEvoiceProject(project))
}

func nextEvoiceAudioVersion(audiosDir, stem string) int {
	max := 0
	entries, err := filepath.Glob(filepath.Join(audiosDir, stem+".v*.mp3"))
	if err != nil {
		return 1
	}
	for _, p := range entries {
		m := evoiceVersionAudio.FindStringSubmatch(filepath.Base(p))
		if m == nil || m[1] != stem {
			continue
		}
		n, err := strconv.Atoi(m[2])
		if err != nil {
			continue
		}
		if n > max {
			max = n
		}
	}
	return max + 1
}

func parseEvoiceAudioVersion(name string) (stem string, version int, ok bool) {
	m := evoiceVersionAudio.FindStringSubmatch(name)
	if m == nil {
		return "", 0, false
	}
	n, err := strconv.Atoi(m[2])
	if err != nil || n < 1 {
		return "", 0, false
	}
	return m[1], n, true
}
