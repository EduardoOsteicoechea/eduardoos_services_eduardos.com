package main

import (
	"fmt"
	"sort"
	"strings"
	"time"
)

const (
	pamphletFooterBindLinked   = "linked"
	pamphletFooterBindSnapshot = "snapshot"
	pamphletUnassignedSeries   = "(sin serie)"
	pamphletUnassignedChapter  = "(sin capítulo)"
	pamphletDefaultFooterL1    = "WhatsApp:"
	pamphletDefaultFooterL2    = "Teléfono:"
	pamphletDefaultFooterL3    = "Dirección:"
	pamphletDefaultFooterL4    = "Actividades:"
)

// EpamRecord is pamphlet metadata (body lives under media/pamphlet/...).
type EpamRecord struct {
	UserID            string         `json:"userId" bson:"user_id"`
	EpamID            string         `json:"epamId" bson:"epam_id"`
	FileName          string         `json:"fileName,omitempty" bson:"file_name,omitempty"`
	Title             string         `json:"title" bson:"title"`
	Series            string         `json:"series,omitempty" bson:"series,omitempty"`
	SeriesChapter     string         `json:"seriesChapter,omitempty" bson:"series_chapter,omitempty"`
	Author            string         `json:"author,omitempty" bson:"author,omitempty"`
	Date              string         `json:"date,omitempty" bson:"date,omitempty"`
	BodyPath          string         `json:"bodyPath,omitempty" bson:"body_path,omitempty"`
	S3Key             string         `json:"s3Key,omitempty" bson:"s3_key,omitempty"` // FE-compatible alias of BodyPath
	ContentSizeBytes  int64          `json:"contentSizeBytes,omitempty" bson:"content_size_bytes,omitempty"`
	CreatedAt         string         `json:"createdAt,omitempty" bson:"created_at,omitempty"`
	UpdatedAt         string         `json:"updatedAt" bson:"updated_at"`
	LastCorrelationID string         `json:"lastCorrelationId,omitempty" bson:"last_correlation_id,omitempty"`
	Body              map[string]any `json:"body,omitempty" bson:"-"`
}

// epamMetaDoc is the Mongo document (composite _id).
type epamMetaDoc struct {
	ID                string `bson:"_id"`
	UserID            string `bson:"user_id"`
	EpamID            string `bson:"epam_id"`
	FileName          string `bson:"file_name,omitempty"`
	Title             string `bson:"title"`
	Series            string `bson:"series,omitempty"`
	SeriesChapter     string `bson:"series_chapter,omitempty"`
	Author            string `bson:"author,omitempty"`
	Date              string `bson:"date,omitempty"`
	BodyPath          string `bson:"body_path,omitempty"`
	S3Key             string `bson:"s3_key,omitempty"`
	ContentSizeBytes  int64  `bson:"content_size_bytes,omitempty"`
	CreatedAt         string `bson:"created_at,omitempty"`
	UpdatedAt         string `bson:"updated_at"`
	LastCorrelationID string `bson:"last_correlation_id,omitempty"`
}

func epamDocID(userID, epamID string) string {
	return userID + ":" + epamID
}

func (r EpamRecord) toDoc() epamMetaDoc {
	return epamMetaDoc{
		ID:                epamDocID(r.UserID, r.EpamID),
		UserID:            r.UserID,
		EpamID:            r.EpamID,
		FileName:          r.FileName,
		Title:             r.Title,
		Series:            r.Series,
		SeriesChapter:     r.SeriesChapter,
		Author:            r.Author,
		Date:              r.Date,
		BodyPath:          r.BodyPath,
		S3Key:             r.S3Key,
		ContentSizeBytes:  r.ContentSizeBytes,
		CreatedAt:         r.CreatedAt,
		UpdatedAt:         r.UpdatedAt,
		LastCorrelationID: r.LastCorrelationID,
	}
}

func (d epamMetaDoc) toRecord() EpamRecord {
	return EpamRecord{
		UserID:            d.UserID,
		EpamID:            d.EpamID,
		FileName:          d.FileName,
		Title:             d.Title,
		Series:            d.Series,
		SeriesChapter:     d.SeriesChapter,
		Author:            d.Author,
		Date:              d.Date,
		BodyPath:          d.BodyPath,
		S3Key:             d.S3Key,
		ContentSizeBytes:  d.ContentSizeBytes,
		CreatedAt:         d.CreatedAt,
		UpdatedAt:         d.UpdatedAt,
		LastCorrelationID: d.LastCorrelationID,
	}
}

// FooterFields matches the pamphlet document footer object.
type FooterFields struct {
	Action  string `json:"action" bson:"action"`
	Message string `json:"message" bson:"message"`
	Label1  string `json:"label1" bson:"label1"`
	Value1  string `json:"value1" bson:"value1"`
	Label2  string `json:"label2" bson:"label2"`
	Value2  string `json:"value2" bson:"value2"`
	Label3  string `json:"label3" bson:"label3"`
	Value3  string `json:"value3" bson:"value3"`
	Label4  string `json:"label4" bson:"label4"`
	Value4  string `json:"value4" bson:"value4"`
}

// FooterProfile is a named reusable footer owned by one user.
type FooterProfile struct {
	UserID    string       `json:"userId" bson:"user_id"`
	FooterID  string       `json:"footerId" bson:"footer_id"`
	Name      string       `json:"name" bson:"name"`
	Footer    FooterFields `json:"footer" bson:"footer"`
	CreatedAt string       `json:"createdAt,omitempty" bson:"created_at,omitempty"`
	UpdatedAt string       `json:"updatedAt,omitempty" bson:"updated_at,omitempty"`
}

type footerDoc struct {
	ID        string       `bson:"_id"`
	UserID    string       `bson:"user_id"`
	FooterID  string       `bson:"footer_id"`
	Name      string       `bson:"name"`
	Footer    FooterFields `bson:"footer"`
	CreatedAt string       `bson:"created_at,omitempty"`
	UpdatedAt string       `bson:"updated_at,omitempty"`
}

func footerDocID(userID, footerID string) string {
	return userID + ":" + footerID
}

func (f FooterProfile) toDoc() footerDoc {
	return footerDoc{
		ID:        footerDocID(f.UserID, f.FooterID),
		UserID:    f.UserID,
		FooterID:  f.FooterID,
		Name:      f.Name,
		Footer:    f.Footer,
		CreatedAt: f.CreatedAt,
		UpdatedAt: f.UpdatedAt,
	}
}

func (d footerDoc) toProfile() FooterProfile {
	return FooterProfile{
		UserID:    d.UserID,
		FooterID:  d.FooterID,
		Name:      d.Name,
		Footer:    d.Footer,
		CreatedAt: d.CreatedAt,
		UpdatedAt: d.UpdatedAt,
	}
}

type epamSeriesTreeItem struct {
	EpamID        string `json:"epamId"`
	Title         string `json:"title"`
	FileName      string `json:"fileName,omitempty"`
	Series        string `json:"series,omitempty"`
	SeriesChapter string `json:"seriesChapter,omitempty"`
	UpdatedAt     string `json:"updatedAt,omitempty"`
}

type epamSeriesTreeChapter struct {
	Name  string              `json:"name"`
	Items []epamSeriesTreeItem `json:"items"`
}

type epamSeriesTreeNode struct {
	Name     string                  `json:"name"`
	Chapters []epamSeriesTreeChapter `json:"chapters"`
}

type epamSeriesTreeResponse struct {
	Count  int                  `json:"count"`
	Series []epamSeriesTreeNode `json:"series"`
}

func pamphletNow() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func pamphletBodyRelPath(userID, epamID string) string {
	return fmt.Sprintf("pamphlet/%s/%s.epam", userID, epamID)
}

func pamphletRecycleRelPath(userID, epamID string) string {
	return fmt.Sprintf("pamphlet/%s/recycle-bin/%s.epam", userID, epamID)
}

func normalizeFooterFields(f FooterFields) FooterFields {
	ensure := func(label, def string) string {
		t := strings.TrimSpace(label)
		if t == "" {
			return def
		}
		if !strings.HasSuffix(t, ":") {
			t += ":"
		}
		return t
	}
	f.Label1 = ensure(f.Label1, pamphletDefaultFooterL1)
	f.Label2 = ensure(f.Label2, pamphletDefaultFooterL2)
	f.Label3 = ensure(f.Label3, pamphletDefaultFooterL3)
	f.Label4 = ensure(f.Label4, pamphletDefaultFooterL4)
	return f
}

func (f FooterFields) asMap() map[string]any {
	return map[string]any{
		"action": f.Action, "message": f.Message,
		"label1": f.Label1, "value1": f.Value1,
		"label2": f.Label2, "value2": f.Value2,
		"label3": f.Label3, "value3": f.Value3,
		"label4": f.Label4, "value4": f.Value4,
	}
}

func stringFromAny(v any) string {
	if s, ok := v.(string); ok {
		return strings.TrimSpace(s)
	}
	return ""
}

func syncEpamMetaFromHeader(rec *EpamRecord) {
	if rec == nil || rec.Body == nil {
		return
	}
	header, ok := rec.Body["header"].(map[string]any)
	if !ok {
		return
	}
	if t := stringFromAny(header["title"]); t != "" {
		rec.Title = t
	}
	if s := stringFromAny(header["series"]); s != "" {
		rec.Series = s
	}
	if c := stringFromAny(header["series_chapter"]); c != "" {
		rec.SeriesChapter = c
	}
	if a := stringFromAny(header["author"]); a != "" {
		rec.Author = a
	}
	if d := stringFromAny(header["date"]); d != "" {
		rec.Date = d
	}
}

func buildEpamSeriesTree(records []EpamRecord) epamSeriesTreeResponse {
	type chapterBucket struct{ items []epamSeriesTreeItem }
	seriesMap := map[string]map[string]*chapterBucket{}
	seriesKey := func(raw string) string {
		s := strings.TrimSpace(raw)
		if s == "" {
			return pamphletUnassignedSeries
		}
		return s
	}
	chapterKey := func(raw string) string {
		s := strings.TrimSpace(raw)
		if s == "" {
			return pamphletUnassignedChapter
		}
		return s
	}
	for _, rec := range records {
		sk, ck := seriesKey(rec.Series), chapterKey(rec.SeriesChapter)
		if seriesMap[sk] == nil {
			seriesMap[sk] = map[string]*chapterBucket{}
		}
		if seriesMap[sk][ck] == nil {
			seriesMap[sk][ck] = &chapterBucket{}
		}
		title := strings.TrimSpace(rec.Title)
		if title == "" {
			title = strings.TrimSpace(rec.FileName)
		}
		if title == "" {
			title = rec.EpamID
		}
		seriesMap[sk][ck].items = append(seriesMap[sk][ck].items, epamSeriesTreeItem{
			EpamID: rec.EpamID, Title: title, FileName: rec.FileName,
			Series: rec.Series, SeriesChapter: rec.SeriesChapter, UpdatedAt: rec.UpdatedAt,
		})
	}
	names := make([]string, 0, len(seriesMap))
	for n := range seriesMap {
		names = append(names, n)
	}
	sort.Strings(names)
	out := make([]epamSeriesTreeNode, 0, len(names))
	total := 0
	for _, sName := range names {
		chaptersMap := seriesMap[sName]
		cNames := make([]string, 0, len(chaptersMap))
		for n := range chaptersMap {
			cNames = append(cNames, n)
		}
		sort.Strings(cNames)
		chapters := make([]epamSeriesTreeChapter, 0, len(cNames))
		for _, cName := range cNames {
			items := chaptersMap[cName].items
			sort.SliceStable(items, func(i, j int) bool {
				if items[i].Title != items[j].Title {
					return items[i].Title < items[j].Title
				}
				return items[i].EpamID < items[j].EpamID
			})
			total += len(items)
			chapters = append(chapters, epamSeriesTreeChapter{Name: cName, Items: items})
		}
		out = append(out, epamSeriesTreeNode{Name: sName, Chapters: chapters})
	}
	return epamSeriesTreeResponse{Count: total, Series: out}
}

func nextEpamCopyTitle(sourceTitle string, existingTitles []string) string {
	base := strings.TrimSpace(sourceTitle)
	if base == "" {
		base = "Untitled pamphlet"
	}
	used := make(map[string]struct{}, len(existingTitles)+1)
	for _, t := range existingTitles {
		used[strings.TrimSpace(t)] = struct{}{}
	}
	for n := 1; ; n++ {
		candidate := fmt.Sprintf("%s_%d", base, n)
		if _, taken := used[candidate]; !taken {
			return candidate
		}
	}
}

func sanitizeEpamFileName(title string) string {
	s := strings.TrimSpace(title)
	s = strings.ReplaceAll(s, "/", "_")
	s = strings.ReplaceAll(s, "\\", "_")
	if s == "" {
		s = "pamphlet"
	}
	if !strings.HasSuffix(strings.ToLower(s), ".epam") {
		s += ".epam"
	}
	return s
}
