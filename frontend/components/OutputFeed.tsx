'use client'
import { useEffect, useRef } from 'react'

export type OutputPhase = 'research' | 'risk' | 'executor' | 'payment' | 'orchestrator' | 'system'

export interface OutputEntry {
  id: string
  phase: OutputPhase
  timestamp: string
  message: string
  txHash?: string       // Base Sepolia tx → BaseScan
  ogTxHash?: string     // 0G chain tx → chainscan-galileo
  keeperHubId?: string  // KeeperHub workflow/execution ID → app.keeperhub.com
  isError?: boolean
  isHighlight?: boolean
}

const PHASE_LABELS: Record<OutputPhase, string> = {
  research: 'Research',
  risk: 'Risk Guard',
  executor: 'Executor',
  payment: 'x402',
  orchestrator: 'Orchestrator',
  system: 'System',
}

const PHASE_CLASS: Record<OutputPhase, string> = {
  research: 'feed-research',
  risk: 'feed-risk',
  executor: 'feed-executor',
  payment: 'feed-pay',
  orchestrator: 'feed-default',
  system: 'feed-error',
}

// ONE element, ONE text child — zero child splitting
function MessageText({
  message,
  isError,
  phase,
}: {
  message: string
  isError?: boolean
  phase: OutputPhase
}) {
  const cls = isError ? 'feed-error' : PHASE_CLASS[phase]
  return (
    <span
      className={cls}
      translate="no"
      data-gramm="false"
      data-gramm_editor="false"
      data-enable-grammarly="false"
      suppressHydrationWarning
    >
      {message}
    </span>
  )
}

interface OutputFeedProps {
  entries: OutputEntry[]
  running?: boolean
}

export default function OutputFeed({ entries, running }: OutputFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Defer scroll until after browser paint — avoids interfering with React commit
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(raf)
  }, [entries.length])

  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      {entries.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 1,
              height: 40,
              background: 'linear-gradient(transparent, var(--border-md))',
              margin: '0 auto',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: 'var(--fg-4)',
              letterSpacing: '0.08em',
            }}
            translate="no"
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            suppressHydrationWarning
          >
            AWAITING EXECUTION
          </span>
          <div
            style={{
              width: 1,
              height: 40,
              background: 'linear-gradient(var(--border-md), transparent)',
              margin: '0 auto',
            }}
          />
        </div>
      ) : (
        entries.map((entry, index) => {
          // FIX 1: Pure derived computation — no ref mutation during render.
          const showPhaseHeader = index === 0 || entries[index - 1].phase !== entry.phase

          return (
            <div key={entry.id} className="animate-feed-in">
              {/*
                FIX 2: Always render the phase header element — never conditionally
                mount/unmount it. Use CSS visibility to hide it instead of && operator.
                Conditional && children create variable sibling counts that browser
                extensions inject into, causing React's removeChild to fail on the
                next reconciliation when the condition flips.
              */}
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.6rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--fg-3)',
                  padding: showPhaseHeader ? '6px 14px' : '0',
                  height: showPhaseHeader ? undefined : 0,
                  overflow: 'hidden',
                  borderBottom: showPhaseHeader ? '1px solid var(--border)' : 'none',
                  background: 'rgba(0,0,0,0.02)',
                  visibility: showPhaseHeader ? 'visible' : 'hidden',
                }}
                aria-hidden={!showPhaseHeader}
              >
                <span
                  translate="no"
                  data-gramm="false"
                  suppressHydrationWarning
                >
                  {PHASE_LABELS[entry.phase]}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '7px 14px',
                  borderBottom: '1px solid var(--border)',
                  background: entry.isHighlight ? 'rgba(37,99,235,0.03)' : 'transparent',
                }}
              >
                {/* Timestamp — single text child */}
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.62rem',
                    color: 'var(--fg-4)',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                  translate="no"
                  data-gramm="false"
                  data-gramm_editor="false"
                  data-enable-grammarly="false"
                  suppressHydrationWarning
                >
                  {entry.timestamp}
                </span>

                {/* Message column */}
                <div style={{ flex: 1 }}>
                  <MessageText
                    message={entry.message}
                    isError={entry.isError}
                    phase={entry.phase}
                  />

                  {/* ── Explorer links block — always rendered, CSS-hidden when empty ── */}
                  <div
                    style={{
                      marginTop: (entry.txHash || entry.ogTxHash || entry.keeperHubId) ? 6 : 0,
                      height: (entry.txHash || entry.ogTxHash || entry.keeperHubId) ? undefined : 0,
                      overflow: 'hidden',
                      visibility: (entry.txHash || entry.ogTxHash || entry.keeperHubId) ? 'visible' : 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                    }}
                    aria-hidden={!(entry.txHash || entry.ogTxHash || entry.keeperHubId)}
                  >
                    {/* BaseScan link */}
                    <a
                      href={entry.txHash ? `https://sepolia.basescan.org/tx/${entry.txHash}` : '#'}
                      target="_blank" rel="noreferrer"
                      className="tx-link"
                      style={{ fontSize: '0.65rem', display: entry.txHash ? 'inline-flex' : 'none', alignItems: 'center', gap: 4 }}
                      translate="no" data-gramm="false" suppressHydrationWarning
                      tabIndex={entry.txHash ? 0 : -1}
                    >
                      <span style={{ color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: '0.58rem' }}>BaseScan</span>
                      {entry.txHash ?? ''}
                    </a>

                    {/* 0G Chainscan link */}
                    <a
                      href={entry.ogTxHash ? `https://chainscan-galileo.0g.ai/tx/${entry.ogTxHash}` : '#'}
                      target="_blank" rel="noreferrer"
                      className="tx-link"
                      style={{ fontSize: '0.65rem', display: entry.ogTxHash ? 'inline-flex' : 'none', alignItems: 'center', gap: 4 }}
                      translate="no" data-gramm="false" suppressHydrationWarning
                      tabIndex={entry.ogTxHash ? 0 : -1}
                    >
                      <span style={{ color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: '0.58rem' }}>0G Storage</span>
                      {entry.ogTxHash ?? ''}
                    </a>

                    {/* KeeperHub link */}
                    <a
                      href={entry.keeperHubId ? `https://app.keeperhub.com/workflows/${entry.keeperHubId}` : '#'}
                      target="_blank" rel="noreferrer"
                      className="tx-link"
                      style={{ fontSize: '0.65rem', display: entry.keeperHubId ? 'inline-flex' : 'none', alignItems: 'center', gap: 4 }}
                      translate="no" data-gramm="false" suppressHydrationWarning
                      tabIndex={entry.keeperHubId ? 0 : -1}
                    >
                      <span style={{ color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: '0.58rem' }}>KeeperHub</span>
                      {entry.keeperHubId ?? ''}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )
        })
      )}

      {/*
        FIX 4: Running cursor — always same DOM structure.
        CSS-driven visibility, never conditionally mounted.
      */}
      <div
        style={{
          padding: running ? '8px 14px' : '0',
          height: running ? undefined : 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          visibility: running ? 'visible' : 'hidden',
        }}
        aria-hidden={!running}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--blue)',
            display: 'inline-block',
            animation: 'pulseDot 1s ease-in-out infinite',
          }}
        />
        <span
          style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--fg-3)' }}
          translate="no"
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          suppressHydrationWarning
        >
          processing
        </span>
      </div>

      <div ref={bottomRef} />
    </div>
  )
}
