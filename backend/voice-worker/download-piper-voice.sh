#!/usr/bin/env bash
# Download a Piper voice from the official rhasspy/piper-voices repo.
#
# Usage:
#   ./download-piper-voice.sh es/es_MX/ald/medium/es_MX-ald-medium
#   ./download-piper-voice.sh en/en_US/lessac/medium/en_US-lessac-medium
#
# Installs <name>.onnx and <name>.onnx.json into voice-worker/models/piper and
# prints the VOICE_PIPER_MODEL_ES/EN line to set.
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: $0 <repo-path-without-extension>   e.g. es/es_MX/ald/medium/es_MX-ald-medium" >&2
  exit 2
fi

here="$(cd "$(dirname "$0")" && pwd)"
voice="$1"
base="https://huggingface.co/rhasspy/piper-voices/resolve/main"
dest="$here/models/piper"
name="$(basename "$voice")"

mkdir -p "$dest"
echo "downloading $voice"
curl -fL "$base/$voice.onnx" -o "$dest/$name.onnx"
curl -fL "$base/$voice.onnx.json" -o "$dest/$name.onnx.json"

echo
echo "installed: $dest/$name.onnx"
case "$voice" in
  */es/*|es/*) echo "set VOICE_PIPER_MODEL_ES=$dest/$name.onnx" ;;
  *)           echo "set VOICE_PIPER_MODEL_EN=$dest/$name.onnx" ;;
esac
