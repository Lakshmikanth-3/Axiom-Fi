'use client'

export type StepStatus = 'pending' | 'running' | 'done' | 'failed'

export interface PipelineStep {
  id: string
  label: string
  status: StepStatus
  paymentAmount?: string
  paymentSent?: boolean
  detail?: string
}

function StatusLabel({ status }: { status: StepStatus }) {
  const map: Record<StepStatus, { text: string; color: string }> = {
    pending: { text: 'PENDING',  color: 'var(--text-muted)' },
    running: { text: 'RUNNING',  color: 'var(--blue-glow)' },
    done:    { text: 'DONE',     color: 'var(--green)' },
    failed:  { text: 'FAILED',   color: 'var(--red)' },
  }
  const { text, color } = map[status]
  return (
    <span style={{
      fontFamily: "'Space Mono'",
      fontSize: '0.62rem',
      letterSpacing: '0.1em',
      color,
      fontWeight: 700,
    }}>
      {text}
    </span>
  )
}

function StepRow({ step, index }: { step: PipelineStep; index: number }) {
  return (
    <div className={`step-row ${step.status}`}>
      {/* Index */}
      <span style={{
        fontFamily: "'Space Mono'",
        fontSize: '0.65rem',
        color: 'var(--text-muted)',
        minWidth: 16,
      }}>
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Status dot */}
      <span className={`status-dot ${step.status}`} />

      {/* Label */}
      <span style={{
        flex: 1,
        fontSize: '0.82rem',
        fontWeight: 500,
        color: step.status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)',
      }}>
        {step.label}
      </span>

      {/* Status label */}
      <StatusLabel status={step.status} />
    </div>
  )
}

interface PaymentRowProps {
  label: string
  amount: string
  sent: boolean
}

function PaymentRow({ label, amount, sent }: PaymentRowProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 0',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: sent ? 'var(--green)' : 'var(--step-pending)',
        border: sent ? 'none' : '1px solid var(--text-muted)',
        boxShadow: sent ? '0 0 4px rgba(34,197,94,0.5)' : 'none',
        transition: 'all 0.4s ease',
      }} />
      <span style={{
        flex: 1, fontSize: '0.75rem',
        color: sent ? 'var(--text-secondary)' : 'var(--text-muted)',
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'Space Mono'",
        fontSize: '0.72rem',
        color: sent ? 'var(--text-mono)' : 'var(--text-muted)',
      }}>
        {amount}
      </span>
    </div>
  )
}

interface PipelineStatusProps {
  steps: PipelineStep[]
  payments: { label: string; amount: string; sent: boolean }[]
  onViewAnalysis?: () => void
  isComplete?: boolean
  sessionId?: string
}

export default function PipelineStatus({
  steps,
  payments,
  onViewAnalysis,
  isComplete,
  sessionId,
}: PipelineStatusProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '14px',
      gap: 16,
      overflow: 'hidden',
    }}>

      {/* Pipeline steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="label-caps" style={{ marginBottom: 6 }}>Pipeline</div>
        {steps.map((step, i) => (
          <StepRow key={step.id} step={step} index={i} />
        ))}
      </div>

      {/* Connector visual */}
      <div style={{ position: 'relative', height: 1, background: 'var(--border)' }}>
        <div style={{
          position: 'absolute',
          left: 0, top: 0,
          height: 1,
          background: 'linear-gradient(90deg, var(--blue-glow), transparent)',
          width: steps.filter(s => s.status === 'done').length === 0 ? '0%' :
                 steps.filter(s => s.status === 'done').length === 1 ? '33%' :
                 steps.filter(s => s.status === 'done').length === 2 ? '66%' : '100%',
          transition: 'width 0.6s ease',
        }} />
      </div>

      {/* x402 Payments */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div className="label-caps" style={{ marginBottom: 6 }}>Payments</div>
        {payments.map((p, i) => (
          <PaymentRow key={i} label={p.label} amount={p.amount} sent={p.sent} />
        ))}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* View Analysis CTA */}
      {isComplete && onViewAnalysis && (
        <button
          onClick={onViewAnalysis}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'rgba(37,99,235,0.12)',
            border: '1px solid rgba(37,99,235,0.4)',
            borderRadius: 6,
            color: 'var(--blue-glow)',
            fontFamily: "'Space Grotesk'",
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'background 0.2s ease, border-color 0.2s ease',
            animation: 'fadeUp 0.4s ease-out forwards',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,0.2)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.7)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(37,99,235,0.12)'
            ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(37,99,235,0.4)'
          }}
        >
          View Analysis →
        </button>
      )}
    </div>
  )
}
