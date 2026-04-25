'use client'
import { useState, useRef } from 'react'
import ActivityFeed, { type FeedEntry } from '@/components/ActivityFeed'
import { Send, RotateCcw } from 'lucide-react'

function ts() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function uid() { return Math.random().toString(36).slice(2, 10) }

/* ── Strategy Editor ──────────────────────────────────────────────── */
function StrategyEditor({
  value, onChange, onSubmit, running,
}: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; running: boolean
}) {
  const lineCount = value.split('\n').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        flex: 1, display: 'flex', overflow: 'hidden',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        marginBottom: 12,
      }}>
        {/* Line numbers */}
        <div style={{
          padding: '16px 10px',
          background: 'rgba(5,8,16,0.5)',
          borderRight: '1px solid var(--border)',
          minWidth: 40,
          userSelect: 'none',
          textAlign: 'right',
        }}>
          {Array.from({ length: Math.max(lineCount, 12) }, (_, i) => (
            <div key={i} style={{
              fontFamily: "'Space Mono'", fontSize: '0.72rem',
              color: 'var(--text-muted)', lineHeight: '1.6',
            }}>{i + 1}</div>
          ))}
        </div>

        <textarea
          id="strategy-editor"
          value={value}
          onChange={e => onChange(e.target.value)}
          spellCheck={false}
          placeholder={`Go long ETH when RSI < 35\nand BTC dominance > 52%.\nMax 5% portfolio exposure.\n\n// Write your strategy in plain English.\n// Axiom parses it for you.`}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: '16px 14px',
            fontFamily: "'Space Mono'",
            fontSize: '0.82rem',
            color: 'var(--text-primary)',
            lineHeight: '1.6',
            caretColor: 'var(--blue-glow)',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <span className="label-caps">{value.length} chars</span>
      </div>

      <button
        id="submit-strategy-btn"
        onClick={onSubmit}
        disabled={running || value.trim().length < 10}
        className="btn-primary"
        style={{
          width: '100%', justifyContent: 'center',
          opacity: running || value.trim().length < 10 ? 0.5 : 1,
          cursor: running || value.trim().length < 10 ? 'not-allowed' : 'pointer',
        }}
      >
        {running ? (
          <>
            <span style={{ display: 'inline-block', animation: 'spinSlow 1s linear infinite' }}>⟳</span>
            Agents Working…
          </>
        ) : (
          <><Send size={14} /> Execute Strategy</>
        )}
      </button>
    </div>
  )
}

/* ── Main Terminal Page ───────────────────────────────────────────── */
export default function TerminalPage() {
  const [strategy, setStrategy] = useState('')
  const [running, setRunning]   = useState(false)
  const [feed, setFeed]         = useState<FeedEntry[]>([])
  const abortRef = useRef<AbortController | null>(null)

  function addEntry(entry: Omit<FeedEntry, 'id' | 'timestamp'>) {
    setFeed(prev => [...prev, { ...entry, id: uid(), timestamp: ts() }])
  }

  function reset() {
    abortRef.current?.abort()
    setRunning(false)
    setFeed([])
    setStrategy('')
  }

  async function handleSubmit() {
    if (running) return
    setRunning(true)
    setFeed([])
    addEntry({ type: 'orchestrator', agentName: 'Orchestrator', tier: 'gold', action: '⚙ Initialising agent pipeline…' })

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/stream', {
        method: 'POST',
        body: JSON.stringify({ strategy }),
        headers: { 'Content-Type': 'application/json' },
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

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
              addEntry({
                type: event.tag as any,
                agentName:
                  event.tag === 'research'    ? 'Research-001'   :
                  event.tag === 'risk-guard'  ? 'RiskGuard-001'  :
                  event.tag === 'executor'    ? 'Executor-001'   :
                  event.tag === 'payment'     ? 'x402 Payment'   :
                  event.tag === 'attestation' ? 'Attestation'    :
                  'Orchestrator',
                tier: 'gold',
                action: event.message,
                txHash: event.txHash,
              })
            } else if (event.type === 'error') {
              addEntry({ type: 'orchestrator', agentName: 'System', tier: 'gold', action: `⚠ ${event.message}` })
            } else if (event.type === 'done') {
              addEntry({
                type: event.success ? 'attestation' : 'orchestrator',
                agentName: 'Orchestrator',
                tier: 'gold',
                action: event.message,
              })
              setRunning(false)
            } else if (event.type === 'status') {
              addEntry({ type: 'orchestrator', agentName: 'Orchestrator', tier: 'gold', action: event.message })
            }
          } catch {
            // malformed SSE line — skip
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        addEntry({ type: 'orchestrator', agentName: 'System', tier: 'gold', action: `ERROR: ${e.message}` })
      }
      setRunning(false)
    }
  }

  return (
    <div style={{
      paddingTop: 60, height: '100vh',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Terminal header */}
      <div style={{
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border)',
        padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: "'Space Mono'", fontSize: '0.75rem', color: 'var(--blue-glow)' }}>
            AXIOM TERMINAL
          </span>
          <span style={{ width: 1, height: 16, background: 'var(--border)' }} />
          <span style={{ fontFamily: "'Space Mono'", fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Base Sepolia · Chain ID 84532
          </span>
          <span style={{ width: 1, height: 16, background: 'var(--border)' }} />
          <a
            href="https://sepolia.basescan.org/address/0x3c69d3277fC72fdf52eABD96195253A836BaB427"
            target="_blank" rel="noreferrer"
            style={{ fontFamily: "'Space Mono'", fontSize: '0.65rem', color: 'var(--amber)', textDecoration: 'none' }}
          >
            ReputationLedger ↗
          </a>
        </div>
        <button
          onClick={reset}
          className="btn-ghost"
          style={{ padding: '5px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {/* 2-panel layout */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: '40% 60%',
        overflow: 'hidden',
      }}>
        {/* Panel 1: Strategy Editor */}
        <div style={{
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', padding: '16px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <span className="label-caps">Strategy Input</span>
            <span style={{ fontFamily: "'Space Mono'", fontSize: '0.65rem', color: 'var(--text-muted)' }}>Space Mono</span>
          </div>
          <StrategyEditor value={strategy} onChange={setStrategy} onSubmit={handleSubmit} running={running} />
        </div>

        {/* Panel 2: Live Activity Feed */}
        <div style={{
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <span className="label-caps">Live Activity Feed</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {running && (
                <span style={{ fontFamily: "'Space Mono'", fontSize: '0.65rem', color: 'var(--green)', animation: 'pulse 1.5s ease-in-out infinite' }}>
                  streaming
                </span>
              )}
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: running ? 'var(--green)' : 'var(--border)',
                boxShadow: running ? '0 0 6px var(--green)' : 'none',
                transition: 'all 0.3s',
              }} />
            </div>
          </div>
          <ActivityFeed entries={feed} />
        </div>
      </div>
    </div>
  )
}
