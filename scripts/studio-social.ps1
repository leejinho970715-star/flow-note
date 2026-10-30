param([string]$Python = 'python')
$ErrorActionPreference='Stop'
# Unified vector identities, social cards and product guides share one source.
& $Python (Join-Path $PSScriptRoot 'generate-product-guides.py')
if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
