<#
.SYNOPSIS
  Build a Revit add-in in Release and copy DLL + .addin into local Revit Addins folders.

.DESCRIPTION
  Example PowerShell automation for multi-version Revit deploy (2023–2026).
  Adjust -ProjectPath, -AddinManifest, and -RevitYears for your solution.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\build-deploy-addin.ps1 -ProjectPath .\MyAddin.csproj
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectPath,

    [string]$Configuration = "Release",

    [string]$AddinManifest = "",

    [int[]]$RevitYears = @(2023, 2024, 2025, 2026)
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

if (-not (Test-Path -LiteralPath $ProjectPath)) {
    throw "Project not found: $ProjectPath"
}

Write-Step "dotnet build $ProjectPath -c $Configuration"
dotnet build $ProjectPath -c $Configuration
if ($LASTEXITCODE -ne 0) {
    throw "dotnet build failed with exit code $LASTEXITCODE"
}

$projectDir = Split-Path -Parent (Resolve-Path $ProjectPath)
$binDir = Join-Path $projectDir "bin\$Configuration"
$dlls = Get-ChildItem -Path $binDir -Filter "*.dll" -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\ref\\' } |
    Select-Object -First 5

if (-not $dlls) {
    throw "No DLLs found under $binDir"
}

foreach ($year in $RevitYears) {
    $target = Join-Path $env:APPDATA "Autodesk\Revit\Addins\$year"
    if (-not (Test-Path -LiteralPath $target)) {
        Write-Host "Skip Revit $year (folder missing): $target" -ForegroundColor Yellow
        continue
    }
    Write-Step "Copy to Revit $year Addins"
    foreach ($dll in $dlls) {
        Copy-Item -LiteralPath $dll.FullName -Destination $target -Force
        Write-Host "  $($dll.Name)"
    }
    if ($AddinManifest -and (Test-Path -LiteralPath $AddinManifest)) {
        Copy-Item -LiteralPath $AddinManifest -Destination $target -Force
        Write-Host "  $(Split-Path -Leaf $AddinManifest)"
    }
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
