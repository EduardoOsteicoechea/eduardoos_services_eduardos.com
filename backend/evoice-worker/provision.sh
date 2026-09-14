#!/usr/bin/env bash
# Provision the eVoice TTS worker on the VPS (outside CI/CD).
#
# The worker *code* is deployed by GitHub Actions into
#   /opt/apps/<app>/releases/<sha>/evoice-worker/
# and reached through the `current` symlink. This script provisions the parts
# CI must not ship: the Python venv, system tools, and the Piper voice model.
#
# Run once as the deploy user, then add the printed env vars to
# /etc/eduardoos-api.env and restart the API service.
set -euo pipefail

WORKER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${EVOICE_VENV_DIR:-/opt/apps/eduardoos/evoice-venv}"
MODELS_DIR="${EVOICE_MODELS_DIR:-/var/www/eduardoos.com/models/evoice}"
PIPER_MODEL="${EVOICE_PIPER_MODEL:-${MODELS_DIR}/es_ES-sharvard-medium.onnx}"
PIPER_MODEL_URL="${EVOICE_PIPER_MODEL_URL:-https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx}"

echo "==> eVoice worker provisioning"
echo "    worker source : ${WORKER_DIR}"
echo "    venv          : ${VENV_DIR}"
echo "    models        : ${MODELS_DIR}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "!! missing python3 — install it first (apt-get install -y python3-venv)" >&2
  exit 1
fi

MISSING_TOOLS=""
for bin in ffmpeg tesseract espeak-ng; do
  if ! command -v "${bin}" >/dev/null 2>&1; then
    MISSING_TOOLS="${MISSING_TOOLS} ${bin}"
  fi
done
if [ -n "${MISSING_TOOLS}" ]; then
  echo "!! missing system tools:${MISSING_TOOLS}" >&2
  echo "   install them with: sudo apt-get install -y ffmpeg tesseract-ocr tesseract-ocr-spa espeak-ng" >&2
  echo "   (eVoice still works with Piper alone; espeak-ng is the fallback)" >&2
fi

python3 -m venv "${VENV_DIR}"
"${VENV_DIR}/bin/pip" install --upgrade pip
"${VENV_DIR}/bin/pip" install -r "${WORKER_DIR}/requirements.txt"

mkdir -p "${MODELS_DIR}"
if [ ! -f "${PIPER_MODEL}" ]; then
  if ! command -v curl >/dev/null 2>&1; then
    echo "!! curl is required to download the Piper voice model" >&2
    exit 1
  fi
  echo "==> downloading Piper voice model"
  curl -fL "${PIPER_MODEL_URL}" -o "${PIPER_MODEL}"
  curl -fL "${PIPER_MODEL_URL}.json" -o "${PIPER_MODEL}.json"
fi

cat <<EOF

Provisioning complete. Add these to /etc/eduardoos-api.env:

  EVOICE_FAKE_TTS=false
  EVOICE_PYTHON=${VENV_DIR}/bin/python
  EVOICE_WORKER_SCRIPT=evoice-worker/linux_sync.py
  EVOICE_PIPER_MODEL=${PIPER_MODEL}
  DEEPSEEK_MODEL=<deepseek chat model id>
  DEEPSEEK_VISION_MODEL=<deepseek vision model id>

EVOICE_WORKER_SCRIPT is resolved relative to the systemd WorkingDirectory
(the current release), so it stays correct on every deploy. Then:

  sudo systemctl restart eduardoos-api.service

Verify with an admin test job from /evoice (or check the API journal):
  journalctl -u eduardoos-api.service -n 50 --no-pager
EOF
