package main

import (
	"bytes"
	"path"
	"strings"
)

type eoschoolCurriculumFileKind struct {
	kind string
	ext  string
	mime string
}

func detectEoschoolCurriculumUpload(data []byte, filename string) (eoschoolCurriculumFileKind, error) {
	if len(data) == 0 {
		return eoschoolCurriculumFileKind{}, errAvatarInvalid
	}
	if len(data) > eoschoolCurriculumMaterialMaxBytes {
		// Images may be larger before conversion; allow up to progress max for image sniff path.
		if len(data) > homescoolProgressMaxBytes {
			return eoschoolCurriculumFileKind{}, errAvatarTooLarge
		}
	}

	ext := strings.ToLower(path.Ext(strings.TrimSpace(filename)))

	// Prefer image detection (JPEG/PNG/WebP) — may exceed 25 MiB pre-convert.
	if kind, err := sniffImage(data); err == nil {
		cfg, cfgErr := decodeConfig(data, kind.mime)
		if cfgErr != nil || cfg.Width <= 0 || cfg.Height <= 0 ||
			cfg.Width > homescoolProgressMaxSniffEdge || cfg.Height > homescoolProgressMaxSniffEdge {
			return eoschoolCurriculumFileKind{}, errAvatarInvalid
		}
		return eoschoolCurriculumFileKind{
			kind: eoschoolCurriculumMaterialKindImage,
			ext:  ".webp",
			mime: kind.mime,
		}, nil
	}

	if len(data) > eoschoolCurriculumMaterialMaxBytes {
		return eoschoolCurriculumFileKind{}, errAvatarTooLarge
	}

	if k, ok := sniffEoschoolCurriculumAudio(data, ext); ok {
		return k, nil
	}
	if k, ok := sniffEoschoolCurriculumDocument(data, ext); ok {
		return k, nil
	}
	return eoschoolCurriculumFileKind{}, errAvatarInvalid
}

func sniffEoschoolCurriculumAudio(data []byte, ext string) (eoschoolCurriculumFileKind, bool) {
	if len(data) < 12 {
		return eoschoolCurriculumFileKind{}, false
	}
	switch {
	case bytes.HasPrefix(data, []byte("ID3")) || (data[0] == 0xff && (data[1]&0xe0) == 0xe0):
		if ext == "" || ext == ".mp3" || ext == ".mpeg" {
			return eoschoolCurriculumFileKind{kind: eoschoolCurriculumMaterialKindAudio, ext: ".mp3", mime: "audio/mpeg"}, true
		}
	case bytes.HasPrefix(data, []byte("OggS")):
		return eoschoolCurriculumFileKind{kind: eoschoolCurriculumMaterialKindAudio, ext: ".ogg", mime: "audio/ogg"}, true
	case bytes.HasPrefix(data, []byte("RIFF")) && len(data) >= 12 && bytes.Equal(data[8:12], []byte("WAVE")):
		return eoschoolCurriculumFileKind{kind: eoschoolCurriculumMaterialKindAudio, ext: ".wav", mime: "audio/wav"}, true
	case looksLikeMP4(data) && (ext == ".m4a" || ext == ".mp4" || ext == ".aac" || ext == ""):
		return eoschoolCurriculumFileKind{kind: eoschoolCurriculumMaterialKindAudio, ext: ".m4a", mime: "audio/mp4"}, true
	case bytes.HasPrefix(data, []byte{0x1a, 0x45, 0xdf, 0xa3}) && (ext == ".webm" || ext == ""):
		return eoschoolCurriculumFileKind{kind: eoschoolCurriculumMaterialKindAudio, ext: ".webm", mime: "audio/webm"}, true
	}
	return eoschoolCurriculumFileKind{}, false
}

func sniffEoschoolCurriculumDocument(data []byte, ext string) (eoschoolCurriculumFileKind, bool) {
	if len(data) == 0 {
		return eoschoolCurriculumFileKind{}, false
	}
	// Plain text (.txt) — allow UTF-8 / Latin-1 body without magic bytes.
	if ext == ".txt" || looksLikePlainTextDocument(data, ext) {
		return eoschoolCurriculumFileKind{
			kind: eoschoolCurriculumMaterialKindDocument,
			ext:  ".txt",
			mime: "text/plain",
		}, true
	}
	if len(data) < 4 {
		return eoschoolCurriculumFileKind{}, false
	}
	// PDF
	if bytes.HasPrefix(data, []byte("%PDF")) {
		return eoschoolCurriculumFileKind{kind: eoschoolCurriculumMaterialKindDocument, ext: ".pdf", mime: "application/pdf"}, true
	}
	// ZIP-based: DOCX / ODT
	if bytes.HasPrefix(data, []byte("PK\x03\x04")) || bytes.HasPrefix(data, []byte("PK\x05\x06")) {
		switch ext {
		case ".docx":
			return eoschoolCurriculumFileKind{
				kind: eoschoolCurriculumMaterialKindDocument,
				ext:  ".docx",
				mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			}, true
		case ".odt":
			return eoschoolCurriculumFileKind{
				kind: eoschoolCurriculumMaterialKindDocument,
				ext:  ".odt",
				mime: "application/vnd.oasis.opendocument.text",
			}, true
		}
		// Peek for [Content_Types].xml (docx) or mimetype (odt)
		if bytes.Contains(data[:min(4096, len(data))], []byte("[Content_Types].xml")) {
			return eoschoolCurriculumFileKind{
				kind: eoschoolCurriculumMaterialKindDocument,
				ext:  ".docx",
				mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			}, true
		}
		if bytes.Contains(data[:min(4096, len(data))], []byte("mimetypeapplication/vnd.oasis.opendocument.text")) ||
			bytes.Contains(data[:min(4096, len(data))], []byte("application/vnd.oasis.opendocument.text")) {
			return eoschoolCurriculumFileKind{
				kind: eoschoolCurriculumMaterialKindDocument,
				ext:  ".odt",
				mime: "application/vnd.oasis.opendocument.text",
			}, true
		}
	}
	return eoschoolCurriculumFileKind{}, false
}

func looksLikePlainTextDocument(data []byte, ext string) bool {
	if ext != "" && ext != ".txt" {
		return false
	}
	if len(data) == 0 || len(data) > eoschoolCurriculumMaterialMaxBytes {
		return false
	}
	n := min(512, len(data))
	for i := 0; i < n; i++ {
		if data[i] == 0 {
			return false
		}
	}
	return ext == ".txt"
}
