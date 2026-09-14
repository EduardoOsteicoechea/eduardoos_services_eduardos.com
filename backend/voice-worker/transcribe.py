#!/usr/bin/env python3
"""Transcribe a WAV with the same Vosk model the live worker uses.

Handy for A/B-testing model quality: record the same sentence, run it through
the "small" model and a larger one, and compare the output.

Usage:
    python transcribe.py --wav sample.wav [--lang es]

Environment:
    VOICE_STT_MODEL_ES / VOICE_STT_MODEL_EN  explicit model dir (wins)
    VOICE_STT_MODELS_DIR                     base dir to search (default: ./models)

Vosk needs 16 kHz mono 16-bit PCM. Convert any input first:
    ffmpeg -i input.m4a -ar 16000 -ac 1 -c:a pcm_s16le sample.wav
"""

from __future__ import annotations

import argparse
import json
import os
import wave
from pathlib import Path


def log(msg: str) -> None:
    print(msg, flush=True)


def model_path_for(lang: str) -> Path | None:
    env_key = "VOICE_STT_MODEL_EN" if lang.startswith("en") else "VOICE_STT_MODEL_ES"
    explicit = (os.environ.get(env_key) or "").strip()
    if explicit:
        path = Path(explicit).expanduser()
        if path.is_dir():
            return path
        log(f"WARN model path missing for {lang}: {path}")
        return None
    base = Path(os.environ.get("VOICE_STT_MODELS_DIR") or (Path(__file__).resolve().parent / "models"))
    suffix = "en" if lang.startswith("en") else "es"
    candidates = [c for c in sorted(base.glob(f"vosk-model-*{suffix}*")) if c.is_dir()]
    for candidate in candidates:
        if "small" not in candidate.name:
            return candidate
    return candidates[0] if candidates else None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wav", required=True)
    parser.add_argument("--lang", default="es")
    args = parser.parse_args()

    try:
        from vosk import KaldiRecognizer, Model, SetLogLevel
    except Exception as exc:  # noqa: BLE001
        log(f"vosk is required (pip install vosk): {exc}")
        return 1
    SetLogLevel(-1)

    model_dir = model_path_for(args.lang)
    if model_dir is None:
        log(f"no model for lang={args.lang}; set VOICE_STT_MODEL_ES/EN or VOICE_STT_MODELS_DIR")
        return 2

    with wave.open(args.wav, "rb") as wav:
        rate = wav.getframerate()
        channels = wav.getnchannels()
        width = wav.getsampwidth()
        frames = wav.readframes(wav.getnframes())

    log(f"model={model_dir.name} lang={args.lang} wav={rate}Hz ch={channels} width={width} bytes={len(frames)}")
    if rate != 16000 or channels != 1 or width != 2:
        log("WARN: Vosk wants 16 kHz mono 16-bit. Convert with:")
        log("  ffmpeg -i input -ar 16000 -ac 1 -c:a pcm_s16le out.wav")

    recognizer = KaldiRecognizer(Model(str(model_dir)), 16000)
    recognizer.AcceptWaveform(frames)
    text = json.loads(recognizer.FinalResult()).get("text", "")
    log(f"TRANSCRIPT: {text}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
