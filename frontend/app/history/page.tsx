'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink } from 'lucide-react'

interface HistoryEntry {
  id: string
  timestamp: string
  strategy: string
  outcome: 'approved' | 'rejected' | 'error'
  routing: string
  agent: string
  txHash?: string
  sessionId?: string
}

function OutcomePill({ outcome }: { outcome: HistoryEntry['outcome'] }) {
  const map = {
    approved: { color: 'var(--green)',  bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.3)',  label: 'APPROVED' },
    rejected: { color: 'var(--amber)',  bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)', label: 'REJECTED' },
    error:    { color: 'var(--red)',    bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.3)',  label: 'ERROR' },
  }
  const { color, bg, border, label } = map[outcome]
  return (
    <span style={{
      fontFamily: "'Space Mono'",
      fontSize: '0.6rem',
      letterSpacing: '0.08em',
      color, background: bg,
      border: `1px solid ${border}`,
      borderRadius: 4,
      padding: '2px 8px',
    }}>
      {label}
    </span>
  )
}

function truncHash(h: string) {
  return h ? `${h.slice(0, 6)}…${h.slice(-4)}` : '—'
}

const FILTERS = ['All', 'Approved', 'Rejected'] as const
type Filter = typeof FILTERS[number]

export default function HistoryPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('All')

  useEffect(() => {
    fetch('/api/logs')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((logs: any[]) => {
        const parsed: HistoryEntry[] = logs.map((l, i) => ({
          id: String(i),
          timestamp: new Date(l.ts || Date.now()).toLocaleString('en-US', { hour12: false }),
          strategy: l.data?.strategy || '—',
          outcome: l.data?.approved === false ? 'rejected'
            : l.event === 'swap_executed' ? 'approved'
            : 'approved',
          routing: l.data?.routing || '—',
          agent: l.agentId || '—',
          txHash: l.data?.txHash,
          sessionId: l.data?.sessionId,
        }))
        setEntries(parsed.reverse())
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = entries.filter(e => {
    if (filter === 'Approved') return e.outcome === 'approved'
    if (filter === 'Rejected') return e.outcome === 'rejected'
    return true
  })

  return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="label-caps" style={{ marginBottom: 6, color: 'var(--blue-glow)' }}>Execution History</div>
            <h1 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '1.6rem', color: 'var(--text-primary)' }}>
              All Runs
            </h1>
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 4 }}>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '5px 14px',
                  fontFamily: "'Space Mono'",
                  fontSize: '0.65rem',
                  letterSpacing: '0.06em',
                  background: filter === f ? 'rgba(37,99,235,0.2)' : 'var(--bg-elevated)',
                  color: filter === f ? 'var(--blue-glow)' : 'var(--text-muted)',
                  border: `1px solid ${filter === f ? 'rgba(37,99,235,0.5)' : 'var(--border)'}`,
                  borderRadius: 5,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {/* Table head */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr 90px 90px 120px 90px',
            gap: 0,
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border)',
            padding: '10px 16px',
          }}>
            {['Time', 'Strategy', 'Outcome', 'Routing', 'Agent', 'Attestation'].map(h => (
              <span key={h} className="label-caps">{h}</span>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <span style={{ fontFamily: "'Space Mono'", fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Fetching…
              </span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <span style={{ fontFamily: "'Space Mono'", fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                No executions yet
              </span>
              <button
                onClick={() => router.push('/terminal')}
                className="btn-ghost"
                style={{ fontSize: '0.78rem', padding: '7px 16px', marginTop: 8 }}
              >
                Run a strategy
              </button>
            </div>
          ) : filtered.map((entry, i) => (
            <div
              key={entry.id}
              onClick={() => router.push('/analysis')}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr 90px 90px 120px 90px',
                gap: 0,
                padding: '12px 16px',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(26,36,64,0.5)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
                alignItems: 'center',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,0.04)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <span style={{ fontFamily: "'Space Mono'", fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {entry.timestamp}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.strategy}
              </span>
              <span><OutcomePill outcome={entry.outcome} /></span>
              <span style={{ fontFamily: "'Space Mono'", fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {entry.routing}
              </span>
              <span style={{ fontFamily: "'Space Mono'", fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {entry.agent}
              </span>
              <span>
                {entry.txHash ? (
                  <a
                    href={`https://sepolia.basescan.org/tx/${entry.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="tx-link"
                    style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.65rem' }}
                  >
                    {truncHash(entry.txHash)} <ExternalLink size={9} />
                  </a>
                ) : (
                  <span style={{ fontFamily: "'Space Mono'", fontSize: '0.65rem', color: 'var(--text-muted)' }}>—</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {!loading && filtered.length > 0 && (
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <span className="label-caps">{filtered.length} execution{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}
