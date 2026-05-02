'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import PipelineStatus, { type PipelineStep, type StepStatus } from '@/components/PipelineStatus'
import OutputFeed, { type OutputEntry, type OutputPhase } from '@/components/OutputFeed'
import { ArrowCounterClockwise } from '@phosphor-icons/react'

function ts() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function uid() { return Math.random().toString(36).slice(2, 10) }

const INITIAL_STEPS: PipelineStep[] = [
  { id: 'research', label: 'Research', status: 'pending', paymentAmount: '—' },
  { id: 'risk-guard', label: 'Risk Guard', status: 'pending', paymentAmount: '—' },
  { id: 'executor', label: 'Executor', status: 'pending', paymentAmount: '—' },
]

const INITIAL_PAYMENTS = [
  { label: 'Research', amount: '—', sent: false },
  { label: 'Risk Guard', amount: '—', sent: false },
  { label: 'Executor', amount: '—', sent: false },
]

// Convert USDC base units (6 decimals) to dollar string
function usdcBaseToDisplay(raw: string): string {
  const n = parseInt(raw, 10)
  if (isNaN(n)) return '—'
  return `$${(n / 1_000_000).toFixed(3)}`
}

// Map SSE tags to phases and derive step updates
function tagToPhase(tag: string): OutputPhase {
  if (tag === 'research') return 'research'
  if (tag === 'risk-guard') return 'risk'
  if (tag === 'executor') return 'executor'
  if (tag === 'payment') return 'payment'
  if (tag === 'attestation') return 'orchestrator'
  return 'orchestrator'
}

export default function TerminalPage() {
  const router = useRouter()
  const [strategy, setStrategy] = useState('')
  const [running, setRunning] = useState(false)
  const [feed, setFeed] = useState<OutputEntry[]>([])
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS)
  const [payments, setPayments] = useState(INITIAL_PAYMENTS)
  const [isComplete, setIsComplete] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  function addEntry(entry: Omit<OutputEntry, 'id' | 'timestamp'>) {
    setFeed(prev => [...prev, { ...entry, id: uid(), timestamp: ts() }])
  }

  function updateStep(id: string, status: StepStatus) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  function sendPayment(index: number, amount?: string) {
    setPayments(prev => prev.map((p, i) => i === index ? { ...p, sent: true, amount: amount ?? p.amount } : p))
    if (amount) {
      setSteps(prev => prev.map((s, i) => i === index ? { ...s, paymentAmount: amount } : s))
    }
  }

  function reset() {
    abortRef.current?.abort()
    setRunning(false)
    setFeed([])
    setStrategy('')
    setSteps(INITIAL_STEPS)
    setPayments(INITIAL_PAYMENTS)
    setIsComplete(false)
    setSessionId(null)
  }

  async function handleSubmit() {
    if (running || strategy.trim().length < 10) return
    // Clear previous session data so analysis page starts fresh
    try { sessionStorage.removeItem('axiom-session') } catch { }
    setRunning(true)
    setFeed([])
    setSteps(INITIAL_STEPS)
    setPayments(INITIAL_PAYMENTS)
    setIsComplete(false)

    const sid = `session-${Date.now()}`
    setSessionId(sid)

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        body: JSON.stringify({ strategy }),
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // Activate research step at start
      updateStep('research', 'running')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.replace(/^data:\s*/, '').trim()
          if (!line) continue

          try {
            const event = JSON.parse(line)

            if (event.type === 'log') {
              const phase = tagToPhase(event.tag ?? 'orchestrator')
              const msg: string = event.message ?? ''

              // ── Step transitions (exact formats from agent logs) ─────────────
              // Research
              if (msg.includes('Paying research-001')) { updateStep('research', 'running') }
              if (msg.includes('Recommendation:') || msg.includes('RECOMMENDATION:')) { updateStep('research', 'done') }

              // Risk Guard — also force-done when executor payment fires (only fires if approved)
              if (msg.includes('Paying risk-guard-001')) { updateStep('risk-guard', 'running') }
              if (msg.includes('[RiskGuard] Decision:') || msg.includes('Decision: APPROVED') || msg.includes('Decision: REJECTED')) {
                updateStep('risk-guard', 'done')
              }
              if (msg.includes('Paying executor-001')) {
                updateStep('risk-guard', 'done') // executor only runs after risk guard approved
                updateStep('executor', 'running')
              }

              // Executor done
              if (msg.includes('KeeperHub ✓') || msg.includes('BaseScan ✓') || msg.includes('Pipeline complete') || (msg.includes('Session') && msg.includes('complete'))) {
                updateStep('executor', 'done')
              }

              // Parse real x402 payment amount: "[x402] Preparing real payment of 5000 to 0x..."
              // Amount is in USDC base units (6 decimals): 5000 → $0.005
              const x402Match = msg.match(/Preparing real payment of (\d+)/)
              if (x402Match) {
                const liveAmount = usdcBaseToDisplay(x402Match[1])
                const n = parseInt(x402Match[1], 10)
                // 5000 = Research, 3000 = Risk Guard, 10000 = Executor
                if (n === 5000) sendPayment(0, liveAmount)
                else if (n === 3000) sendPayment(1, liveAmount)
                else if (n === 10000) sendPayment(2, liveAmount)
                else {
                  // Unknown amount — assign to whichever step is running
                  const idx = steps.findIndex(s => s.status === 'running')
                  if (idx >= 0) sendPayment(idx, liveAmount)
                }
              }

              // ── Link extraction (exact URL patterns from executor logs) ─────
              // BaseScan: "[BaseScan ✓] Verified on Base Sepolia: https://sepolia.basescan.org/tx/0x..."
              let extractedTxHash: string | undefined = event.txHash
              const baseScanMatch = msg.match(/sepolia\.basescan\.org\/tx\/(0x[a-fA-F0-9]{64})/)
              if (baseScanMatch) extractedTxHash = baseScanMatch[1]

              // 0G Storage: "[0G KV ✓] State sync confirmed: https://chainscan-galileo.0g.ai/tx/0x..."
              let ogTxHash: string | undefined
              const ogMatch = msg.match(/chainscan-galileo\.0g\.ai\/tx\/(0x[a-fA-F0-9]{64})/)
              if (ogMatch) ogTxHash = ogMatch[1]

              // KeeperHub: "[KeeperHub ✓] Workflow: https://app.keeperhub.com/hub/workflows/wf-..."
              let keeperHubId: string | undefined
              const khMatch = msg.match(/keeperhub\.com\/hub\/workflows\/([a-zA-Z0-9_-]+)/)
              if (khMatch) keeperHubId = khMatch[1]

              // Store session data — only pick ETH price from Research log line
              const stored = JSON.parse(sessionStorage.getItem('axiom-session') ?? '{}')
              if (msg.includes('ETH price =') || msg.includes('ETH price=')) {
                const match = msg.match(/ETH price\s*=?\s*\$?([\d,]+\.?\d*)/)
                if (match) stored.ethPrice = `$${match[1]}`
              }
              if (msg.includes('TVL') && msg.includes('$')) {
                const match = msg.match(/\$([\d,.]+[BM]?)/)
                if (match) stored.tvl = `$${match[1]}`
              }
              if (msg.includes('Recommendation:')) stored.recommendation = msg.split('Recommendation:')[1]?.trim()
              if (msg.includes('Decision:')) stored.riskDecision = msg
              if (msg.includes('MaxSize')) stored.maxSize = msg
              if (msg.includes('Routing:')) {
                const r = msg.match(/Routing:\s*(\w+)/)?.[1]
                if (r) stored.routing = r
              }
              stored.strategy = strategy
              stored.sessionId = sid
              if (extractedTxHash) stored.txHash = extractedTxHash
              if (ogTxHash) stored.ogTxHash = ogTxHash
              if (keeperHubId) stored.keeperHubId = keeperHubId
              sessionStorage.setItem('axiom-session', JSON.stringify(stored))

              addEntry({
                phase,
                message: msg,
                txHash: extractedTxHash,
                ogTxHash,
                keeperHubId,
                isError: false,
                isHighlight: msg.includes('Recommendation') || msg.includes('Decision') || msg.includes('Pipeline complete') || msg.includes('complete. Tx:') || msg.includes('KeeperHub ✓') || msg.includes('BaseScan ✓'),
              })

            } else if (event.type === 'error') {
              addEntry({ phase: 'system', message: event.message, isError: true })
            } else if (event.type === 'done') {
              if (event.success) {
                updateStep('executor', 'done')
              } else {
                setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'failed' } : s))
              }
              addEntry({
                phase: 'orchestrator',
                message: event.message,
                isHighlight: event.success,
              })

              // Save to localStorage history for the History page
              try {
                const sessionData = JSON.parse(sessionStorage.getItem('axiom-session') ?? '{}')
                const tradeRecord = {
                  strategy,
                  txHash: sessionData.txHash,
                  ogTxHash: sessionData.ogTxHash,
                  keeperHubId: sessionData.keeperHubId,
                  outcome: event.success ? 'executed' : 'rejected',
                  timestamp: Date.now(),
                  sessionId: sid,
                }
                const existing = JSON.parse(localStorage.getItem('axiom-trade-history') ?? '[]')
                localStorage.setItem('axiom-trade-history', JSON.stringify([tradeRecord, ...existing].slice(0, 50)))
              } catch { /* storage unavailable */ }

              setRunning(false)
              setIsComplete(true)
            } else if (event.type === 'status') {
              addEntry({ phase: 'orchestrator', message: event.message })
            }
          } catch {
            // malformed SSE — skip
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        addEntry({ phase: 'system', message: `ERROR: ${e.message}`, isError: true })
      }
      setRunning(false)
    }
  }

  const lineCount = strategy.split('\n').length

  return (
    <div style={{
      paddingTop: 64, height: '100vh',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      {/* ── Header bar ──────────────────────────────────────────────── */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        height: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--fg)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Axiom Terminal
          </span>
          <span style={{ width: 1, height: 14, background: 'var(--border-md)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--fg-3)' }}>
            Base Sepolia · 84532
          </span>
          <span style={{ width: 1, height: 14, background: 'var(--border-md)' }} />
          <a
            href="https://sepolia.basescan.org/address/0x3c69d3277fC72fdf52eABD96195253A836BaB427"
            target="_blank" rel="noreferrer"
            className="tx-link"
            style={{ fontSize: '0.65rem' }}
          >
            0x3c69d3277fC72fdf52eABD96195253A836BaB427
          </a>
        </div>
        <button
          onClick={reset}
          style={{
            background: 'transparent', border: '1px solid var(--border-md)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'var(--font-sans)', fontSize: '0.75rem',
            color: 'var(--fg-2)', padding: '4px 10px', borderRadius: 'var(--radius-md)',
          }}
        >
          <ArrowCounterClockwise size={12} /> Reset
        </button>
      </div>

      {/* ── 3-panel layout ──────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '26% 30% 44%',
        overflow: 'hidden',
        background: 'var(--bg)',
      }}>

        {/* ── Panel 1: Strategy Input ──────────────────────────────── */}
        <div style={{
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          padding: '14px',
          gap: 10,
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>Strategy</div>

          {/* Textarea */}
          <div style={{
            flex: 1, display: 'flex', overflow: 'hidden',
            background: 'white',
            border: '1px solid var(--border-md)',
            borderRadius: 'var(--radius-md)',
          }}>
            {/* Line numbers */}
            <div style={{
              padding: '14px 8px', background: 'rgba(0,0,0,0.02)',
              borderRight: '1px solid var(--border)',
              minWidth: 32, userSelect: 'none', textAlign: 'right',
            }}>
              {Array.from({ length: Math.max(lineCount, 10) }, (_, i) => (
                <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--fg-4)', lineHeight: 1.7 }}>
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              id="strategy-editor"
              value={strategy}
              onChange={e => setStrategy(e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              translate="no"
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
              suppressHydrationWarning
              placeholder={`Buy 0.01 ETH of USDC if\nETH drops 2% today.\nMax 5% portfolio exposure.`}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                resize: 'none', padding: '14px 12px',
                fontFamily: 'var(--font-mono)', fontSize: '0.78rem',
                color: 'var(--fg)', lineHeight: 1.7,
              }}
            />
          </div>

          {/* Char count */}
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--fg-4)' }}>{strategy.length} chars</span>
          </div>

          {/* Execute button — stable single-child structure, CSS drives the state */}
          <button
            id="execute-btn"
            onClick={handleSubmit}
            disabled={running || strategy.trim().length < 10}
            className="btn btn-dark"
            style={{
              width: '100%', justifyContent: 'center',
              opacity: strategy.trim().length < 10 ? 0.45 : 1,
              cursor: running || strategy.trim().length < 10 ? 'not-allowed' : 'pointer',
            }}
          >
            <span
              translate="no"
              data-gramm="false"
              suppressHydrationWarning
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {running ? '↻ Processing…' : 'Execute'}
            </span>
          </button>
        </div>

        {/* ── Panel 2: Pipeline Status ─────────────────────────────── */}
        <div style={{
          borderRight: '1px solid var(--border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'white',
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>Pipeline</span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <PipelineStatus
              steps={steps}
              payments={payments}
              isComplete={isComplete}
              sessionId={sessionId ?? undefined}
              onViewAnalysis={() => {
                const data = sessionStorage.getItem('axiom-session')
                if (data) router.push('/analysis')
              }}
            />
          </div>
        </div>

        {/* ── Panel 3: Output Feed ─────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0, background: 'white',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>Output</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {/* FIX: always rendered, CSS-driven visibility — no conditional mount */}
              <span
                translate="no"
                data-gramm="false"
                suppressHydrationWarning
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--green)',
                  visibility: running ? 'visible' : 'hidden',
                  width: running ? undefined : 0,
                  overflow: 'hidden',
                  display: 'inline-block',
                }}
              >
                streaming
              </span>
              <span className={`status-dot ${running ? 'running' : isComplete ? 'done' : 'pending'}`} />
            </div>
          </div>
          <OutputFeed entries={feed} running={running} />
        </div>
      </div>
    </div>
  )
}
