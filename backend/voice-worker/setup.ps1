# Provision the self-hosted Vosk speech-to-text worker for global voice.
#
# Creates a venv, installs deps, and downloads the small Spanish + English
# Vosk models into voice-worker\models. Then run:
#   $env:VOICE_STT_MODELS_DIR = "$PSScriptRoot\models"
#   & "$PSScriptRoot\.venv\Scripts\python.exe" "$PSScriptRoot\stt_server.py"
# and set VOICE_FAKE_STT=false in the API env.

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$venv = Join-Path $here ".venv"
$venvPy = Join-Path $venv "Scripts\python.exe"

$launcher = "python"
if (Get-Command py -ErrorAction SilentlyContinue) { $launcher = "py" }
& $launcher -m venv $venv
& $venvPy -m pip install --upgrade pip
& $venvPy -m pip install -r (Join-Path $here "requirements.txt")

$models = Join-Path $here "models"
New-Item -ItemType Directory -Force -Path $models | Out-Null

$targets = [ordered]@{
  "vosk-model-small-es-0.42"    = "https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip"
  "vosk-model-small-en-us-0.15" = "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
}
foreach ($name in $targets.Keys) {
  $dir = Join-Path $models $name
  if (Test-Path $dir) { Write-Host "model present: $name"; continue }
  Write-Host "downloading $name"
  $zip = Join-Path $env:TEMP "$name.zip"
  Invoke-WebRequest -Uri $targets[$name] -OutFile $zip
  Expand-Archive -Path $zip -DestinationPath $models -Force
  Remove-Item $zip -Force
}

Write-Host ""
Write-Host "done. start the worker with:"
Write-Host "  `$env:VOICE_STT_MODELS_DIR = `"$models`""
Write-Host "  & `"$venvPy`" `"$(Join-Path $here 'stt_server.py')`""
Write-Host "then set VOICE_FAKE_STT=false and restart the Go API."
