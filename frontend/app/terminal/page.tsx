'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import PipelineStatus, { type PipelineStep, type StepStatus } from '@/components/PipelineStatus'
import OutputFeed, { type OutputEntry, type OutputPhase } from '@/components/OutputFeed'
import { Send, RotateCcw } from 'lucide-react'

function ts() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function uid() { return Math.random().toString(36).slice(2, 10) }

const INITIAL_STEPS: PipelineStep[] = [
  { id: 'research',   label: 'Research',   status: 'pending', paymentAmount: '$0.005' },
  { id: 'risk-guard', label: 'Risk Guard', status: 'pending', paymentAmount: '$0.003' },
  { id: 'executor',   label: 'Executor',   status: 'pending', paymentAmount: '$0.010' },
]

const INITIAL_PAYMENTS = [
  { label: 'Research',   amount: '$0.005', sent: false },
  { label: 'Risk Guard', amount: '$0.003', sent: false },
  { label: 'Executor',   amount: '$0.010', sent: false },
]

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

  function sendPayment(index: number) {
    setPayments(prev => prev.map((p, i) => i === index ? { ...p, sent: true } : p))
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

              // Detect step transitions
              if (msg.includes('Paying research-001')) { updateStep('research', 'running'); sendPayment(0) }
              if (msg.includes('Fetching live market')) { updateStep('research', 'running') }
              if (msg.includes('Recommendation:')) { updateStep('research', 'done') }
              if (msg.includes('Paying risk-guard-001')) { updateStep('risk-guard', 'running'); sendPayment(1) }
              if (msg.includes('Decision: APPROVED') || msg.includes('Flags:')) { updateStep('risk-guard', 'done') }
              if (msg.includes('Paying executor-001')) { updateStep('executor', 'running'); sendPayment(2) }
              if (msg.includes('Pipeline complete') || msg.includes('swap_executed')) { updateStep('executor', 'done') }

              // Store session data for analysis page
              const stored = JSON.parse(sessionStorage.getItem('axiom-session') ?? '{}')
              if (msg.includes('ETH price')) {
                const match = msg.match(/\$[\d,.]+/)
                if (match) stored.ethPrice = match[0]
              }
              if (msg.includes('TVL')) {
                const match = msg.match(/\$[\d,.]+[BM]?/)
                if (match) stored.tvl = match[0]
              }
              if (msg.includes('Recommendation:')) stored.recommendation = msg.split('Recommendation:')[1]?.trim()
              if (msg.includes('Decision:')) stored.riskDecision = msg
              if (msg.includes('MaxSize')) stored.maxSize = msg
              stored.strategy = strategy
              stored.sessionId = sid
              sessionStorage.setItem('axiom-session', JSON.stringify(stored))

              addEntry({
                phase,
                message: msg,
                txHash: event.txHash,
                isError: false,
                isHighlight: msg.includes('Recommendation') || msg.includes('Decision') || msg.includes('Pipeline complete'),
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
      paddingTop: 56, height: '100vh',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-base)',
    }}>
      {/* ── Header bar ──────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border)',
        padding: '0 20px',
        height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: "'Space Mono'", fontSize: '0.7rem', color: 'var(--blue-glow)', letterSpacing: '0.1em' }}>
            AXIOM TERMINAL
          </span>
          <span style={{ width: 1, height: 14, background: 'var(--border)' }} />
          <span style={{ fontFamily: "'Space Mono'", fontSize: '0.62rem', color: 'var(--text-muted)' }}>
            Base Sepolia · 84532
          </span>
          <span style={{ width: 1, height: 14, background: 'var(--border)' }} />
          <a
            href="https://sepolia.basescan.org/address/0x3c69d3277fC72fdf52eABD96195253A836BaB427"
            target="_blank" rel="noreferrer"
            style={{ fontFamily: "'Space Mono'", fontSize: '0.6rem', color: 'var(--amber)', textDecoration: 'none' }}
          >
            0x3c69…b427 ↗
          </a>
        </div>
        <button
          onClick={reset}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: "'Space Grotesk'", fontSize: '0.75rem',
            color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 4,
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
        >
          <RotateCcw size={11} /> Reset
        </button>
      </div>

      {/* ── 3-panel layout ──────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '26% 30% 44%',
        overflow: 'hidden',
      }}>

        {/* ── Panel 1: Strategy Input ──────────────────────────────── */}
        <div style={{
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          padding: '14px',
          gap: 10,
        }}>
          <div className="label-caps">Strategy</div>

          {/* Textarea */}
          <div style={{
            flex: 1, display: 'flex', overflow: 'hidden',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 6,
          }}>
            {/* Line numbers */}
            <div style={{
              padding: '14px 8px', background: 'rgba(5,8,16,0.5)',
              borderRight: '1px solid var(--border)',
              minWidth: 32, userSelect: 'none', textAlign: 'right',
            }}>
              {Array.from({ length: Math.max(lineCount, 10) }, (_, i) => (
                <div key={i} style={{ fontFamily: "'Space Mono'", fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              id="strategy-editor"
              value={strategy}
              onChange={e => setStrategy(e.target.value)}
              spellCheck={false}
              placeholder={`Buy 0.01 ETH of USDC if\nETH drops 2% today.\nMax 5% portfolio exposure.`}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                resize: 'none', padding: '14px 12px',
                fontFamily: "'Space Mono'", fontSize: '0.78rem',
                color: 'var(--text-primary)', lineHeight: 1.7,
                caretColor: 'var(--blue-glow)',
              }}
            />
          </div>

          {/* Char count */}
          <div style={{ textAlign: 'right' }}>
            <span className="label-caps">{strategy.length} chars</span>
          </div>

          {/* Execute button */}
          <button
            id="execute-btn"
            onClick={handleSubmit}
            disabled={running || strategy.trim().length < 10}
            style={{
              width: '100%', padding: '11px 16px',
              background: running ? 'rgba(37,99,235,0.15)' : 'var(--blue-primary)',
              border: running ? '1px solid rgba(37,99,235,0.4)' : 'none',
              borderRadius: 6, cursor: running || strategy.trim().length < 10 ? 'not-allowed' : 'pointer',
              opacity: strategy.trim().length < 10 ? 0.45 : 1,
              color: 'var(--text-primary)',
              fontFamily: "'Space Grotesk'", fontSize: '0.875rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'all 0.2s ease',
            }}
          >
            {running ? (
              <>
                <span style={{ animation: 'spinSlow 1s linear infinite', display: 'inline-block' }}>⟳</span>
                Processing…
              </>
            ) : (
              <><Send size={13} /> Execute</>
            )}
          </button>
        </div>

        {/* ── Panel 2: Pipeline Status ─────────────────────────────── */}
        <div style={{
          borderRight: '1px solid var(--border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <span className="label-caps">Pipeline</span>
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
            flexShrink: 0,
          }}>
            <span className="label-caps">Output</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {running && (
                <span style={{ fontFamily: "'Space Mono'", fontSize: '0.6rem', color: 'var(--green)', animation: 'pulse 1.5s ease-in-out infinite' }}>
                  streaming
                </span>
              )}
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: running ? 'var(--green)' : isComplete ? 'var(--blue-glow)' : 'var(--border)',
                boxShadow: running ? '0 0 6px var(--green)' : 'none',
                transition: 'all 0.3s',
              }} />
            </div>
          </div>
          <OutputFeed entries={feed} running={running} />
        </div>
      </div>
    </div>
  )
}
