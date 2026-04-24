import ReputationBadge, { type Tier } from './ReputationBadge'

export type AgentStatus = 'idle' | 'working' | 'waiting'

export interface AgentInfo {
  id: string
  name: string
  type: 'research' | 'risk-guard' | 'executor'
  tier: Tier
  accuracy: number
  totalDecisions: number
  fee: string
  status: AgentStatus
}

const TYPE_ACCENT: Record<string, string> = {
  research:   'var(--blue-bright)',
  'risk-guard': 'var(--amber)',
  executor:   'var(--green)',
}

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle:    'Idle',
  working: 'Working',
  waiting: 'Waiting',
}

export default function AgentStatusCard({ agent }: { agent: AgentInfo }) {
  const accent = TYPE_ACCENT[agent.type]
  const isWorking = agent.status === 'working'

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: `1px solid ${isWorking ? accent + '55' : 'var(--border)'}`,
      borderRadius: 8,
      padding: '14px 16px',
      animation: isWorking ? 'activePulse 2s ease-in-out infinite' : 'none',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 6,
            background: `${accent}18`,
            border: `1px solid ${accent}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', color: accent,
          }}>
            {agent.type === 'research' ? '🔍' : agent.type === 'risk-guard' ? '🛡' : '⚡'}
          </span>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {agent.name}
            </div>
            <div className="label-caps" style={{ marginTop: 1 }}>{agent.type}</div>
          </div>
        </div>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className={`status-dot ${agent.status}`} />
          <span style={{ fontFamily: "'Space Mono'", fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            {STATUS_LABEL[agent.status]}
          </span>
        </div>
      </div>

      {/* Reputation badge row */}
      <ReputationBadge tier={agent.tier} accuracy={agent.accuracy} totalDecisions={agent.totalDecisions} size="sm" />

      {/* Stats row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12,
      }}>
        <div style={{ background: 'var(--bg-surface)', borderRadius: 6, padding: '8px 10px' }}>
          <div className="label-caps" style={{ marginBottom: 3 }}>x402 fee</div>
          <div style={{ fontFamily: "'Space Mono'", fontSize: '0.8rem', color: 'var(--text-mono)' }}>
            {agent.fee}
          </div>
        </div>
        <div style={{ background: 'var(--bg-surface)', borderRadius: 6, padding: '8px 10px' }}>
          <div className="label-caps" style={{ marginBottom: 3 }}>decisions</div>
          <div style={{ fontFamily: "'Space Mono'", fontSize: '0.8rem', color: 'var(--text-primary)' }}>
            {agent.totalDecisions}
          </div>
        </div>
      </div>
    </div>
  )
}
