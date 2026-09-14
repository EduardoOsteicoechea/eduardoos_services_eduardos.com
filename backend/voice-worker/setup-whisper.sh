#!/usr/bin/env bash
# Provision the faster-whisper alternative STT worker.
#
# Creates/reuses a venv, installs faster-whisper, and pre-downloads the model.
# Run as deploy (or root that can write the worker dir):
#   sudo -u deploy bash setup-whisper.sh
#
# Env: VOICE_WHISPER_VENV (default: <here>/.venv, shared with the Vosk worker),
#      VOICE_WHISPER_MODEL (default small), VOICE_WHISPER_DEVICE (cpu),
#      VOICE_WHISPER_COMPUTE (int8)
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
venv="${VOICE_WHISPER_VENV:-$here/.venv}"

python3 -m venv "$venv"
"$venv/bin/python" -m pip install --upgrade pip
"$venv/bin/python" -m pip install -r "$here/requirements-whisper.txt"

model="${VOICE_WHISPER_MODEL:-small}"
echo "preparing faster-whisper model '$model' (first run downloads it)"
VOICE_WHISPER_MODEL="$model" "$venv/bin/python" - <<'PY'
import os
from faster_whisper import WhisperModel

WhisperModel(
    os.environ.get("VOICE_WHISPER_MODEL", "small"),
    device=os.environ.get("VOICE_WHISPER_DEVICE", "cpu"),
    compute_type=os.environ.get("VOICE_WHISPER_COMPUTE", "int8"),
)
print("model ready")
PY

echo
echo "start the worker with:"
echo "  $venv/bin/python $here/stt_server_whisper.py"
echo "then set VOICE_STT_URL=http://127.0.0.1:8091 in /etc/eduardoos-api.env and restart the API."
