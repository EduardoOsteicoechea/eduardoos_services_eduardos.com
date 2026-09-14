# 005 — Global voice (streaming STT + spoken replies)

Site: `eduardoos.com`. Contract: [`.cursor/rules/ai-agents.mdc`](../../../.cursor/rules/ai-agents.mdc).

## Purpose

A mic button in the global agent dock (`#agent-sidebar`) lets a visitor speak a
question. Audio is streamed to a self-hosted speech-to-text worker for live
transcription; the finalized text runs through the existing `/api/chat`
pipeline, and the assistant's reply is spoken back sentence-by-sentence while
it is still being generated. English and Spanish are supported.

## Decisions

1. **STT**: self-hosted Vosk streaming worker on the VPS (no cloud STT key).
2. **TTS**: the existing self-hosted Piper toolchain, synthesized one sentence
   at a time so playback starts early.
3. **Transport**: browser → Go uploads ~256 ms PCM chunks; Go → browser streams
   text + base64 MP3 over the existing SSE chat response. No new Go deps.
4. **Audio capture**: `AudioWorklet` downmixes to 16 kHz mono Int16 PCM.
5. **Feature flag**: entirely off unless `VOICE_ENABLED=true`; when off, the
   routes are not registered (404) and the mic UI stays hidden.

## Backend

### Interfaces (`backend/voice.go`)

- `STTEngine` / `STTSession`: `Start`, `Write`, `Close`, `Cancel`.
- `TTSEngine`: `Synthesize(text, lang) (mp3, mime, error)`.
- Implementations: `fakeSTTEngine` / `fakeTTSEngine` (tests and local dev),
  `httpSTTEngine` (loopback worker), `piperTTSEngine` (spawns `speak.py`).
- `voiceManager`: in-memory sessions with idle sweep, session age cap, and a
  global concurrency cap. `voiceSentenceStreamer` splits streamed chat text into
  sentences at `. ! ? \n` (decimal points are preserved) and force-splits
  run-on sentences at ~600 runes.

### Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/voice/config` | `{enabled, sampleRate, langs, defaultLang}` (404 when off) |
| POST | `/api/voice/stream` | start a session → `{streamId, lang, sampleRate}` |
| POST | `/api/voice/stream/{id}/chunk` | raw PCM (`application/octet-stream`) → `{partial, final, text}` |
| POST | `/api/voice/stream/{id}/stop` | flush and close → `{text}` |
| POST | `/api/voice/stream/{id}/cancel` | discard a session |
| POST | `/api/voice/speak` | standalone TTS → `audio/mpeg` |

`POST /api/chat` accepts `speak: true` and `lang`. When voice is enabled it
emits the usual `{delta}` events plus `{type:"audio", seq, mime, data}` events.

### Security

- Same origin + CSRF checks as chat (`requireUnsafe`).
- Per-IP and per-user rate limits for stream starts and speak calls.
- Chunk byte cap, session duration cap, idle sweep, concurrency cap.
- Audio, transcripts, and temp files are never logged; errors map to safe
  codes. No provider/worker detail reaches the browser. Keys stay server-side.

## Diagnostics

Follows [`error-observability.mdc`](../../../.cursor/rules/error-observability.mdc).

- Every `/api/voice/*` request gets the standard request log (request id,
  method, route, status, duration, user, source IP) from `withObservability`.
- With `MUST_LOG=true`, the Go API logs per-step voice events (`voice.stream.start`,
  `voice.stream.chunk`, `voice.stream.stop`, `voice.speak`, `voice.chat.audio`)
  with ids, byte/rune **counts**, and latency — never transcripts or audio.
- Worker failures are logged at error with a redacted cause (`voice.stream.chunk_failed`,
  `voice.speak_failed`, `voice.chat.audio_failed`) and surfaced to the client only
  as `internal_error`.
- Always-on audits: `voice_stream` started/stopped/rate_limited, `voice_speak` ok/failed.
- Frontend uses the shared `mustLog` gate (`sessionLog`, on in dev or with
  `?debug=1`): `voice.config`, `voice.record.*`, `voice.chunk.*`, `voice.audio.*`,
  `voice.reply.toggle`. Failures still open the global error modal.
- The STT worker logs `REQ method/path/status/duration_ms`, session start/stop,
  and bounded tracebacks; `speak.py` logs per-chunk timing and totals.


## Frontend

- `src/lib/voice.ts`: capture, chunk upload, live captions, playback queue,
  reply mute toggle.
- `public/voice-pcm-worklet.js`: Float32 → Int16 PCM worklet.
- `src/lib/api.ts`: `getVoiceConfig`, `startVoiceStream`, `postVoiceChunk`,
  `stopVoiceStream`, `cancelVoiceStream`; SSE parser forwards audio events.
- `src/lib/chat.ts`: `submitAgentChatMessage(text)` and spoken-reply wiring.
- `src/layouts/Layout.astro`: mic, speaker toggle, live-caption element.

## Workers

- `backend/voice-worker/stt_server.py`: Vosk HTTP service on `127.0.0.1:8090`,
  one recognizer per session, models loaded once. Unit template:
  `backend/systemd/eduardoos-voice-stt.service`.
- `backend/voice-worker/stt_server_whisper.py`: optional faster-whisper engine
  (higher accuracy, heavier). Same HTTP protocol on `127.0.0.1:8091`, so
  switching engines is only `VOICE_STT_URL` + restart — no Go or frontend
  changes. Defaults to `VOICE_WHISPER_MODE=batch`: record all PCM, transcribe
  once on stop (best accuracy and no O(n²) re-transcription on weak CPUs).
  Unit template: `backend/systemd/eduardoos-voice-whisper.service`; provision
  with `setup-whisper.sh` / `requirements-whisper.txt`.
- `backend/voice-worker/speak.py`: Piper + ffmpeg sentence synthesizer. Use the
  native Piper binary (`install-piper.sh`); the pip `piper-tts` package often
  fails to import on newer Pythons. Voices come from `rhasspy/piper-voices`
  (`download-piper-voice.sh`), e.g. Mexican Spanish male `es_MX-ald-medium`
  (`es_MX-claude-high` is female). Speaking rate via `VOICE_PIPER_LENGTH_SCALE`
  (<1 is faster; `0.8` = 1.25x).
- Models and the worker scripts are provisioned on the VPS manually (like the
  eVoice worker); deploy does not ship them.

## Configuration

See `backend/.env.example` for the full list. Key names: `VOICE_ENABLED`,
`VOICE_STT_URL`, `VOICE_STT_LANG_DEFAULT`, `VOICE_PYTHON`, `VOICE_TTS_SCRIPT`,
`VOICE_PIPER_MODEL_ES`, `VOICE_PIPER_MODEL_EN`, `VOICE_MAX_CHUNK_BYTES`,
`VOICE_MAX_SESSION_SECONDS`, `VOICE_MAX_CONCURRENT`, `VOICE_FAKE_STT`,
`VOICE_FAKE_TTS`.

Local development can run the whole feature with `VOICE_ENABLED=true`,
`VOICE_FAKE_STT=true`, `VOICE_FAKE_TTS=true` and no workers/models.

## Spanish Piper voices (self-hosted)

Piper has no high-quality Latin-American male voice. Options from
`rhasspy/piper-voices` (install with `download-piper-voice.sh`):

| Voice | Locale | Gender | Quality |
| --- | --- | --- | --- |
| `es_MX-claude-high` | es_MX | female | high |
| `es_MX-ald-medium` | es_MX | male | medium |
| `es_ES-davefx-medium` | es_ES | male | medium |
| `es_ES-sharvard-medium` | es_ES | male | medium |
| `es_ES-carlfm-x_low` | es_ES | male | x_low |

For a natural Latino male voice, use a cloud TTS provider or Coqui XTTS
instead of Piper. Speaking rate is `VOICE_PIPER_LENGTH_SCALE` (`0.8` = 1.25x).

## Tests

- Go (`go test ./...`): session lifecycle, concurrency cap, disabled-route 404,
  CSRF, end-to-end fake stream, speak, sentence splitting, lang normalization.
- Frontend (`npm test`): voice module capture/submit/playback, hidden mic when
  disabled, chat audio forwarding.
