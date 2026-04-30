'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PipelineGraph from '@/components/PipelineGraph'
import AgentAnalysisCard from '@/components/AgentAnalysisCard'
import { ArrowLeft } from 'lucide-react'

interface SessionData {
  strategy?: string
  sessionId?: string
  ethPrice?: string
  tvl?: string
  recommendation?: string
  riskDecision?: string
  maxSize?: string
  attestationHash?: string
  txHash?: string
}

export default function AnalysisPage() {
  const router = useRouter()
  const [session, setSession] = useState<SessionData>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('axiom-session')
    if (raw) {
      try { setSession(JSON.parse(raw)) } catch {}
    }
    setLoaded(true)
  }, [])

  if (!loaded) return null

  if (!session.sessionId) {
    return (
      <div style={{
        paddingTop: 96, minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 16,
      }}>
        <span style={{ fontFamily: "'Space Mono'", fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          No session found.
        </span>
        <button
          onClick={() => router.push('/terminal')}
          className="btn-ghost"
          style={{ fontSize: '0.8rem' }}
        >
          Run a strategy first
        </button>
      </div>
    )
  }

  const researchDone  = !!session.ethPrice
  const riskDone      = !!session.riskDecision
  const executorDone  = !!session.txHash
  const isApproved    = session.riskDecision?.includes('APPROVED')

  const graphNodes = [
    { id: 'research',   label: 'RESEARCH',   status: (researchDone ? 'done' : 'pending') as any, color: 'var(--blue-glow)' },
    { id: 'risk-guard', label: 'RISK GUARD', status: (riskDone    ? 'done' : researchDone ? 'running' : 'pending') as any, color: 'var(--amber)' },
    { id: 'executor',   label: 'EXECUTOR',   status: (executorDone ? 'done' : riskDone ? 'running' : 'pending') as any, color: 'var(--green)' },
  ]

  const graphEdges = [
    { from: 'research',   to: 'risk-guard', amount: '$0.005', active: researchDone },
    { from: 'risk-guard', to: 'executor',   amount: '$0.003', active: riskDone },
  ]

  // Parse recommendation text
  const recLines = session.recommendation?.split('\n') ?? []
  const recText = recLines.join('\n')

  const confidence = session.recommendation?.match(/CONFIDENCE:\s*(\d+)/)?.[1]
  const reason = session.recommendation?.match(/REASON:\s*(.+)/)?.[1]

  return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--bg-base)' }}>

      {/* ── Sub-header ──────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-elevated)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        height: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={() => router.push('/terminal')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: "'Space Grotesk'", fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
        >
          <ArrowLeft size={13} /> Terminal
        </button>
        <span style={{ fontFamily: "'Space Mono'", fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          {session.sessionId}
        </span>
        <span style={{
          fontFamily: "'Space Mono'", fontSize: '0.62rem',
          color: isApproved ? 'var(--green)' : 'var(--amber)',
          letterSpacing: '0.08em',
        }}>
          {isApproved ? '✓ APPROVED' : riskDone ? '✗ REJECTED' : '○ IN PROGRESS'}
        </span>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* Strategy row */}
        {session.strategy && (
          <div style={{
            marginBottom: 24,
            padding: '12px 16px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span className="label-caps">Strategy</span>
            <span style={{ fontFamily: "'Space Mono'", fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {session.strategy}
            </span>
          </div>
        )}

        {/* Pipeline graph */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          marginBottom: 20,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
            <span className="label-caps">Execution Flow</span>
          </div>
          <PipelineGraph nodes={graphNodes} edges={graphEdges} />
        </div>

        {/* 3-column agent analysis */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 16,
          alignItems: 'start',
        }}>
          {/* Research */}
          <AgentAnalysisCard
            title="Research"
            status={researchDone ? 'done' : 'pending'}
            color="var(--blue-glow)"
            metrics={[
              { label: 'ETH Price', value: session.ethPrice ?? '—', highlight: true },
              { label: 'Uniswap TVL', value: session.tvl ?? '—' },
              { label: 'Confidence', value: confidence ? `${confidence}/100` : '—' },
              { label: 'Reasoning', value: reason ? reason.slice(0, 28) + '…' : '—' },
            ]}
            rawOutput={recText || undefined}
          />

          {/* Risk Guard */}
          <AgentAnalysisCard
            title="Risk Guard"
            status={riskDone ? (isApproved ? 'done' : 'failed') : 'pending'}
            color="var(--amber)"
            metrics={[
              { label: 'Decision', value: isApproved ? 'APPROVED' : riskDone ? 'REJECTED' : '—', highlight: true },
              { label: 'Max Position', value: session.maxSize?.match(/MaxSize:\s*([\d.]+)/)?.[1] ? `${session.maxSize?.match(/MaxSize:\s*([\d.]+)/)?.[1]} ETH` : '—' },
              { label: 'Flags', value: session.riskDecision?.includes('none') ? 'none' : '—' },
              { label: 'Exposure', value: '10%' },
            ]}
            rawOutput={session.riskDecision || undefined}
          />

          {/* Executor */}
          <AgentAnalysisCard
            title="Executor"
            status={executorDone ? 'done' : riskDone && isApproved ? 'running' : 'pending'}
            color="var(--green)"
            metrics={[
              { label: 'Routing',  value: '—' },
              { label: 'Protocol', value: '—' },
              { label: 'Status', value: executorDone ? 'EXECUTED' : isApproved ? 'PENDING' : 'SKIPPED', highlight: executorDone },
              { label: 'Chain', value: 'Base Sepolia' },
            ]}
            rawOutput={executorDone ? 'Swap calldata built and submitted to KeeperHub for guaranteed execution.' : undefined}
            txHash={session.txHash}
            attestationHash={session.attestationHash}
          />
        </div>
      </div>
    </div>
  )
}
