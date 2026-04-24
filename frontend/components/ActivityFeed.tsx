'use client'
import { useEffect, useRef } from 'react'
import { Link2, Coins, Brain, Shield, Zap, AlertCircle } from 'lucide-react'
import type { Tier } from './ReputationBadge'

export type FeedEntryType = 'research' | 'risk-guard' | 'executor' | 'payment' | 'attestation' | 'orchestrator'

export interface FeedEntry {
  id: string
  type: FeedEntryType
  agentName: string
  tier: Tier
  action: string
  fee?: string
  txHash?: string
  timestamp: string
}

const TYPE_CONFIG: Record<FeedEntryType, { borderColor: string; icon: React.ReactNode; bg: string }> = {
  research:     { borderColor: 'var(--blue-dim)',   icon: <Brain size={12} />,     bg: 'rgba(29,78,216,0.08)' },
  'risk-guard': { borderColor: 'var(--amber)',      icon: <Shield size={12} />,    bg: 'rgba(245,158,11,0.08)' },
  executor:     { borderColor: 'var(--green)',      icon: <Zap size={12} />,       bg: 'rgba(34,197,94,0.08)' },
  payment:      { borderColor: 'var(--txt-mono)',   icon: <Coins size={12} />,     bg: 'rgba(125,211,252,0.08)' },
  attestation:  { borderColor: '#a78bfa',           icon: <Link2 size={12} />,     bg: 'rgba(167,139,250,0.08)' },
  orchestrator: { borderColor: 'var(--blue-glow)',  icon: <AlertCircle size={12} />, bg: 'rgba(96,165,250,0.08)' },
}

const TIER_COLORS: Record<Tier, string> = {
  unranked: '#4a6088',
  bronze:   '#cd7f32',
  silver:   '#94a3b8',
  gold:     '#f59e0b',
  axiom:    '#60a5fa',
}

function truncHash(hash: string) {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}

export function ActivityFeedItem({ entry, index = 0 }: { entry: FeedEntry; index?: number }) {
  const cfg = TYPE_CONFIG[entry.type]

  return (
    <div
      className="animate-feed-in"
      style={{
        animationDelay: `${index * 40}ms`,
        display: 'flex', gap: 10, padding: '10px 14px',
        background: cfg.bg,
        borderLeft: `2px solid ${cfg.borderColor}`,
        borderBottom: '1px solid rgba(26,36,64,0.5)',
        opacity: 0,
        animationFillMode: 'forwards',
      }}
    >
      {/* Icon + timestamp col */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 20 }}>
        <span style={{ color: cfg.borderColor, opacity: 0.8 }}>{cfg.icon}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: "'Space Mono'", fontSize: '0.65rem', color: 'var(--text-muted)'
          }}>
            {entry.timestamp}
          </span>
          <span style={{
            fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)'
          }}>
            {entry.agentName}
          </span>
          <span style={{
            fontSize: '0.65rem', padding: '1px 6px',
            background: `${TIER_COLORS[entry.tier]}18`,
            border: `1px solid ${TIER_COLORS[entry.tier]}44`,
            borderRadius: 10, color: TIER_COLORS[entry.tier],
            fontWeight: 600,
          }}>
            {entry.tier}
          </span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
          {entry.action}
        </p>
        {(entry.fee || entry.txHash) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            {entry.fee && (
              <span style={{ fontFamily: "'Space Mono'", fontSize: '0.7rem', color: 'var(--text-mono)' }}>
                fee: {entry.fee}
              </span>
            )}
            {entry.txHash && (
              <a
                href={`https://sepolia.basescan.org/tx/${entry.txHash}`}
                target="_blank" rel="noreferrer"
                className="tx-link"
              >
                {truncHash(entry.txHash)} ↗
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ActivityFeed({ entries }: { entries: FeedEntry[] }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {entries.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8,
          color: 'var(--text-muted)',
        }}>
          <span style={{ fontSize: '1.5rem', opacity: 0.3 }}>⟳</span>
          <span style={{ fontFamily: "'Space Mono'", fontSize: '0.75rem' }}>Awaiting strategy input…</span>
        </div>
      ) : (
        entries.map((e, i) => <ActivityFeedItem key={e.id} entry={e} index={i} />)
      )}
      <div ref={bottomRef} />
    </div>
  )
}
