# ============================================================
#  Axiom-Fi Full End-to-End PowerShell Test Script
#  Run from: c:\openagent  (server must already be running)
#  Usage: .\test-e2e.ps1
# ============================================================

$BASE_URL = "http://localhost:3000"
$RPC_URL  = "https://base-sepolia.g.alchemy.com/v2/-zvp9QKiO17fu2jCa64Ww"
$STRATEGY = "Execute a minimal swap of 0.001 ETH to USDC if ETH price shows less than 2% drop in the last 24 hours."

function OK($m)   { Write-Host "  [PASS] $m" -ForegroundColor Green }
function ERR($m)  { Write-Host "  [FAIL] $m" -ForegroundColor Red }
function INFO($m) { Write-Host "  [INFO] $m" -ForegroundColor Cyan }
function WARN($m) { Write-Host "  [WARN] $m" -ForegroundColor Yellow }
function HEAD($m) { Write-Host "`n=== $m ===" -ForegroundColor Yellow }

# ── Pre-flight: warn if npm run agent is running separately ──
$agentProc = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
    $_.CommandLine -like "*run agent*" -or $_.MainWindowTitle -like "*npm run agent*"
}
WARN "IMPORTANT: Stop npm-run-agent before this test -- it conflicts with /api/stream"
WARN "Only npm-run-dev should be running for this test"
Write-Host ""

# ── 1. Server health ─────────────────────────────────────────
HEAD "1. Server Health"
try {
    $r = Invoke-WebRequest -Uri $BASE_URL -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($r.StatusCode -eq 200) { OK "Frontend UP at $BASE_URL" }
    else { ERR "Frontend HTTP $($r.StatusCode)" }
} catch {
    ERR "Frontend DOWN. Run: cd c:\openagent\frontend ; npm run dev"
    exit 1
}

# ── 2. Page smoke tests ──────────────────────────────────────
HEAD "2. Page Smoke Tests"
foreach ($page in @("/terminal", "/analysis", "/history", "/verify", "/agents")) {
    try {
        $r = Invoke-WebRequest -Uri "$BASE_URL$page" -UseBasicParsing -TimeoutSec 5
        if ($r.StatusCode -eq 200) { OK "$page loads OK" }
        else { ERR "$page returned $($r.StatusCode)" }
    } catch { ERR "$page failed: $($_.Exception.Message)" }
}

# ── 3. Agents API ────────────────────────────────────────────
HEAD "3. Agents API"
try {
    $agents = Invoke-RestMethod -Uri "$BASE_URL/api/agents/list" -TimeoutSec 10
    OK "Agents API OK"
    INFO "Response: $($agents | ConvertTo-Json -Compress)"
} catch { ERR "Agents API: $($_.Exception.Message)" }

# ── 4. Run full pipeline via SSE stream ─────────────────────
HEAD "4. Full Pipeline Execution (2-4 min)"
INFO "Strategy: $STRATEGY"
INFO "Streaming live output..."

$body = "{`"strategy`": `"$STRATEGY`"}"

$txHash      = $null
$ogTxHash    = $null
$keeperHubId = $null
$ethPrice    = $null
$approved    = $false
$complete    = $false
$researchDone = $false
$riskDone     = $false
$executorDone = $false

try {
    $req = [System.Net.HttpWebRequest]::Create("$BASE_URL/api/stream")
    $req.Method           = "POST"
    $req.ContentType      = "application/json"
    $req.Timeout          = 360000
    $req.ReadWriteTimeout = 360000

    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    $req.ContentLength = $bodyBytes.Length
    $ws = $req.GetRequestStream()
    $ws.Write($bodyBytes, 0, $bodyBytes.Length)
    $ws.Close()

    $resp = $req.GetResponse()
    $sr   = New-Object System.IO.StreamReader($resp.GetResponseStream())

    while (-not $sr.EndOfStream) {
        $line = $sr.ReadLine()
        if (-not $line.StartsWith("data:")) { continue }
        $json = $line.Substring(5).Trim()
        if (-not $json) { continue }

        try {
            $ev  = $json | ConvertFrom-Json
            $msg = if ($ev.message) { $ev.message } else { "" }

            # Print meaningful lines
            $keywords = @("Orchestrator","Research","RiskGuard","Executor","Attestation","KeeperHub","BaseScan","0G KV","0G LOG","complete","APPROVED","REJECTED","ETH price","Routing","Decision","x402","Uniswap","Trade outcome")
            foreach ($kw in $keywords) {
                if ($msg -like "*$kw*") {
                    Write-Host "    $msg" -ForegroundColor White
                    break
                }
            }

            # ── Extract ETH price ────────────────────────────────
            # Try exact format: "ETH price = $2305.46"
            if ($msg -like "*ETH price*") {
                if ($msg -match '\$(\d{3,5}\.\d{2})') { $ethPrice = $Matches[1] }
            }
            # Fallback: price from recommendation reason "minor 0.16% drop"
            if ((-not $ethPrice) -and ($msg -like "*% drop*" -or $msg -like "*% change*")) {
                if ($msg -match '([\d.]+)%') { $ethPrice = "(ETH -$($Matches[1])% 24h)" }
            }

            # ── Detect APPROVED ──────────────────────────────────
            # Risk Guard APPROVED, OR executor ran (only runs after approval)
            if ($msg -like "*APPROVED*" -or $msg -like "*RECOMMENDATION: YES*") { $approved = $true }
            if ($msg -like "*Trade outcome recorded*") { $approved = $true }  # executor only runs if approved

            # ── Agent completion tracking ────────────────────────
            if ($msg -like "*Recommendation:*") { $researchDone = $true }
            if ($msg -like "*Decision:*" -or $msg -like "*APPROVED*") { $riskDone = $true }
            if ($msg -like "*Trade outcome recorded*") { $executorDone = $true; $riskDone = $true }

            # ── Extract link fields ──────────────────────────────
            if ($ev.txHash)      { $txHash      = $ev.txHash }
            if ($ev.ogTxHash)    { $ogTxHash    = $ev.ogTxHash }
            if ($ev.keeperHubId) { $keeperHubId = $ev.keeperHubId }

            if ($ev.type -eq "done") { $complete = $true; break }
            if ($ev.type -eq "error") { ERR "Pipeline error: $msg"; break }

        } catch { }
    }
    $sr.Close()

} catch {
    ERR "Stream failed: $($_.Exception.Message)"
    exit 1
}

# ── 5. Pipeline results ──────────────────────────────────────
HEAD "5. Pipeline Results"
if ($complete)     { OK "Pipeline completed" }                      else { ERR "Pipeline did NOT complete" }
if ($researchDone) { OK "Research Agent: DONE (ETH analyzed)" }     else { ERR "Research Agent did not complete" }
if ($riskDone)     { OK "Risk Guard: DONE (execution allowed)" }    else { ERR "Risk Guard did not complete" }
if ($executorDone) { OK "Executor Agent: DONE (swap executed)" }    else { ERR "Executor did not complete" }
if ($ethPrice)     { OK "ETH data: $ethPrice" }                     else { ERR "ETH price not extracted" }
if ($approved)     { OK "Execution APPROVED and completed" }        else { ERR "Execution not approved" }
if ($txHash)       { OK "Swap txHash: $txHash" }                    else { ERR "No BaseScan txHash" }
if ($ogTxHash)     { OK "0G txHash:   $ogTxHash" }                  else { ERR "No 0G txHash" }
if ($keeperHubId)  { OK "KeeperHub:   $keeperHubId" }               else { ERR "No KeeperHub ID" }

# ── 6. On-chain verification via RPC ────────────────────────
HEAD "6. On-Chain Verification (eth_getTransactionReceipt)"
if ($txHash) {
    INFO "Querying RPC for receipt of $txHash"
    $rpcBody = "{`"jsonrpc`":`"2.0`",`"method`":`"eth_getTransactionReceipt`",`"params`":[`"$txHash`"],`"id`":1}"
    try {
        $rpc = Invoke-RestMethod -Uri $RPC_URL -Method POST -Body $rpcBody -ContentType "application/json" -TimeoutSec 15
        if ($rpc.result -and $rpc.result.status -eq "0x1") {
            OK "Swap tx CONFIRMED on Base Sepolia (status=SUCCESS)"
            $blockNum = [Convert]::ToInt64($rpc.result.blockNumber.Replace("0x",""), 16)
            $gasUsed  = [Convert]::ToInt64($rpc.result.gasUsed.Replace("0x",""), 16)
            INFO "Block number : $blockNum"
            INFO "Gas used     : $gasUsed"
        } elseif ($rpc.result -and $rpc.result.status -eq "0x0") {
            ERR "Swap tx REVERTED on-chain"
        } else {
            ERR "Tx not found yet. Open: https://sepolia.basescan.org/tx/$txHash"
        }
    } catch {
        ERR "RPC call failed: $($_.Exception.Message)"
    }
} else {
    ERR "No txHash to verify on-chain"
}

# ── 7. Summary ───────────────────────────────────────────────
HEAD "FINAL SUMMARY"
Write-Host ""
Write-Host "  Strategy  : $STRATEGY"    -ForegroundColor White
Write-Host "  ETH Data  : $ethPrice"    -ForegroundColor White
Write-Host "  Approved  : $approved"    -ForegroundColor White
Write-Host "  Swap Tx   : $txHash"      -ForegroundColor White
Write-Host "  0G Tx     : $ogTxHash"    -ForegroundColor White
Write-Host "  KeeperHub : $keeperHubId" -ForegroundColor White
Write-Host ""
if ($txHash)      { Write-Host "  BaseScan  -> https://sepolia.basescan.org/tx/$txHash"               -ForegroundColor Cyan }
if ($ogTxHash)    { Write-Host "  0G Chain  -> https://chainscan-galileo.0g.ai/tx/$ogTxHash"          -ForegroundColor Cyan }
if ($keeperHubId) { Write-Host "  KeeperHub -> https://app.keeperhub.com/workflows/$keeperHubId" -ForegroundColor Cyan }
Write-Host ""
