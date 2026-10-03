package main

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"
)

const (
	homescoolProgressDefaultStudent  = "default"
	homescoolProgressMaxPhotos       = 8
	homescoolProgressOCRSystem       = `You read completed Homescool / eoschool study-work photos. Transcribe only visible student work. Return ONLY JSON: {"rawText":"...","blocks":[{"kind":"answer","label":"...","text":"...","illegible":false}],"mcq":[{"n":1,"selectedKey":"A","selectedText":"...","illegible":false}],"write":[{"n":1,"text":"...","illegible":false}]}. Do not invent text.`
	homescoolProgressInterpretSystem = `You are a careful Homescool teacher. Using the lesson document and OCR transcription, return ONLY JSON: {"interpretedAnswers":[{"n":1,"type":"mcq","prompt":"...","studentSaid":"...","assessment":"...","ok":true}],"summary":"...","strengths":["..."],"weaknesses":["..."],"teacherSuggestions":["..."],"score":{"value":1,"scale":10,"rationale":"..."}}. Score only evidence in the supplied text.`
)

var homescoolProgressJSONFence = regexp.MustCompile("(?s)```(?:json)?\\s*(.*?)\\s*```")

type HomescoolProgressExtractionBlock struct {
	Kind      string `json:"kind" bson:"kind"`
	Label     string `json:"label" bson:"label"`
	Text      string `json:"text" bson:"text"`
	Illegible bool   `json:"illegible" bson:"illegible"`
}
type HomescoolProgressExtraction struct {
	RawText string                             `json:"rawText" bson:"raw_text"`
	Blocks  []HomescoolProgressExtractionBlock `json:"blocks" bson:"blocks"`
	MCQ     []homescoolRevisionMCQExtract      `json:"mcq" bson:"mcq"`
	Write   []homescoolRevisionWriteExtract    `json:"write" bson:"write"`
}
type HomescoolProgressPhoto struct {
	ID          string                      `json:"id" bson:"id"`
	StorageName string                      `json:"storageName" bson:"storage_name"`
	ThumbName   string                      `json:"thumbName" bson:"thumb_name"`
	ContentType string                      `json:"contentType" bson:"content_type"`
	Bytes       int64                       `json:"bytes" bson:"bytes"`
	CreatedAt   time.Time                   `json:"createdAt" bson:"created_at"`
	Extraction  HomescoolProgressExtraction `json:"extraction" bson:"extraction"`
	Status      string                      `json:"status" bson:"status"`
	URL         string                      `json:"url,omitempty" bson:"-"`
	ThumbURL    string                      `json:"thumbUrl,omitempty" bson:"-"`
}
type HomescoolProgressAnswer struct {
	N           int    `json:"n" bson:"n"`
	Type        string `json:"type" bson:"type"`
	Prompt      string `json:"prompt" bson:"prompt"`
	StudentSaid string `json:"studentSaid" bson:"student_said"`
	Assessment  string `json:"assessment" bson:"assessment"`
	OK          bool   `json:"ok" bson:"ok"`
}
type HomescoolProgressStudyState struct {
	InterpretedAnswers []HomescoolProgressAnswer `json:"interpretedAnswers" bson:"interpreted_answers"`
	Summary            string                    `json:"summary" bson:"summary"`
	Strengths          []string                  `json:"strengths" bson:"strengths"`
	Weaknesses         []string                  `json:"weaknesses" bson:"weaknesses"`
	TeacherSuggestions []string                  `json:"teacherSuggestions" bson:"teacher_suggestions"`
}
type HomescoolProgressScore struct {
	Value     float64 `json:"value" bson:"value"`
	Scale     float64 `json:"scale" bson:"scale"`
	Rationale string  `json:"rationale" bson:"rationale"`
}
type HomescoolProgress struct {
	ID          string                      `json:"id" bson:"_id"`
	OwnerUserID string                      `json:"ownerUserId" bson:"owner_user_id"`
	StudentKey  string                      `json:"studentKey" bson:"student_key"`
	Cycle       int                         `json:"cycle" bson:"cycle"`
	Week        int                         `json:"week" bson:"week"`
	Day         int                         `json:"day" bson:"day"`
	Subject     string                      `json:"subject" bson:"subject"`
	CellKey     string                      `json:"cellKey" bson:"cell_key"`
	MaterialID  string                      `json:"materialId,omitempty" bson:"material_id,omitempty"`
	Photos      []HomescoolProgressPhoto    `json:"photos" bson:"photos"`
	StudyState  HomescoolProgressStudyState `json:"studyState" bson:"study_state"`
	Score       HomescoolProgressScore      `json:"score" bson:"score"`
	UpdatedAt   time.Time                   `json:"updatedAt" bson:"updated_at"`
	CreatedAt   time.Time                   `json:"createdAt" bson:"created_at"`
}

func parseHomescoolProgressExtraction(raw string) (HomescoolProgressExtraction, error) {
	var out HomescoolProgressExtraction
	if err := progressJSON(raw, &out); err != nil {
		return out, err
	}
	return sanitizeHomescoolProgressExtraction(out), nil
}
func parseHomescoolProgressInterpretation(raw string) (HomescoolProgressStudyState, HomescoolProgressScore, error) {
	var payload struct {
		HomescoolProgressStudyState
		Score       json.RawMessage `json:"score"`
		Rationale   string          `json:"rationale"`
	}
	if err := progressJSON(raw, &payload); err != nil {
		return payload.HomescoolProgressStudyState, HomescoolProgressScore{}, err
	}
	score := HomescoolProgressScore{Scale: 10, Rationale: payload.Rationale}
	if len(payload.Score) > 0 {
		var asObj HomescoolProgressScore
		if err := json.Unmarshal(payload.Score, &asObj); err == nil && (asObj.Value != 0 || asObj.Scale != 0 || asObj.Rationale != "") {
			score = asObj
		} else {
			var asNum float64
			if err := json.Unmarshal(payload.Score, &asNum); err == nil {
				score.Value = asNum
			}
		}
	}
	if score.Rationale == "" {
		score.Rationale = payload.Rationale
	}
	return sanitizeHomescoolProgressStudyState(payload.HomescoolProgressStudyState), sanitizeHomescoolProgressScore(score), nil
}
func progressJSON(raw string, out any) error {
	text := strings.TrimSpace(raw)
	if m := homescoolProgressJSONFence.FindStringSubmatch(text); len(m) == 2 {
		text = strings.TrimSpace(m[1])
	}
	start, end := strings.Index(text, "{"), strings.LastIndex(text, "}")
	if start < 0 || end <= start {
		return fmt.Errorf("no json object")
	}
	return json.Unmarshal([]byte(text[start:end+1]), out)
}
func sanitizeHomescoolProgressExtraction(in HomescoolProgressExtraction) HomescoolProgressExtraction {
	in.RawText = sanitizeModelTextMax(in.RawText, 12000)
	if len(in.Blocks) > 40 {
		in.Blocks = in.Blocks[:40]
	}
	for i := range in.Blocks {
		in.Blocks[i].Kind = sanitizeModelTextMax(in.Blocks[i].Kind, 40)
		in.Blocks[i].Label = sanitizeModelTextMax(in.Blocks[i].Label, 200)
		in.Blocks[i].Text = sanitizeModelTextMax(in.Blocks[i].Text, 2000)
	}
	in.MCQ = sanitizeHomescoolRevisionExtraction(homescoolRevisionExtraction{MCQ: in.MCQ, Write: in.Write}).MCQ
	in.Write = sanitizeHomescoolRevisionExtraction(homescoolRevisionExtraction{MCQ: in.MCQ, Write: in.Write}).Write
	return in
}
func sanitizeHomescoolProgressStudyState(in HomescoolProgressStudyState) HomescoolProgressStudyState {
	if len(in.InterpretedAnswers) > 32 {
		in.InterpretedAnswers = in.InterpretedAnswers[:32]
	}
	for i := range in.InterpretedAnswers {
		a := &in.InterpretedAnswers[i]
		a.Type = sanitizeModelTextMax(a.Type, 40)
		a.Prompt = sanitizeModelTextMax(a.Prompt, 500)
		a.StudentSaid = sanitizeModelTextMax(a.StudentSaid, 2000)
		a.Assessment = sanitizeModelTextMax(a.Assessment, 1000)
	}
	in.Summary = sanitizeModelTextMax(in.Summary, 2000)
	in.Strengths = sanitizeProgressStrings(in.Strengths)
	in.Weaknesses = sanitizeProgressStrings(in.Weaknesses)
	in.TeacherSuggestions = sanitizeProgressStrings(in.TeacherSuggestions)
	return in
}
func sanitizeProgressStrings(in []string) []string {
	if len(in) > 12 {
		in = in[:12]
	}
	out := make([]string, 0, len(in))
	for _, v := range in {
		if v = sanitizeModelTextMax(v, 500); v != "" {
			out = append(out, v)
		}
	}
	return out
}
func sanitizeHomescoolProgressScore(in HomescoolProgressScore) HomescoolProgressScore {
	if in.Scale <= 0 {
		in.Scale = 10
	}
	if in.Scale > 10 {
		in.Scale = 10
	}
	if in.Value < 0 {
		in.Value = 0
	}
	if in.Value > in.Scale {
		in.Value = in.Scale
	}
	in.Rationale = sanitizeModelTextMax(in.Rationale, 1000)
	return in
}
func homescoolProgressCellKey(cycle, week, day int, subject string) string {
	return homescoolRevisionCellKey(cycle, week, day, subject)
}
func homescoolProgressPhotoURL(id string) string {
	return "/api/homescool/progress/photos/" + id + "/file"
}
func homescoolProgressThumbURL(id string) string {
	return "/api/homescool/progress/photos/" + id + "/thumb"
}
