$content = Get-Content 'c:\openagent\test-e2e.ps1' -Raw

$oldLines = @"
            # Extract values
            if (`$msg -match 'ETH price\s*[=:]?\s*\$?([\d,.]+)') { `$ethPrice = `$Matches[1] }
            if (`$msg -match '\$([\d,.]+)\s*\(' ) { if (-not `$ethPrice) { `$ethPrice = `$Matches[1] } }
            if (`$msg -like "*APPROVED*" -or `$msg -like "*Decision: APPROVED*") { `$approved = `$true }
"@

$newLines = @"
            # Extract values
            if (`$msg -match 'ETH price[\s=]+\`$?([\d,.]+)') { `$ethPrice = `$Matches[1] }
            if (`$msg -match '\`$([\d]+\.[\d]+)') { if (-not `$ethPrice) { `$ethPrice = `$Matches[1] } }
            if (`$msg -like "*APPROVED*" -or `$msg -like "*RECOMMENDATION: YES*") { `$approved = `$true }
"@

$content = $content.Replace($oldLines, $newLines)
$content | Set-Content 'c:\openagent\test-e2e.ps1' -NoNewline
Write-Host "Done"
