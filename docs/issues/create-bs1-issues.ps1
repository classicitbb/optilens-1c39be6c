# Publish BS1 specs as GitHub issues. Run from repo root on your machine (needs gh CLI, authed).
# powershell -File docs\issues\create-bs1-issues.ps1
$repo = "classicitbb/optilens-1c39be6c"
$dir = Join-Path $PSScriptRoot "."
$files = Get-ChildItem $dir -Filter "BS1-*.md" | Sort-Object Name
foreach ($f in $files) {
  $title = (Get-Content $f.FullName -First 1) -replace '^#\s*', ''
  Write-Host "Creating: $title"
  gh issue create --repo $repo --title $title --body-file $f.FullName --label "build-seq-1,pricing"
}
