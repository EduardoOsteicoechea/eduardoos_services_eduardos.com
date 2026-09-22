package main

import (
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode"
)

const (
	homescoolMaterialsRoot   = "homescool"
	homescoolWebAssetsDir    = "web_assets"
	homescoolMaterialsSubdir = "materials"
)

// HomescoolMaterial is one US Letter study sheet owned by a teacher.
type HomescoolMaterial struct {
	ID          string `json:"id" bson:"_id"`
	OwnerUserID string `json:"ownerUserId" bson:"owner_user_id"`
	Cycle       int    `json:"cycle" bson:"cycle"`
	Week        int    `json:"week" bson:"week"`
	Subject     string `json:"subject" bson:"subject"`
	Day         int    `json:"day" bson:"day"`
	SessionDate string `json:"sessionDate" bson:"session_date"`
	Title       string `json:"title" bson:"title"`
	Slug        string `json:"slug" bson:"slug"`
	HTMLPath    string `json:"htmlPath" bson:"html_path"`
	CreatedAt   string `json:"createdAt" bson:"created_at"`
	UpdatedAt   string `json:"updatedAt" bson:"updated_at"`
}

// HomescoolCycleSummary is the dashboard aggregate for one cycle.
type HomescoolCycleSummary struct {
	Cycle int  `json:"cycle"`
	Count int  `json:"count"`
	Empty bool `json:"empty"`
}

var (
	homescoolSlugCleaner = regexp.MustCompile(`[^a-z0-9]+`)
	homescoolSubjectOK   = regexp.MustCompile(`^[a-z0-9_./-]+$`)
)

func homescoolMaterialLogicKey(cycle, week, day int, subject, slug string) string {
	return fmt.Sprintf("%d|%d|%s|%d|%s", cycle, week, strings.ToLower(subject), day, strings.ToLower(slug))
}

func homescoolSlugify(title string) string {
	title = strings.ToLower(strings.TrimSpace(title))
	var b strings.Builder
	for _, r := range title {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			b.WriteRune(r)
		case unicode.IsSpace(r) || r == '-' || r == '_':
			b.WriteByte('-')
		}
	}
	s := homescoolSlugCleaner.ReplaceAllString(b.String(), "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = "material"
	}
	if len(s) > 80 {
		s = s[:80]
		s = strings.Trim(s, "-")
	}
	return s
}

func homescoolValidateMaterialMeta(m *HomescoolMaterial) error {
	if m.Cycle < 1 || m.Cycle > 3 {
		return fmt.Errorf("cycle must be 1, 2, or 3")
	}
	if m.Week < 1 || m.Week > 52 {
		return fmt.Errorf("week must be 1–52")
	}
	if m.Day < 1 || m.Day > 7 {
		return fmt.Errorf("day must be 1–7")
	}
	m.Subject = strings.Trim(strings.ToLower(strings.TrimSpace(m.Subject)), "/")
	m.Subject = strings.ReplaceAll(m.Subject, "\\", "/")
	if m.Subject == "" || !homescoolSubjectOK.MatchString(m.Subject) {
		return fmt.Errorf("subject required (e.g. idiomas or locacion/geografia)")
	}
	m.Title = strings.TrimSpace(m.Title)
	if m.Title == "" {
		return fmt.Errorf("title required")
	}
	if m.Slug == "" {
		m.Slug = homescoolSlugify(m.Title)
	} else {
		m.Slug = homescoolSlugify(m.Slug)
	}
	m.SessionDate = strings.TrimSpace(m.SessionDate)
	if m.SessionDate != "" {
		if _, err := time.Parse("2006-01-02", m.SessionDate); err != nil {
			return fmt.Errorf("sessionDate must be YYYY-MM-DD")
		}
	}
	return nil
}

func homescoolMaterialRelativePath(ownerUserID string, m HomescoolMaterial) string {
	subj := strings.ReplaceAll(m.Subject, "/", string(filepath.Separator))
	file := fmt.Sprintf("_ciclo%d_semana%d_dia%d_%s.html", m.Cycle, m.Week, m.Day, m.Slug)
	if m.SessionDate != "" {
		file = fmt.Sprintf("_%s_%s_ciclo%d_semana%d_dia%d_%s.html",
			strings.ReplaceAll(m.SessionDate, "-", "_"),
			strings.ReplaceAll(m.Subject, "/", "-"),
			m.Cycle, m.Week, m.Day, m.Slug)
	}
	return filepath.ToSlash(filepath.Join(
		homescoolMaterialsRoot,
		homescoolMaterialsSubdir,
		ownerUserID,
		fmt.Sprintf("ciclo%d", m.Cycle),
		fmt.Sprintf("semana%d", m.Week),
		subj,
		fmt.Sprintf("dia%d", m.Day),
		file,
	))
}

func homescoolWebAssetsRelativePath() string {
	return filepath.ToSlash(filepath.Join(homescoolMaterialsRoot, homescoolWebAssetsDir))
}

func homescoolRewriteWebAssetLinks(html string) string {
	replacements := []struct{ old, neu string }{
		{`href="../../../../web_assets/styles.css"`, `href="/api/homescool/web-assets/styles.css"`},
		{`src="../../../../web_assets/print.js"`, `src="/api/homescool/web-assets/print.js"`},
		{`src="../../../../web_assets/map-grid.js"`, `src="/api/homescool/web-assets/map-grid.js"`},
		{`src="../../../../web_assets/venezuela.svg"`, `src="/api/homescool/web-assets/venezuela.svg"`},
		{`href='../../../../web_assets/styles.css'`, `href="/api/homescool/web-assets/styles.css"`},
		{`src='../../../../web_assets/print.js'`, `src="/api/homescool/web-assets/print.js"`},
	}
	out := html
	for _, r := range replacements {
		out = strings.ReplaceAll(out, r.old, r.neu)
	}
	return out
}

func cloneHomescoolMaterial(m HomescoolMaterial) HomescoolMaterial {
	return m
}
