export type Tier = 'unranked' | 'bronze' | 'silver' | 'gold' | 'axiom'

interface ReputationBadgeProps {
  tier: Tier
  accuracy: number
  totalDecisions: number
  size?: 'sm' | 'md' | 'lg'
  showStats?: boolean
}

const TIER_CONFIG = {
  unranked: { color: '#4a6088', icon: '○', label: 'Unranked', bg: 'rgba(74,96,136,0.12)' },
  bronze:   { color: '#cd7f32', icon: '◉', label: 'Bronze',   bg: 'rgba(205,127,50,0.12)' },
  silver:   { color: '#94a3b8', icon: '◈', label: 'Silver',   bg: 'rgba(148,163,184,0.12)' },
  gold:     { color: '#f59e0b', icon: '◆', label: 'Gold',     bg: 'rgba(245,158,11,0.12)' },
  axiom:    { color: '#60a5fa', icon: '⬡', label: 'Axiom',    bg: 'rgba(96,165,250,0.12)' },
}

const SIZE_MAP = {
  sm: { fontSize: '0.68rem', iconSize: '0.75rem', padding: '3px 8px', gap: 4 },
  md: { fontSize: '0.75rem', iconSize: '0.875rem', padding: '4px 10px', gap: 5 },
  lg: { fontSize: '0.875rem', iconSize: '1rem', padding: '6px 14px', gap: 6 },
}

export default function ReputationBadge({
  tier, accuracy, totalDecisions, size = 'md', showStats = true
}: ReputationBadgeProps) {
  const cfg = TIER_CONFIG[tier]
  const sz  = SIZE_MAP[size]

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: sz.gap, flexWrap: 'wrap' }}>
      {/* Tier pill */}
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: sz.gap,
        padding: sz.padding,
        background: cfg.bg,
        border: `1px solid ${cfg.color}55`,
        borderRadius: 20,
        fontSize: sz.iconSize,
        color: cfg.color,
        fontWeight: 600,
        fontFamily: "'Space Grotesk'",
        animation: tier === 'axiom' ? 'axiomGlow 3s ease-in-out infinite' : 'none',
      }}>
        <span>{cfg.icon}</span>
        <span style={{ fontSize: sz.fontSize }}>{cfg.label}</span>
      </span>

      {showStats && (
        <>
          {/* Accuracy */}
          <span style={{
            fontFamily: "'Space Mono'", fontSize: sz.fontSize,
            color: accuracy >= 75 ? 'var(--rep-axiom)'
                 : accuracy >= 60 ? 'var(--rep-gold)'
                 : accuracy >= 40 ? 'var(--rep-silver)'
                 : 'var(--text-muted)',
            fontWeight: 700,
          }}>
            {accuracy}%
          </span>

          {/* Decisions count */}
          <span style={{ fontFamily: "'Space Mono'", fontSize: sz.fontSize, color: 'var(--text-muted)' }}>
            {totalDecisions}d
          </span>
        </>
      )}
    </div>
  )
}
