# PowerShell script to help identify and fix console.log statements
# This script creates a report of all console statements by file

param(
    [string]$Path = "src",
    [switch]$ExcludeTests = $true,
    [switch]$ExcludeDevUtils = $true
)

Write-Host "🔍 Analyzing console statements in $Path..." -ForegroundColor Cyan

$devUtilFiles = @(
    "**/enrich-data.ts",
    "**/seed-contacts-data.ts",
    "**/mvp-verification.ts",
    "**/env-checker.ts",
    "**/__tests__/**"
)

$files = Get-ChildItem -Path $Path -Filter *.ts* -Recurse

$report = @{}

foreach ($file in $files) {
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
    
    # Skip dev utils if requested
    $shouldSkip = $false
    if ($ExcludeDevUtils) {
        foreach ($pattern in $devUtilFiles) {
            if ($relativePath -like $pattern) {
                $shouldSkip = $true
                break
            }
        }
    }
    
    if ($shouldSkip) { continue }
    
    $content = Get-Content $file.FullName -Raw
    $matches = [regex]::Matches($content, 'console\.(log|error|warn|debug|info)\(')
    
    if ($matches.Count -gt 0) {
        $report[$relativePath] = $matches.Count
    }
}

# Sort by count descending
$sorted = $report.GetEnumerator() | Sort-Object -Property Value -Descending

Write-Host "`n📊 Console Statement Report" -ForegroundColor Yellow
Write-Host "=" * 80

$total = 0
foreach ($item in $sorted) {
    Write-Host "$($item.Value) instances`t$($item.Key)" -ForegroundColor $(if ($item.Value -gt 5) { "Red" } elseif ($item.Value -gt 2) { "Yellow" } else { "White" })
    $total += $item.Value
}

Write-Host "`n" + "=" * 80
Write-Host "Total files with console statements: $($report.Count)"
Write-Host "Total console statements: $total"
Write-Host "`nTo fix automatically, use find-replace with logger import"

