package main

import (
	"bytes"
	"errors"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"strings"

	"github.com/gen2brain/webp"
)

const eoschoolStudentPhotoEdge = 1024

// prepareEoschoolStudentPhoto accepts phone-sized JPEG/PNG/WebP, downscales, and
// returns WebP bytes suitable for the student profile avatar.
func prepareEoschoolStudentPhoto(data []byte) (avatarKind, []byte, error) {
	kind, err := detectHomescoolProgressImage(data)
	if err != nil {
		return avatarKind{}, nil, err
	}
	var src image.Image
	if kind.mime == "image/webp" {
		src, err = webp.Decode(bytes.NewReader(data))
	} else {
		src, _, err = image.Decode(bytes.NewReader(data))
	}
	if err != nil {
		return avatarKind{}, nil, errAvatarInvalid
	}
	out, err := homescoolProgressEncodeWebp(downscaleHomescoolProgressImage(src, eoschoolStudentPhotoEdge))
	if err != nil {
		return avatarKind{}, nil, err
	}
	return avatarKind{ext: ".webp", mime: "image/webp"}, out, nil
}

// hydrateEoschoolCurriculumStudentNames fills first/last/grade/age gaps so a
// photo-only PATCH does not fail validation on legacy seeded docs.
func hydrateEoschoolCurriculumStudentNames(doc *EoschoolCurriculumProgressDoc) {
	if doc == nil {
		return
	}
	first := strings.TrimSpace(doc.FirstName)
	last := strings.TrimSpace(doc.LastName)
	display := strings.TrimSpace(doc.DisplayName)
	if first == "" && display != "" {
		parts := strings.Fields(display)
		if len(parts) > 0 {
			first = parts[0]
		}
		if len(parts) > 1 {
			last = strings.Join(parts[1:], " ")
		}
	}
	if last == "" && display != "" && first != "" {
		rest := strings.TrimSpace(strings.TrimPrefix(display, first))
		if rest != "" {
			last = rest
		}
	}
	if first != "" {
		doc.FirstName = first
	}
	if last != "" {
		doc.LastName = last
	}
	if strings.TrimSpace(doc.DisplayName) == "" {
		doc.DisplayName = eoschoolCurriculumDisplayName(doc.FirstName, doc.LastName)
	}
	if doc.Age == 0 {
		doc.Age = eoschoolCurriculumDefaultAge
	}
	if strings.TrimSpace(doc.Grade) == "" {
		doc.Grade = eoschoolCurriculumDefaultGrade
	}
}

func mapEoschoolStudentPhotoErr(err error) (status int, code string) {
	if errors.Is(err, errAvatarTooLarge) {
		return 413, "payload_too_large"
	}
	if errors.Is(err, errAvatarInvalid) {
		return 400, "unsupported_media"
	}
	return 400, "unsupported_media"
}
