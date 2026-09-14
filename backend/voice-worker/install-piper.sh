#!/usr/bin/env bash
# Install the native Piper binary for voice TTS (no Python dependencies).
#
# The pip `piper-tts` package often fails to import on newer Pythons
# (missing piper_phonemize/onnxruntime). This uses the official static build
# which bundles espeak-ng + onnxruntime.
#
# Usage:
#   sudo bash install-piper.sh [DEST]     # default DEST: /opt/apps/eduardoos/piper
#
# Then set in the API env:
#   VOICE_PIPER_BIN=<DEST>/piper
set -euo pipefail

dest="${1:-/opt/apps/eduardoos/piper}"
version="2023.11.14-2"
url="https://github.com/rhasspy/piper/releases/download/${version}/piper_linux_x86_64.tar.gz"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "downloading piper ${version}"
curl -fL "$url" -o "$tmp/piper.tgz"
tar -xzf "$tmp/piper.tgz" -C "$tmp"

mkdir -p "$(dirname "$dest")"
rm -rf "$dest"
mv "$tmp/piper" "$dest"
chmod +x "$dest/piper"

echo
echo "piper installed at: $dest/piper"
echo "espeak data:        $dest/espeak-ng-data"
echo
echo "set VOICE_PIPER_BIN=$dest/piper in /etc/eduardoos-api.env and restart the API."
