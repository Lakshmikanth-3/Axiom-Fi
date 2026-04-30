'use client'
import { useEffect, useRef } from 'react'

export type OutputPhase = 'research' | 'risk' | 'executor' | 'payment' | 'orchestrator' | 'system'

export interface OutputEntry {
  id: string
  phase: OutputPhase
  timestamp: string
  message: string
  txHash?: string
  isError?: boolean
  isHighlight?: boolean
}

const PHASE_COLORS: Record<OutputPhase, string> = {
  research:     'var(--blue-glow)',
  risk:         'var(--amber)',
  executor:     'var(--green)',
  payment:      'var(--text-mono)',
  orchestrator: 'var(--text-secondary)',
  system:       'var(--red)',
}

const PHASE_LABELS: Record<OutputPhase, string> = {
  research:     'Research',
  risk:         'Risk Guard',
  executor:     'Executor',
  payment:      'x402',
  orchestrator: 'Orchestrator',
  system:       'System',
}

function PhaseTag({ phase }: { phase: OutputPhase }) {
  return (
    <span style={{
      fontFamily: "'Space Mono'",
      fontSize: '0.58rem',
      letterSpacing: '0.08em',
      color: PHASE_COLORS[phase],
      textTransform: 'uppercase',
      minWidth: 70,
      flexShrink: 0,
    }}>
      {PHASE_LABELS[phase]}
    </span>
  )
}

// Extract and colorize key values in a message
function MessageText({ message, isError }: { message: string; isError?: boolean }) {
  if (isError) {
    return (
      <span style={{ color: 'var(--red)', fontFamily: "'Space Mono'", fontSize: '0.75rem' }}>
        {message}
      </span>
    )
  }

  // Highlight tx hashes (0x...), prices ($X,XXX), percentages
  const parts = message.split(/(0x[a-fA-F0-9]{6,}|\$[\d,.]+|[-+]?\d+\.?\d+%|\d+\.\d+[BM]?)/g)
  return (
    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
      {parts.map((part, i) => {
        if (/^0x[a-fA-F0-9]{6,}/.test(part)) {
          return (
            <span key={i} style={{ color: 'var(--text-mono)', fontFamily: "'Space Mono'", fontSize: '0.72rem' }}>
              {part.length > 14 ? `${part.slice(0, 6)}…${part.slice(-4)}` : part}
            </span>
          )
        }
        if (/^\$[\d,.]+/.test(part)) {
          return <span key={i} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{part}</span>
        }
        if (/[-+]?\d+\.?\d+%/.test(part)) {
          const isNeg = part.startsWith('-')
          return <span key={i} style={{ color: isNeg ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{part}</span>
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

interface OutputFeedProps {
  entries: OutputEntry[]
  running?: boolean
}

let lastPhase: OutputPhase | null = null

export default function OutputFeed({ entries, running }: OutputFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  lastPhase = null

  return (
    <div style={{
      flex: 1,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {entries.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={{
            width: 1,
            height: 40,
            background: 'linear-gradient(transparent, var(--border))',
            margin: '0 auto',
          }} />
          <span style={{
            fontFamily: "'Space Mono'",
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
          }}>
            AWAITING EXECUTION
          </span>
          <div style={{
            width: 1,
            height: 40,
            background: 'linear-gradient(var(--border), transparent)',
            margin: '0 auto',
          }} />
        </div>
      ) : (
        entries.map((entry, i) => {
          const showPhaseHeader = entry.phase !== lastPhase
          if (showPhaseHeader) lastPhase = entry.phase

          return (
            <div key={entry.id} className="animate-feed-in">
              {showPhaseHeader && (
                <div className="phase-label">
                  {PHASE_LABELS[entry.phase]}
                </div>
              )}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '7px 14px',
                borderBottom: `1px solid rgba(26,36,64,0.4)`,
                background: entry.isHighlight ? 'rgba(37,99,235,0.04)' : 'transparent',
              }}>
                {/* Timestamp */}
                <span style={{
                  fontFamily: "'Space Mono'",
                  fontSize: '0.62rem',
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                  marginTop: 2,
                }}>
                  {entry.timestamp}
                </span>

                {/* Message */}
                <div style={{ flex: 1 }}>
                  <MessageText message={entry.message} isError={entry.isError} />
                  {entry.txHash && (
                    <div style={{ marginTop: 3 }}>
                      <a
                        href={`https://sepolia.basescan.org/tx/${entry.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="tx-link"
                        style={{ fontSize: '0.65rem' }}
                      >
                        {entry.txHash.slice(0, 6)}…{entry.txHash.slice(-4)} ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}

      {/* Running cursor */}
      {running && (
        <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--blue-glow)',
            display: 'inline-block',
            animation: 'nodePulse 1s ease-in-out infinite',
            boxShadow: '0 0 6px var(--blue-glow)',
          }} />
          <span style={{ fontFamily: "'Space Mono'", fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            processing
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
