#!/usr/bin/env python3
"""Self-hosted streaming speech-to-text server for the Eduardos agent dock.

The Go API is the only client. It starts a recognition session, POSTs raw
16 kHz mono Int16 PCM chunks, and reads interim/ final text. Vosk keeps the
acoustic models in memory; this process only needs to stay alive.

Run (systemd: eduardoos-voice-stt.service):
    python3 stt_server.py

Environment:
    VOICE_STT_HOST              bind host (default 127.0.0.1)
    VOICE_STT_PORT              bind port (default 8090)
    VOICE_STT_MODEL_ES          path to the Spanish Vosk model
    VOICE_STT_MODEL_EN          path to the English Vosk model
    VOICE_STT_MODELS_DIR        base dir fallback (default: ./models)
    VOICE_STT_SAMPLE_RATE       PCM sample rate (default 16000)
    VOICE_STT_IDLE_SECONDS      drop a session after this idle time (default 120)
    VOICE_STT_MAX_SESSIONS      hard cap on concurrent sessions (default 16)
    VOICE_STT_MAX_CHUNK_BYTES   reject larger chunk bodies (default 1 MiB)
"""

from __future__ import annotations

import json
import os
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

try:
    from vosk import KaldiRecognizer, Model, SetLogLevel
except Exception as exc:  # noqa: BLE001
    raise SystemExit(f"vosk is required (pip install vosk): {exc}") from exc

SAMPLE_RATE = int(os.environ.get("VOICE_STT_SAMPLE_RATE", "16000"))
IDLE_SECONDS = float(os.environ.get("VOICE_STT_IDLE_SECONDS", "120"))
MAX_SESSIONS = int(os.environ.get("VOICE_STT_MAX_SESSIONS", "16"))
MAX_CHUNK_BYTES = int(os.environ.get("VOICE_STT_MAX_CHUNK_BYTES", str(1 << 20)))
HOST = os.environ.get("VOICE_STT_HOST", "127.0.0.1")
PORT = int(os.environ.get("VOICE_STT_PORT", "8090"))

SetLogLevel(-1)


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
    for candidate in sorted(base.glob(f"vosk-model-*{suffix}*")):
        if candidate.is_dir():
            return candidate
    return None


class Recognizer:
    def __init__(self, lang: str, model: Model) -> None:
        self.lang = lang
        self.rec = KaldiRecognizer(model, SAMPLE_RATE)
        self.text = ""
        self.touched = time.time()
        self.lock = threading.Lock()

    def chunk(self, pcm: bytes) -> tuple[str, str]:
        with self.lock:
            self.touched = time.time()
            if self.rec.AcceptWaveform(pcm):
                result = json.loads(self.rec.Result())
                final = str(result.get("text", "")).strip()
                if final:
                    self.text = (self.text + " " + final).strip()
                return "", final
            partial = str(json.loads(self.rec.PartialResult()).get("partial", "")).strip()
            return partial, ""

    def final(self) -> str:
        with self.lock:
            result = json.loads(self.rec.FinalResult())
            final = str(result.get("text", "")).strip()
            if final:
                self.text = (self.text + " " + final).strip()
            return self.text


class Server:
    def __init__(self) -> None:
        self.models: dict[str, Model] = {}
        self.sessions: dict[str, Recognizer] = {}
        self.lock = threading.Lock()

    def model(self, lang: str) -> Model | None:
        with self.lock:
            if lang in self.models:
                return self.models[lang]
        path = model_path_for(lang)
        if path is None:
            return None
        log(f"loading {lang} model from {path}")
        model = Model(str(path))
        with self.lock:
            self.models[lang] = model
        return model

    def start(self, lang: str) -> str | None:
        model = self.model(lang)
        if model is None:
            return None
        session_id = uuid.uuid4().hex
        with self.lock:
            self.gc_locked()
            if len(self.sessions) >= MAX_SESSIONS:
                return None
            self.sessions[session_id] = Recognizer(lang, model)
        return session_id

    def chunk(self, session_id: str, pcm: bytes) -> tuple[str, str] | None:
        with self.lock:
            sess = self.sessions.get(session_id)
        if sess is None:
            return None
        return sess.chunk(pcm)

    def stop(self, session_id: str) -> str | None:
        with self.lock:
            sess = self.sessions.pop(session_id, None)
        if sess is None:
            return None
        return sess.final()

    def cancel(self, session_id: str) -> bool:
        with self.lock:
            return self.sessions.pop(session_id, None) is not None

    def gc_locked(self) -> None:
        now = time.time()
        stale = [sid for sid, sess in self.sessions.items() if now - sess.touched > IDLE_SECONDS]
        for sid in stale:
            self.sessions.pop(sid, None)


SERVER = Server()


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "eduardoos-voice-stt"

    def log_message(self, *_args) -> None:  # noqa: D401
        return

    def _json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self, limit: int) -> bytes:
        length = int(self.headers.get("Content-Length") or "0")
        if length <= 0:
            return b""
        if length > limit:
            raise ValueError("body too large")
        return self.rfile.read(length)

    def do_POST(self) -> None:  # noqa: N802
        parts = [p for p in self.path.split("/") if p]
        try:
            if parts == ["sessions"]:
                self._start()
                return
            if len(parts) == 3 and parts[0] == "sessions" and parts[2] == "chunk":
                self._chunk(parts[1])
                return
            if len(parts) == 3 and parts[0] == "sessions" and parts[2] == "stop":
                self._stop(parts[1])
                return
            if len(parts) == 3 and parts[0] == "sessions" and parts[2] == "cancel":
                self._cancel(parts[1])
                return
            self._json(404, {"error": "not_found"})
        except ValueError:
            self._json(413, {"error": "payload_too_large"})
        except Exception as exc:  # noqa: BLE001
            log(f"ERROR {exc!s}")
            self._json(500, {"error": "internal_error"})

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._json(200, {"status": "ok", "sessions": len(SERVER.sessions)})
            return
        self._json(404, {"error": "not_found"})

    def _start(self) -> None:
        body = self._read_body(4096)
        lang = "es"
        if body:
            try:
                lang = str(json.loads(body).get("lang") or "es")
            except json.JSONDecodeError:
                lang = "es"
        lang = "en" if lang.lower().startswith("en") else "es"
        session_id = SERVER.start(lang)
        if session_id is None:
            self._json(503, {"error": "unavailable"})
            return
        log(f"session start {session_id} lang={lang}")
        self._json(200, {"id": session_id, "lang": lang, "sampleRate": SAMPLE_RATE})

    def _chunk(self, session_id: str) -> None:
        pcm = self._read_body(MAX_CHUNK_BYTES)
        if not pcm:
            self._json(400, {"error": "invalid_request"})
            return
        result = SERVER.chunk(session_id, pcm)
        if result is None:
            self._json(404, {"error": "not_found"})
            return
        partial, final = result
        self._json(200, {"partial": partial, "final": final})

    def _stop(self, session_id: str) -> None:
        self._read_body(4096)
        text = SERVER.stop(session_id)
        if text is None:
            self._json(404, {"error": "not_found"})
            return
        log(f"session stop {session_id} chars={len(text)}")
        self._json(200, {"text": text})

    def _cancel(self, session_id: str) -> None:
        self._read_body(4096)
        self._json(200, {"cancelled": SERVER.cancel(session_id)})


def main() -> int:
    log(f"voice stt listening on http://{HOST}:{PORT} sampleRate={SAMPLE_RATE}")
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
