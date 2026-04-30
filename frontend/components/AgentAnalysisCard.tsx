'use client'

interface AgentMetric {
  label: string
  value: string
  highlight?: boolean
}

interface AgentAnalysisCardProps {
  title: string
  status: 'done' | 'failed' | 'running' | 'pending'
  metrics: AgentMetric[]
  rawOutput?: string
  txHash?: string
  attestationHash?: string
  color?: string
}

const STATUS_COLORS = {
  done:    'var(--green)',
  failed:  'var(--red)',
  running: 'var(--blue-glow)',
  pending: 'var(--text-muted)',
}

const STATUS_LABELS = {
  done:    '✓ DONE',
  failed:  '✗ FAILED',
  running: '◌ RUNNING',
  pending: '— PENDING',
}

export default function AgentAnalysisCard({
  title,
  status,
  metrics,
  rawOutput,
  txHash,
  attestationHash,
  color = 'var(--blue-glow)',
}: AgentAnalysisCardProps) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid rgba(26,36,64,0.8)`,
      borderTop: `2px solid ${color}`,
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      height: '100%',
    }}>
      {/* Card header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-elevated)',
      }}>
        <span style={{
          fontFamily: "'Space Mono'",
          fontSize: '0.72rem',
          fontWeight: 700,
          color,
          letterSpacing: '0.06em',
        }}>
          {title}
        </span>
        <span style={{
          fontFamily: "'Space Mono'",
          fontSize: '0.6rem',
          color: STATUS_COLORS[status],
          letterSpacing: '0.1em',
        }}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Metrics grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        background: 'var(--border)',
        borderBottom: '1px solid var(--border)',
      }}>
        {metrics.map((m, i) => (
          <div key={i} style={{
            padding: '10px 14px',
            background: 'var(--bg-surface)',
          }}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{
              color: m.highlight ? color : 'var(--text-mono)',
            }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Raw output */}
      {rawOutput && (
        <div style={{
          flex: 1,
          padding: '12px 14px',
          overflowY: 'auto',
          borderBottom: txHash || attestationHash ? '1px solid var(--border)' : 'none',
        }}>
          <div className="label-caps" style={{ marginBottom: 8 }}>Output</div>
          <pre style={{
            fontFamily: "'Space Mono'",
            fontSize: '0.72rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
          }}>
            {rawOutput}
          </pre>
        </div>
      )}

      {/* Footer links */}
      {(txHash || attestationHash) && (
        <div style={{
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          background: 'var(--bg-elevated)',
        }}>
          {attestationHash && (
            <a
              href={`https://sepolia.basescan.org/tx/${attestationHash}`}
              target="_blank"
              rel="noreferrer"
              className="tx-link"
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>Attestation</span>
              <span>{attestationHash.slice(0, 6)}…{attestationHash.slice(-4)} ↗</span>
            </a>
          )}
          {txHash && (
            <a
              href={`https://sepolia.basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="tx-link"
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>Tx Hash</span>
              <span>{txHash.slice(0, 6)}…{txHash.slice(-4)} ↗</span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}
