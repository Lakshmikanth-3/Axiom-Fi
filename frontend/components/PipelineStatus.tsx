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
    pending: { text: 'PENDING', color: 'var(--fg-4)' },
    running: { text: 'RUNNING', color: 'var(--blue)' },
    done: { text: 'DONE', color: 'var(--green)' },
    failed: { text: 'FAILED', color: 'var(--red)' },
  }
  const { text, color } = map[status]
  return (
    <span
      translate="no"
      data-gramm="false"
      data-gramm_editor="false"
      data-enable-grammarly="false"
      suppressHydrationWarning
      style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.1em', color, fontWeight: 700 }}
    >
      {text}
    </span>
  )
}

function StepRow({ step, index }: { step: PipelineStep; index: number }) {
  return (
    <div className={`step-row ${step.status}`}>
      <span
        translate="no"
        data-gramm="false"
        suppressHydrationWarning
        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--fg-4)', minWidth: 16 }}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className={`status-dot ${step.status}`} />
      <span
        translate="no"
        data-gramm="false"
        suppressHydrationWarning
        style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500, color: step.status === 'pending' ? 'var(--fg-3)' : 'var(--fg)' }}
      >
        {step.label}
      </span>
      <StatusLabel status={step.status} />
    </div>
  )
}

function PaymentRow({ label, amount, sent }: { label: string; amount: string; sent: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: sent ? 'var(--green)' : 'transparent',
        border: sent ? 'none' : '1px solid var(--fg-4)',
        boxShadow: sent ? '0 0 4px rgba(22,163,74,0.5)' : 'none',
        transition: 'all 0.4s ease',
      }} />
      <span
        translate="no"
        data-gramm="false"
        suppressHydrationWarning
        style={{ flex: 1, fontSize: '0.75rem', color: sent ? 'var(--fg-2)' : 'var(--fg-3)' }}
      >
        {label}
      </span>
      <span
        translate="no"
        data-gramm="false"
        suppressHydrationWarning
        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: sent ? 'var(--blue)' : 'var(--fg-4)' }}
      >
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

export default function PipelineStatus({ steps, payments, onViewAnalysis, isComplete }: PipelineStatusProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '14px', gap: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 6 }}>Pipeline</div>
        {steps.map((step, i) => <StepRow key={step.id} step={step} index={i} />)}
      </div>

      <div style={{ position: 'relative', height: 1, background: 'var(--border)' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: 1,
          background: 'linear-gradient(90deg, var(--blue), transparent)',
          width: steps.filter(s => s.status === 'done').length === 0 ? '0%' :
            steps.filter(s => s.status === 'done').length === 1 ? '33%' :
              steps.filter(s => s.status === 'done').length === 2 ? '66%' : '100%',
          transition: 'width 0.6s ease',
        }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 6 }}>Payments</div>
        {payments.map((p, i) => <PaymentRow key={i} label={p.label} amount={p.amount} sent={p.sent} />)}
      </div>

      <div style={{ flex: 1 }} />

      {/* FIX: always rendered — CSS-driven visibility, never conditionally mounted */}
      <div
        style={{
          height: isComplete && onViewAnalysis ? undefined : 0,
          overflow: 'hidden',
          visibility: isComplete && onViewAnalysis ? 'visible' : 'hidden',
        }}
        aria-hidden={!(isComplete && onViewAnalysis)}
      >
        <button
          onClick={onViewAnalysis}
          className="btn btn-outline"
          style={{ width: '100%', justifyContent: 'center', fontSize: '0.82rem' }}
          tabIndex={isComplete && onViewAnalysis ? 0 : -1}
        >
          View Analysis
        </button>
      </div>
    </div>
  )
}
