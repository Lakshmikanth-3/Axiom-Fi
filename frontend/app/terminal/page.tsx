'use client'
import { useState, useRef, useEffect } from 'react'
import AgentStatusCard, { type AgentInfo } from '@/components/AgentStatusCard'
import ActivityFeed, { type FeedEntry } from '@/components/ActivityFeed'
import { Send, RotateCcw } from 'lucide-react'

/* ── Demo seed data ──────────────────────────────────────────────── */
const INIT_AGENTS: AgentInfo[] = [
  { id: 'research-001', name: 'Research-001', type: 'research', tier: 'gold', accuracy: 71, totalDecisions: 43, fee: '$0.008', status: 'idle' },
  { id: 'risk-001',     name: 'RiskGuard-001', type: 'risk-guard', tier: 'silver', accuracy: 58, totalDecisions: 31, fee: '$0.005', status: 'idle' },
  { id: 'executor-001', name: 'Executor-001',  type: 'executor',   tier: 'gold',   accuracy: 68, totalDecisions: 29, fee: '$0.008', status: 'idle' },
]

function ts() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function uid() { return Math.random().toString(36).slice(2, 10) }

/* ── Strategy Editor with line numbers ───────────────────────────── */
function StrategyEditor({
  value, onChange, onSubmit, running,
}: {
  value: string; onChange: (v: string) => void; onSubmit: () => void; running: boolean
}) {
  const lineCount = value.split('\n').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Editor area */}
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

        {/* Textarea */}
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

      {/* Char count */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <span className="label-caps">{value.length} chars</span>
      </div>

      {/* Submit button */}
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
          <><Send size={14} /> Submit Strategy</>
        )}
      </button>
    </div>
  )
}

/* ── Main Terminal Page ───────────────────────────────────────────── */
export default function TerminalPage() {
  const [strategy, setStrategy]     = useState('')
  const [running, setRunning]       = useState(false)
  const [feed, setFeed]             = useState<FeedEntry[]>([])
  const [agents, setAgents]         = useState<AgentInfo[]>(INIT_AGENTS)
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  function addEntry(entry: Omit<FeedEntry, 'id' | 'timestamp'>) {
    setFeed(prev => [...prev, { ...entry, id: uid(), timestamp: ts() }])
  }

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/agents')
        if (res.ok) {
          const data = await res.json()
          setAgents(data)
        }
      } catch (e) { console.error('Failed to fetch agents', e) }
    }
    fetchAgents()
    const interval = setInterval(fetchAgents, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let lastLogCount = 0
    async function fetchLogs() {
      try {
        const res = await fetch('/api/logs')
        if (res.ok) {
          const logs = await res.json()
          if (logs.length > lastLogCount) {
            // Add new logs to feed
            const newLogs = logs.slice(0, logs.length - lastLogCount).reverse()
            newLogs.forEach((log: any) => {
              addEntry({
                type: log.event === 'recommendation_generated' ? 'research' : log.event === 'swap_executed' ? 'executor' : 'orchestrator',
                agentName: log.agentId || 'Axiom',
                tier: 'gold', // Map correctly in production
                action: log.data?.recommendation || log.data?.action || log.event,
                txHash: log.txHash
              })
            })
            lastLogCount = logs.length
          }
        }
      } catch (e) { console.error('Failed to fetch logs', e) }
    }
    
    const interval = setInterval(fetchLogs, 3000)
    return () => clearInterval(interval)
  }, [])

  function reset() {
    setRunning(false)
    setFeed([])
    setStrategy('')
  }

  async function handleSubmit() {
    if (running) return
    setRunning(true)
    addEntry({ type: 'orchestrator', agentName: 'Orchestrator', tier: 'gold', action: 'Initiating real-world strategy execution…' })
    
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        body: JSON.stringify({ strategy }),
        headers: { 'Content-Type': 'application/json' }
      })
      if (!res.ok) throw new Error('Execution failed')
      addEntry({ type: 'orchestrator', agentName: 'Orchestrator', tier: 'gold', action: 'Strategy submitted to agent cloud. Polling 0G Storage for live audit trail…' })
      
      // Real polling logic would go here
      // For now, we'll keep the feed open
    } catch (e: any) {
      addEntry({ type: 'orchestrator', agentName: 'Orchestrator', tier: 'gold', action: `ERROR: ${e.message}` })
      setRunning(false)
    }
  }

  return (
    <div style={{
      paddingTop: 60, height: '100vh',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Terminal header bar */}
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
        </div>
        <button
          onClick={reset}
          className="btn-ghost"
          style={{ padding: '5px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {/* Three-panel layout */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: '35% 35% 30%',
        overflow: 'hidden',
      }}>
        {/* ── Panel 1: Strategy Editor ──────────────────────────── */}
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

        {/* ── Panel 2: Activity Feed ────────────────────────────── */}
        <div style={{
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <span className="label-caps">Live Activity Feed</span>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: running ? 'var(--green)' : 'var(--border)',
              boxShadow: running ? '0 0 6px var(--green)' : 'none',
              transition: 'all 0.3s',
            }} />
          </div>
          <ActivityFeed entries={feed} />
        </div>

        {/* ── Panel 3: Agent Status ─────────────────────────────── */}
        <div style={{
          display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px',
          gap: 12,
        }}>
          <span className="label-caps" style={{ flexShrink: 0 }}>Agent Status</span>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {agents.map(agent => (
              <AgentStatusCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
