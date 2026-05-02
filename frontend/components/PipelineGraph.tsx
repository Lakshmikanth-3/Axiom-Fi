'use client'

interface PipelineNode {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'failed'
  color: string
}

interface PipelineEdge {
  from: string
  to: string
  amount: string
  active: boolean
}

interface PipelineGraphProps {
  nodes: PipelineNode[]
  edges: PipelineEdge[]
}

const STATUS_BG: Record<string, string> = {
  pending: 'rgba(26,36,64,0.6)',
  running: 'rgba(37,99,235,0.15)',
  done: 'rgba(34,197,94,0.1)',
  failed: 'rgba(239,68,68,0.1)',
}

const STATUS_BORDER: Record<string, string> = {
  pending: 'rgba(26,36,64,0.8)',
  running: 'rgba(37,99,235,0.6)',
  done: 'rgba(34,197,94,0.5)',
  failed: 'rgba(239,68,68,0.5)',
}

const STATUS_ICON: Record<string, string> = {
  pending: '○',
  running: '◌',
  done: '✓',
  failed: '✗',
}

export default function PipelineGraph({ nodes, edges }: PipelineGraphProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0,
      padding: '24px 40px',
      width: '100%',
    }}>
      {nodes.map((node, i) => (
        <div key={node.id} style={{ display: 'flex', alignItems: 'center', flex: i < nodes.length - 1 ? 1 : 0 }}>
          {/* Node */}
          <div style={{
            background: STATUS_BG[node.status],
            border: `1px solid ${STATUS_BORDER[node.status]}`,
            borderRadius: 8,
            padding: '14px 20px',
            minWidth: 120,
            textAlign: 'center',
            position: 'relative',
            transition: 'all 0.4s ease',
            boxShadow: node.status === 'running'
              ? '0 0 20px rgba(37,99,235,0.2)'
              : node.status === 'done'
                ? '0 0 12px rgba(34,197,94,0.1)'
                : 'none',
          }}>
            {/* Status icon */}
            <div style={{
              fontFamily: "'Space Mono'",
              fontSize: '1rem',
              color: node.color,
              marginBottom: 6,
              animation: node.status === 'running' ? 'spinSlow 2s linear infinite' : 'none',
            }}>
              {STATUS_ICON[node.status]}
            </div>
            <div style={{
              fontFamily: "'Space Mono'",
              fontSize: '0.68rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: node.status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)',
            }}>
              {node.label}
            </div>
          </div>

          {/* Edge connector */}
          {i < nodes.length - 1 && (() => {
            const edge = edges[i]
            return (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', minWidth: 60 }}>
                {/* Payment amount */}
                <span style={{
                  fontFamily: "'Space Mono'",
                  fontSize: '0.6rem',
                  color: edge.active ? 'var(--text-mono)' : 'var(--text-muted)',
                  marginBottom: 4,
                  transition: 'color 0.3s ease',
                }}>
                  {edge.amount}
                </span>
                {/* Arrow line */}
                <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <div style={{
                    flex: 1,
                    height: 1,
                    background: edge.active
                      ? 'linear-gradient(90deg, var(--blue-glow), var(--blue-dim))'
                      : 'var(--border)',
                    position: 'relative',
                    transition: 'background 0.4s ease',
                    overflow: 'hidden',
                  }}>
                    {edge.active && (
                      <div style={{
                        position: 'absolute',
                        top: 0, left: 0,
                        width: '30%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                        animation: 'dashFlow 1.2s ease-in-out infinite',
                      }} />
                    )}
                  </div>
                  <span style={{
                    color: edge.active ? 'var(--blue-glow)' : 'var(--text-muted)',
                    fontSize: '0.7rem',
                    lineHeight: 1,
                  }}>›</span>
                </div>
              </div>
            )
          })()}
        </div>
      ))}
    </div>
  )
}
