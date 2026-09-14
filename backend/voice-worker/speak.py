#!/usr/bin/env python3
"""Synthesize one spoken sentence to MP3 with Piper (+ ffmpeg).

The Go API shells this out per sentence while the assistant streams its answer,
so playback starts after the first sentence instead of at the end. This mirrors
the eVoice worker's Piper usage.

Usage:
    speak.py --out /tmp/out.mp3 --lang es
    (spoken text is read from stdin)

Environment:
    VOICE_PIPER_BIN          piper binary (default: piper on PATH)
    VOICE_PIPER_MODEL_ES     Spanish .onnx model
    VOICE_PIPER_MODEL_EN     English .onnx model
    VOICE_PIPER_LENGTH_SCALE optional speaking rate (default 1.0)
    FFMPEG_BIN               ffmpeg binary (default: ffmpeg on PATH)
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

CHUNK_CHARS = 800


def log(msg: str) -> None:
    print(msg, flush=True)


def piper_bin() -> str:
    return (os.environ.get("VOICE_PIPER_BIN") or "").strip() or shutil.which("piper") or ""


def ffmpeg_bin() -> str:
    return (os.environ.get("FFMPEG_BIN") or "").strip() or shutil.which("ffmpeg") or ""


def resolve_model(lang: str, model_es: str, model_en: str) -> Path | None:
    want_en = str(lang).lower().startswith("en")
    explicit = model_en if want_en else model_es
    if not explicit:
        explicit = os.environ.get("VOICE_PIPER_MODEL_EN" if want_en else "VOICE_PIPER_MODEL_ES", "")
    explicit = (explicit or "").strip()
    if explicit:
        path = Path(explicit).expanduser()
        if path.is_file():
            return path
        log(f"WARN model missing: {path}")
    return None


def chunk_text(text: str, max_chars: int = CHUNK_CHARS) -> list[str]:
    text = text.strip()
    if not text:
        return []
    parts: list[str] = []
    buf: list[str] = []
    size = 0
    for para in text.replace("\r", "").split("\n"):
        para = para.strip()
        if not para:
            continue
        if size + len(para) + 1 > max_chars and buf:
            parts.append(" ".join(buf))
            buf = [para]
            size = len(para)
        else:
            buf.append(para)
            size += len(para) + 1
    if buf:
        parts.append(" ".join(buf))
    return parts or [text]


def synth_wav(text: str, model: Path, wav_path: Path) -> None:
    binary = piper_bin()
    if not binary:
        raise RuntimeError("piper not found (set VOICE_PIPER_BIN or install piper)")
    resolved = shutil.which(binary) or binary
    piper_dir = Path(resolved).resolve().parent
    env = os.environ.copy()
    # The native piper tarball ships espeak-ng-data next to the binary; run from
    # there so espeak-ng finds it regardless of the API's working directory.
    if (piper_dir / "espeak-ng-data").is_dir():
        env["ESPEAK_DATA_PATH"] = str(piper_dir)
    args = [resolved, "--model", str(model), "--output_file", str(wav_path)]
    length_scale = (os.environ.get("VOICE_PIPER_LENGTH_SCALE") or "").strip()
    if length_scale:
        args += ["--length_scale", length_scale]
    proc = subprocess.run(
        args,
        input=text.encode("utf-8"),
        capture_output=True,
        check=False,
        cwd=str(piper_dir),
        env=env,
    )
    if proc.returncode != 0 or not wav_path.is_file() or wav_path.stat().st_size == 0:
        err = proc.stderr.decode("utf-8", errors="replace") or proc.stdout.decode("utf-8", errors="replace")
        raise RuntimeError(f"piper failed: {err[:300]}")


def wav_to_mp3(wav_path: Path, mp3_path: Path) -> None:
    binary = ffmpeg_bin()
    if not binary:
        raise RuntimeError("ffmpeg not found (set FFMPEG_BIN or install ffmpeg)")
    proc = subprocess.run(
        [binary, "-y", "-i", str(wav_path), "-codec:a", "libmp3lame", "-qscale:a", "4", str(mp3_path)],
        capture_output=True,
        check=False,
    )
    if proc.returncode != 0 or not mp3_path.is_file() or mp3_path.stat().st_size == 0:
        err = proc.stderr.decode("utf-8", errors="replace")[-300:]
        raise RuntimeError(f"ffmpeg failed: {err}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--lang", default="es")
    parser.add_argument("--model-es", default="")
    parser.add_argument("--model-en", default="")
    args = parser.parse_args()

    text = sys.stdin.read()
    if not text.strip():
        log("no text provided")
        return 2

    model = resolve_model(args.lang, args.model_es, args.model_en)
    if model is None:
        log(f"no piper model configured for lang={args.lang}")
        return 3

    args.out.parent.mkdir(parents=True, exist_ok=True)
    chunks = chunk_text(text)
    t0 = time.time()
    log(f"TTS lang={args.lang} chunks={len(chunks)} model={model.name}")

    with tempfile.TemporaryDirectory(prefix="voice-speak-", dir=str(args.out.parent)) as tmp:
        tmp_path = Path(tmp)
        wav_parts: list[Path] = []
        for i, chunk in enumerate(chunks, start=1):
            wav = tmp_path / f"part-{i:04d}.wav"
            step = time.time()
            synth_wav(chunk, model, wav)
            wav_parts.append(wav)
            log(f"TTS chunk {i}/{len(chunks)} chars={len(chunk)} duration_ms={int((time.time() - step) * 1000)}")

        if len(wav_parts) == 1:
            wav_to_mp3(wav_parts[0], args.out)
        else:
            list_file = tmp_path / "concat.txt"
            list_file.write_text(
                "\n".join(f"file '{p.resolve().as_posix()}'" for p in wav_parts),
                encoding="utf-8",
            )
            merged = tmp_path / "merged.wav"
            proc = subprocess.run(
                [ffmpeg_bin(), "-y", "-f", "concat", "-safe", "0", "-i", str(list_file), "-c", "copy", str(merged)],
                capture_output=True,
                check=False,
            )
            if proc.returncode != 0 or not merged.is_file():
                err = proc.stderr.decode("utf-8", errors="replace")[-300:]
                raise RuntimeError(f"ffmpeg concat failed: {err}")
            wav_to_mp3(merged, args.out)

    log(f"ok bytes={args.out.stat().st_size} duration_ms={int((time.time() - t0) * 1000)}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001
        log(f"FAIL {exc!s}")
        print(f"FAIL {exc!s}", file=sys.stderr, flush=True)
        sys.exit(1)
