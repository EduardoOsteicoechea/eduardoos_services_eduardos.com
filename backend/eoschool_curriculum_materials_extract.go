package main

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/ledongthuc/pdf"
)

const (
	eoschoolMaterialExtractOCRSystem = `You read student or teacher curriculum materials for Homescool / eoschool MPPE. Transcribe only visible text, especially handwriting. Return ONLY JSON: {"rawText":"...","cleanText":"...","blocks":[{"kind":"paragraph|heading|handwriting|answer","label":"...","text":"...","illegible":false}]}. Do not invent text.`
	eoschoolMaterialExtractStructSystem = `You structure extracted curriculum material text for Homescool / eoschool MPPE. Clean spelling lightly, keep meaning. Return ONLY JSON: {"rawText":"...","cleanText":"...","blocks":[{"kind":"paragraph|heading|handwriting|answer","label":"...","text":"...","illegible":false}]}. Do not invent content not present in the source.`
	eoschoolMaterialExtractAudioSystem = `You clean a speech-to-text transcript of a student or teacher curriculum audio for Homescool / eoschool MPPE. Fix obvious STT errors, keep meaning. Return ONLY JSON: {"rawText":"...","cleanText":"...","blocks":[{"kind":"paragraph|heading|handwriting|answer","label":"...","text":"...","illegible":false}]}. rawText is the original transcript; cleanText is the cleaned version.`
	eoschoolMaterialExtractMaxTok      = 3000
	eoschoolMaterialExtractRawMax      = 24000
)

var (
	eoschoolMaterialExtractJSONFence = regexp.MustCompile("(?s)```(?:json)?\\s*(.*?)\\s*```")
	eoschoolMaterialXMLTagRe         = regexp.MustCompile(`<[^>]+>`)
	eoschoolMaterialXMLSpaceRe       = regexp.MustCompile(`[ \t\r\n]+`)
)

func extractEoschoolCurriculumDocumentText(data []byte, contentType, storageName string) (string, error) {
	ext := strings.ToLower(pathExt(storageName))
	switch {
	case ext == ".txt" || strings.HasPrefix(contentType, "text/plain"):
		return decodePlainTextBytes(data), nil
	case ext == ".pdf" || contentType == "application/pdf":
		return extractPDFText(data)
	case ext == ".docx" || strings.Contains(contentType, "wordprocessingml"):
		return extractZIPXMLText(data, "word/document.xml")
	case ext == ".odt" || strings.Contains(contentType, "opendocument.text"):
		return extractZIPXMLText(data, "content.xml")
	default:
		return "", fmt.Errorf("unsupported document type")
	}
}

func pathExt(name string) string {
	name = strings.TrimSpace(name)
	i := strings.LastIndex(name, ".")
	if i < 0 {
		return ""
	}
	return name[i:]
}

func decodePlainTextBytes(data []byte) string {
	if utf8.Valid(data) {
		return strings.TrimSpace(string(data))
	}
	// Latin-1 fallback
	runes := make([]rune, len(data))
	for i, b := range data {
		runes[i] = rune(b)
	}
	return strings.TrimSpace(string(runes))
}

func extractPDFText(data []byte) (string, error) {
	r, err := pdf.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", err
	}
	var b strings.Builder
	total := r.NumPage()
	for i := 1; i <= total; i++ {
		page := r.Page(i)
		if page.V.IsNull() {
			continue
		}
		text, err := page.GetPlainText(nil)
		if err != nil {
			continue
		}
		text = strings.TrimSpace(text)
		if text == "" {
			continue
		}
		if b.Len() > 0 {
			b.WriteByte('\n')
		}
		b.WriteString(text)
	}
	out := strings.TrimSpace(b.String())
	if out == "" {
		return "", fmt.Errorf("no_text_in_document")
	}
	return out, nil
}

func extractZIPXMLText(data []byte, entry string) (string, error) {
	zr, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return "", err
	}
	var target *zip.File
	for _, f := range zr.File {
		if f.Name == entry {
			target = f
			break
		}
	}
	if target == nil {
		return "", fmt.Errorf("missing zip entry %s", entry)
	}
	rc, err := target.Open()
	if err != nil {
		return "", err
	}
	defer rc.Close()
	raw, err := io.ReadAll(io.LimitReader(rc, eoschoolCurriculumMaterialMaxBytes+1))
	if err != nil {
		return "", err
	}
	text := stripXMLToText(string(raw))
	if text == "" {
		return "", fmt.Errorf("no_text_in_document")
	}
	return text, nil
}

func stripXMLToText(raw string) string {
	// Preserve paragraph breaks roughly.
	raw = strings.ReplaceAll(raw, "</w:p>", "\n")
	raw = strings.ReplaceAll(raw, "</text:p>", "\n")
	raw = strings.ReplaceAll(raw, "<text:line-break/>", "\n")
	raw = strings.ReplaceAll(raw, "<w:br/>", "\n")
	raw = eoschoolMaterialXMLTagRe.ReplaceAllString(raw, " ")
	raw = strings.ReplaceAll(raw, "&amp;", "&")
	raw = strings.ReplaceAll(raw, "&lt;", "<")
	raw = strings.ReplaceAll(raw, "&gt;", ">")
	raw = strings.ReplaceAll(raw, "&quot;", "\"")
	raw = strings.ReplaceAll(raw, "&apos;", "'")
	raw = eoschoolMaterialXMLSpaceRe.ReplaceAllString(raw, " ")
	lines := strings.Split(raw, "\n")
	var out []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			out = append(out, line)
		}
	}
	return strings.TrimSpace(strings.Join(out, "\n"))
}

func parseEoschoolMaterialExtractionJSON(raw string) (EoschoolMaterialExtraction, error) {
	var payload struct {
		RawText   string                           `json:"rawText"`
		CleanText string                           `json:"cleanText"`
		Blocks    []EoschoolMaterialExtractionBlock `json:"blocks"`
	}
	text := strings.TrimSpace(raw)
	if m := eoschoolMaterialExtractJSONFence.FindStringSubmatch(text); len(m) == 2 {
		text = strings.TrimSpace(m[1])
	}
	start, end := strings.Index(text, "{"), strings.LastIndex(text, "}")
	if start < 0 || end <= start {
		return EoschoolMaterialExtraction{}, fmt.Errorf("no json object")
	}
	if err := json.Unmarshal([]byte(text[start:end+1]), &payload); err != nil {
		return EoschoolMaterialExtraction{}, err
	}
	out := EoschoolMaterialExtraction{
		Status:    eoschoolMaterialExtractionStatusReady,
		RawText:   payload.RawText,
		CleanText: payload.CleanText,
		Blocks:    payload.Blocks,
	}
	return sanitizeEoschoolMaterialExtraction(out), nil
}

func sanitizeEoschoolMaterialExtraction(in EoschoolMaterialExtraction) EoschoolMaterialExtraction {
	in.Status = strings.TrimSpace(in.Status)
	if in.Status == "" {
		in.Status = eoschoolMaterialExtractionStatusReady
	}
	in.SourceKind = sanitizeModelTextMax(in.SourceKind, 40)
	in.RawText = sanitizeModelTextMax(in.RawText, eoschoolMaterialExtractRawMax)
	in.CleanText = sanitizeModelTextMax(in.CleanText, eoschoolMaterialExtractRawMax)
	in.Provider = sanitizeModelTextMax(in.Provider, 40)
	in.Model = sanitizeModelTextMax(in.Model, 80)
	in.Message = sanitizeModelTextMax(in.Message, 500)
	if len(in.Blocks) > 80 {
		in.Blocks = in.Blocks[:80]
	}
	for i := range in.Blocks {
		in.Blocks[i].Kind = sanitizeModelTextMax(in.Blocks[i].Kind, 40)
		in.Blocks[i].Label = sanitizeModelTextMax(in.Blocks[i].Label, 200)
		in.Blocks[i].Text = sanitizeModelTextMax(in.Blocks[i].Text, 4000)
	}
	return in
}

func failedEoschoolMaterialExtraction(sourceKind, message string) EoschoolMaterialExtraction {
	return EoschoolMaterialExtraction{
		Status:     eoschoolMaterialExtractionStatusFailed,
		SourceKind: sourceKind,
		Message:    sanitizeModelTextMax(message, 500),
	}
}
