#!/usr/bin/env python3
"""faster-whisper streaming speech-to-text worker (alternative to stt_server.py).

Drop-in replacement: speaks the exact same HTTP API the Go `httpSTTEngine`
already calls, so switching is only `VOICE_STT_URL` + restart:

    POST /sessions                     -> {"id": "...", "lang": "es", "sampleRate": 16000}
    POST /sessions/{id}/chunk          -> {"partial": "...", "final": ""}
    POST /sessions/{id}/stop           -> {"text": "<full transcript>"}
    POST /sessions/{id}/cancel         -> {"cancelled": true}
    GET  /health                       -> {"status": "ok", "sessions": N}

Whisper is not natively streaming; this worker buffers 16 kHz mono PCM and
re-runs transcription every VOICE_WHISPER_STEP_SECONDS, returning the current
text as a partial hypothesis. On stop it returns the final full transcript.
The Go session accumulates finals, so this worker emits final="" until stop,
which yields exactly one transcript with no duplication.

Run (systemd template: eduardoos-voice-whisper.service):
    python3 stt_server_whisper.py

Environment:
    VOICE_STT_HOST               bind host (default 127.0.0.1)
    VOICE_STT_PORT               bind port (default 8091)
    VOICE_STT_IDLE_SECONDS       drop a session after this idle time (default 120)
    VOICE_STT_MAX_SESSIONS       hard cap on concurrent sessions (default 8)
    VOICE_STT_MAX_CHUNK_BYTES    reject larger chunk bodies (default 1 MiB)
    VOICE_WHISPER_MODEL          tiny|base|small|medium|large-v3 (default small)
    VOICE_WHISPER_DEVICE         cpu|cuda (default cpu)
    VOICE_WHISPER_COMPUTE        int8|int8_float16|float16|float32 (default int8)
    VOICE_WHISPER_STEP_SECONDS   re-transcribe cadence while speaking (default 3)
    VOICE_WHISPER_BEAM_SIZE      beam size (default 1)
    VOICE_WHISPER_MAX_SECONDS    cap buffered audio per session (default 120)
    VOICE_WHISPER_PRELOAD        "1" to load the model at startup (default lazy)
"""

from __future__ import annotations

import json
import os
import threading
import time
import traceback
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

try:
    import numpy as np
except Exception as exc:  # noqa: BLE001
    raise SystemExit(f"numpy is required: {exc}") from exc

SAMPLE_RATE = 16000
HOST = os.environ.get("VOICE_STT_HOST", "127.0.0.1")
PORT = int(os.environ.get("VOICE_STT_PORT", "8091"))
IDLE_SECONDS = float(os.environ.get("VOICE_STT_IDLE_SECONDS", "120"))
MAX_SESSIONS = int(os.environ.get("VOICE_STT_MAX_SESSIONS", "8"))
MAX_CHUNK_BYTES = int(os.environ.get("VOICE_STT_MAX_CHUNK_BYTES", str(1 << 20)))

MODEL_SIZE = (os.environ.get("VOICE_WHISPER_MODEL") or "small").strip()
DEVICE = (os.environ.get("VOICE_WHISPER_DEVICE") or "cpu").strip()
COMPUTE = (os.environ.get("VOICE_WHISPER_COMPUTE") or "int8").strip()
STEP_SECONDS = float(os.environ.get("VOICE_WHISPER_STEP_SECONDS", "3"))
BEAM_SIZE = int(os.environ.get("VOICE_WHISPER_BEAM_SIZE", "1"))
MAX_SECONDS = float(os.environ.get("VOICE_WHISPER_MAX_SECONDS", "120"))


def log(msg: str) -> None:
    print(msg, flush=True)


_model = None
_model_lock = threading.Lock()


def get_model():
    global _model
    with _model_lock:
        if _model is None:
            from faster_whisper import WhisperModel

            log(f"loading faster-whisper model={MODEL_SIZE} device={DEVICE} compute={COMPUTE}")
            started = time.time()
            _model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE)
            log(f"model loaded in {int((time.time() - started) * 1000)}ms")
    return _model


class WhisperSession:
    def __init__(self, lang: str) -> None:
        self.lang = lang
        self.audio = np.zeros(0, dtype=np.float32)
        self.text = ""
        self.transcribed_len = 0
        self.touched = time.time()
        self.lock = threading.Lock()

    def _transcribe_locked(self) -> str:
        if len(self.audio) < int(0.3 * SAMPLE_RATE):
            self.text = ""
            return self.text
        model = get_model()
        segments, _info = model.transcribe(
            self.audio,
            language=self.lang,
            beam_size=BEAM_SIZE,
            vad_filter=True,
            condition_on_previous_text=False,
        )
        self.text = " ".join(seg.text.strip() for seg in segments).strip()
        self.transcribed_len = len(self.audio)
        return self.text

    def append(self, pcm: bytes) -> str:
        with self.lock:
            self.touched = time.time()
            if len(pcm) % 2:
                pcm = pcm[:-1]
            samples = np.frombuffer(pcm, dtype="<i2").astype(np.float32) / 32768.0
            if samples.size:
                self.audio = np.concatenate([self.audio, samples])
            cap = int(MAX_SECONDS * SAMPLE_RATE)
            if len(self.audio) > cap:
                self.audio = self.audio[-cap:]
            new_samples = len(self.audio) - self.transcribed_len
            # First quick hypothesis after ~1s, then every STEP_SECONDS.
            if new_samples >= int(STEP_SECONDS * SAMPLE_RATE) or (
                self.text == "" and new_samples >= SAMPLE_RATE
            ):
                self._transcribe_locked()
            return self.text

    def final(self) -> str:
        with self.lock:
            return self._transcribe_locked()


class Server:
    def __init__(self) -> None:
        self.sessions: dict[str, WhisperSession] = {}
        self.lock = threading.Lock()

    def start(self, lang: str) -> str | None:
        session_id = uuid.uuid4().hex
        with self.lock:
            self.gc_locked()
            if len(self.sessions) >= MAX_SESSIONS:
                return None
            self.sessions[session_id] = WhisperSession(lang)
        return session_id

    def append(self, session_id: str, pcm: bytes) -> str | None:
        with self.lock:
            sess = self.sessions.get(session_id)
        if sess is None:
            return None
        return sess.append(pcm)

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
    server_version = "eduardoos-voice-whisper"

    def log_message(self, *_args) -> None:  # noqa: D401
        return

    def _json(self, status: int, payload: dict) -> None:
        self._status = status
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _log_request(self, started: float) -> None:
        log(
            f"REQ method={self.command} path={self.path} "
            f"status={getattr(self, '_status', 0)} "
            f"duration_ms={int((time.time() - started) * 1000)}"
        )

    def _read_body(self, limit: int) -> bytes:
        length = int(self.headers.get("Content-Length") or "0")
        if length <= 0:
            return b""
        if length > limit:
            raise ValueError("body too large")
        return self.rfile.read(length)

    def do_POST(self) -> None:  # noqa: N802
        started = time.time()
        self._status = 0
        try:
            parts = [p for p in self.path.split("/") if p]
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
            log(f"ERROR path={self.path} {exc!s}")
            traceback.print_exc()
            self._json(500, {"error": "internal_error"})
        finally:
            self._log_request(started)

    def do_GET(self) -> None:  # noqa: N802
        started = time.time()
        self._status = 0
        try:
            if self.path == "/health":
                self._json(200, {"status": "ok", "sessions": len(SERVER.sessions)})
                return
            self._json(404, {"error": "not_found"})
        except Exception as exc:  # noqa: BLE001
            log(f"ERROR path={self.path} {exc!s}")
            self._json(500, {"error": "internal_error"})
        finally:
            self._log_request(started)

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
        text = SERVER.append(session_id, pcm)
        if text is None:
            self._json(404, {"error": "not_found"})
            return
        self._json(200, {"partial": text, "final": ""})

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
    log(f"voice whisper stt listening on http://{HOST}:{PORT} sampleRate={SAMPLE_RATE}")
    log(f"model={MODEL_SIZE} device={DEVICE} compute={COMPUTE} step={STEP_SECONDS}s")
    if (os.environ.get("VOICE_WHISPER_PRELOAD") or "").strip() in {"1", "true", "yes", "on"}:
        get_model()
        log("preload ok")
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
