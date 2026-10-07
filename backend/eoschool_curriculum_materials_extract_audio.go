package main

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func curriculumMaterialAudioToPCM16k(data []byte, contentType, storageName string) ([]byte, error) {
	ext := strings.ToLower(pathExt(storageName))
	if ext == ".wav" || contentType == "audio/wav" || contentType == "audio/wave" || contentType == "audio/x-wav" {
		if pcm, err := decodeWAVToPCM16kMono(data); err == nil && len(pcm) > 0 {
			return pcm, nil
		}
	}
	return ffmpegAudioToPCM16kMono(data, ext)
}

func decodeWAVToPCM16kMono(data []byte) ([]byte, error) {
	if len(data) < 44 || !bytes.HasPrefix(data, []byte("RIFF")) || !bytes.Equal(data[8:12], []byte("WAVE")) {
		return nil, fmt.Errorf("not wav")
	}
	var (
		audioFormat   uint16
		numChannels   uint16
		sampleRate    uint32
		bitsPerSample uint16
		pcmData       []byte
	)
	offset := 12
	for offset+8 <= len(data) {
		chunkID := string(data[offset : offset+4])
		chunkSize := int(binary.LittleEndian.Uint32(data[offset+4 : offset+8]))
		offset += 8
		if offset+chunkSize > len(data) {
			return nil, fmt.Errorf("truncated wav chunk")
		}
		chunk := data[offset : offset+chunkSize]
		switch chunkID {
		case "fmt ":
			if len(chunk) < 16 {
				return nil, fmt.Errorf("short fmt")
			}
			audioFormat = binary.LittleEndian.Uint16(chunk[0:2])
			numChannels = binary.LittleEndian.Uint16(chunk[2:4])
			sampleRate = binary.LittleEndian.Uint32(chunk[4:8])
			bitsPerSample = binary.LittleEndian.Uint16(chunk[14:16])
		case "data":
			pcmData = chunk
		}
		offset += chunkSize
		if chunkSize%2 == 1 {
			offset++
		}
	}
	if audioFormat != 1 || bitsPerSample != 16 || numChannels < 1 || len(pcmData) == 0 {
		return nil, fmt.Errorf("unsupported wav format")
	}
	if sampleRate == voiceSampleRate && numChannels == 1 {
		return pcmData, nil
	}
	// Downmix stereo → mono at same rate; resample via ffmpeg if rate differs.
	if sampleRate == voiceSampleRate && numChannels == 2 {
		out := make([]byte, len(pcmData)/2)
		for i := 0; i+3 < len(pcmData); i += 4 {
			l := int16(binary.LittleEndian.Uint16(pcmData[i : i+2]))
			r := int16(binary.LittleEndian.Uint16(pcmData[i+2 : i+4]))
			m := int16((int32(l) + int32(r)) / 2)
			binary.LittleEndian.PutUint16(out[i/2:i/2+2], uint16(m))
		}
		return out, nil
	}
	return ffmpegAudioToPCM16kMono(data, ".wav")
}

func ffmpegAudioToPCM16kMono(data []byte, ext string) ([]byte, error) {
	bin := strings.TrimSpace(os.Getenv("FFMPEG_BIN"))
	if bin == "" {
		bin = "ffmpeg"
	}
	if _, err := exec.LookPath(bin); err != nil {
		return nil, fmt.Errorf("ffmpeg_unavailable")
	}
	tmpDir, err := os.MkdirTemp("", "eoschool-audio-*")
	if err != nil {
		return nil, err
	}
	defer os.RemoveAll(tmpDir)
	if ext == "" {
		ext = ".bin"
	}
	inPath := filepath.Join(tmpDir, "in"+ext)
	outPath := filepath.Join(tmpDir, "out.pcm")
	if err := os.WriteFile(inPath, data, 0o600); err != nil {
		return nil, err
	}
	cmd := exec.Command(bin, "-y", "-i", inPath, "-ac", "1", "-ar", fmt.Sprintf("%d", voiceSampleRate), "-f", "s16le", outPath)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffmpeg_failed")
	}
	pcm, err := os.ReadFile(outPath)
	if err != nil {
		return nil, err
	}
	if len(pcm) == 0 {
		return nil, fmt.Errorf("empty_pcm")
	}
	return pcm, nil
}
