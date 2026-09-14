#!/usr/bin/env bash
# Provision the self-hosted Vosk speech-to-text worker for global voice.
#
# Creates a venv, installs deps, and downloads the small Spanish + English
# Vosk models into voice-worker/models/. Then run:
#   VOICE_STT_MODELS_DIR="$(pwd)/models" .venv/bin/python stt_server.py
# and set VOICE_FAKE_STT=false in the API env.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"

python3 -m venv "$here/.venv"
"$here/.venv/bin/python" -m pip install --upgrade pip
"$here/.venv/bin/python" -m pip install -r "$here/requirements.txt"

mkdir -p "$here/models"
fetch() {
  name="$1"
  url="$2"
  if [ -d "$here/models/$name" ]; then
    echo "model present: $name"
    return
  fi
  echo "downloading $name"
  curl -fL "$url" -o "/tmp/$name.zip"
  unzip -q -o "/tmp/$name.zip" -d "$here/models"
  rm -f "/tmp/$name.zip"
}

fetch vosk-model-small-es-0.42 https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip
fetch vosk-model-small-en-us-0.15 https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip

echo
echo "done. start the worker with:"
echo "  VOICE_STT_MODELS_DIR=\"$here/models\" \"$here/.venv/bin/python\" \"$here/stt_server.py\""
echo "then set VOICE_FAKE_STT=false and restart the Go API."
