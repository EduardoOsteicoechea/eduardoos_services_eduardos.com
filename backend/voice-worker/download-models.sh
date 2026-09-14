#!/usr/bin/env bash
# Download Vosk speech models for the voice worker.
#
# Usage:
#   ./download-models.sh                    # balanced (recommended)
#   VOICE_MODEL_QUALITY=small  ./download-models.sh
#   VOICE_MODEL_QUALITY=large  ./download-models.sh
#
# Tiers (check `free -h` first; big models need several GB of RAM):
#   small    : small-es + small-en         (~80 MB,  ~0.3-0.6 GB RAM)
#   balanced : es-0.42 + en-0.22-lgraph    (~1.5 GB, ~2-4 GB RAM)
#   large    : es-0.42 + en-0.22           (~3.2 GB, ~4-8 GB RAM)
#
# Spanish accuracy improves a lot with the big model (WER ~16 -> ~7.5).
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
models="$here/models"
mkdir -p "$models"

quality="${VOICE_MODEL_QUALITY:-balanced}"

fetch() {
  name="$1"
  url="$2"
  if [ -d "$models/$name" ]; then
    echo "present: $name"
    return
  fi
  echo "downloading $name"
  tmp="/tmp/$name.zip"
  curl -fL "$url" -o "$tmp"
  unzip -q -o "$tmp" -d "$models"
  rm -f "$tmp"
}

case "$quality" in
  small)
    fetch vosk-model-small-es-0.42 https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip
    fetch vosk-model-small-en-us-0.15 https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
    ;;
  large)
    fetch vosk-model-es-0.42 https://alphacephei.com/vosk/models/vosk-model-es-0.42.zip
    fetch vosk-model-en-us-0.22 https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip
    ;;
  *)
    fetch vosk-model-es-0.42 https://alphacephei.com/vosk/models/vosk-model-es-0.42.zip
    fetch vosk-model-en-us-0.22-lgraph https://alphacephei.com/vosk/models/vosk-model-en-us-0.22-lgraph.zip
    ;;
esac

echo
echo "models in $models:"
ls -1 "$models"
echo
echo "The worker now prefers a non-'small' model automatically."
echo "Verify after restarting it:"
echo "  sudo systemctl restart eduardoos-voice-stt.service"
echo "  journalctl -u eduardoos-voice-stt.service -n 20 --no-pager   # shows the model it loads"
