package main

import (
	"bytes"
	"encoding/binary"
	"errors"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"os"
	"path/filepath"
	"strings"
)

var errAvatarInvalid = errors.New("invalid avatar")
var errAvatarTooLarge = errors.New("avatar too large")

type avatarKind struct {
	ext  string
	mime string
}

func detectAvatar(data []byte) (avatarKind, error) {
	if len(data) > maxAvatarBytes {
		return avatarKind{}, errAvatarTooLarge
	}
	if len(data) < 12 {
		return avatarKind{}, errAvatarInvalid
	}
	lower := bytes.ToLower(data[:min(512, len(data))])
	if bytes.HasPrefix(data, []byte("GIF87a")) || bytes.HasPrefix(data, []byte("GIF89a")) {
		return avatarKind{}, errAvatarInvalid
	}
	if bytes.Contains(lower, []byte("<svg")) || bytes.Contains(lower, []byte("<?xml")) {
		return avatarKind{}, errAvatarInvalid
	}
	if bytes.Contains(lower, []byte("<html")) || bytes.Contains(lower, []byte("<!doctype html")) || bytes.Contains(lower, []byte("<script")) {
		return avatarKind{}, errAvatarInvalid
	}

	kind, err := sniffImage(data)
	if err != nil {
		return avatarKind{}, err
	}

	cfg, err := decodeConfig(data, kind.mime)
	if err != nil {
		return avatarKind{}, errAvatarInvalid
	}
	if cfg.Width <= 0 || cfg.Height <= 0 || cfg.Width > maxAvatarEdge || cfg.Height > maxAvatarEdge {
		return avatarKind{}, errAvatarTooLarge
	}
	return kind, nil
}

func sniffImage(data []byte) (avatarKind, error) {
	if bytes.HasPrefix(data, []byte{0xff, 0xd8, 0xff}) {
		return avatarKind{ext: ".jpg", mime: "image/jpeg"}, nil
	}
	if bytes.HasPrefix(data, []byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}) {
		return avatarKind{ext: ".png", mime: "image/png"}, nil
	}
	if len(data) >= 12 && bytes.Equal(data[:4], []byte("RIFF")) && bytes.Equal(data[8:12], []byte("WEBP")) {
		return avatarKind{ext: ".webp", mime: "image/webp"}, nil
	}
	return avatarKind{}, errAvatarInvalid
}

func decodeConfig(data []byte, mime string) (image.Config, error) {
	if mime == "image/webp" {
		return webpConfig(data)
	}
	cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
	return cfg, err
}

func webpConfig(data []byte) (image.Config, error) {
	if len(data) < 30 {
		return image.Config{}, errAvatarInvalid
	}
	switch {
	case bytes.Equal(data[12:16], []byte("VP8X")):
		w := int(uint32(data[24])|uint32(data[25])<<8|uint32(data[26])<<16) + 1
		h := int(uint32(data[27])|uint32(data[28])<<8|uint32(data[29])<<16) + 1
		return image.Config{Width: w, Height: h}, nil
	case bytes.Equal(data[12:16], []byte("VP8L")):
		if len(data) < 25 || data[20] != 0x2f {
			return image.Config{}, errAvatarInvalid
		}
		bits := binary.LittleEndian.Uint32(data[21:25])
		w := int(bits&0x3fff) + 1
		h := int((bits>>14)&0x3fff) + 1
		return image.Config{Width: w, Height: h}, nil
	case bytes.Equal(data[12:16], []byte("VP8 ")):
		if len(data) < 30 || data[23] != 0x9d || data[24] != 0x01 || data[25] != 0x2a {
			return image.Config{}, errAvatarInvalid
		}
		w := int(binary.LittleEndian.Uint16(data[26:28]) & 0x3fff)
		h := int(binary.LittleEndian.Uint16(data[28:30]) & 0x3fff)
		return image.Config{Width: w, Height: h}, nil
	default:
		return image.Config{}, errAvatarInvalid
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func writeAvatarFile(root, relative string, data []byte) error {
	if strings.Contains(relative, "..") || filepath.IsAbs(relative) {
		return errAvatarInvalid
	}
	full := filepath.Join(root, filepath.FromSlash(relative))
	if err := os.MkdirAll(filepath.Dir(full), 0750); err != nil {
		return err
	}
	tmpDir := filepath.Join(root, ".tmp")
	if err := os.MkdirAll(tmpDir, 0750); err != nil {
		return err
	}
	tmp, err := os.CreateTemp(tmpDir, "avatar-")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer func() {
		_ = os.Remove(tmpName)
	}()
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, full)
}

func removeAvatarFile(root, relative string) {
	if relative == "" || strings.Contains(relative, "..") || filepath.IsAbs(relative) {
		return
	}
	_ = os.Remove(filepath.Join(root, filepath.FromSlash(relative)))
}
