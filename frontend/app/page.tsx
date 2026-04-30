import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <main>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Mesh gradient */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: `
            radial-gradient(ellipse 70% 55% at 20% 40%, rgba(37,99,235,0.28) 0%, transparent 70%),
            radial-gradient(ellipse 50% 45% at 80% 65%, rgba(96,165,250,0.14) 0%, transparent 70%),
            radial-gradient(ellipse 35% 35% at 50% 10%, rgba(29,78,216,0.18) 0%, transparent 60%),
            #050810
          `,
          animation: 'meshShift 10s ease-in-out infinite alternate',
        }} />

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1,
          backgroundImage: `
            linear-gradient(rgba(30,58,110,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(30,58,110,0.12) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }} />

        {/* Hero content */}
        <div style={{
          position: 'relative', zIndex: 5,
          textAlign: 'center',
          maxWidth: 680,
          padding: '0 24px',
        }}>
          {/* Live badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '5px 14px',
            background: 'rgba(37,99,235,0.08)',
            border: '1px solid rgba(37,99,235,0.25)',
            borderRadius: 20,
            marginBottom: 32,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--green)',
              boxShadow: '0 0 6px var(--green)',
              animation: 'pulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontFamily: "'Space Mono'", fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              LIVE · BASE SEPOLIA · ETHGlobal OpenAgents
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Space Grotesk'",
            fontWeight: 700,
            fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            marginBottom: 22,
          }}>
            Trade with agents that have{' '}
            <span style={{ color: 'var(--blue-glow)' }}>skin in the game.</span>
          </h1>

          <p style={{
            fontFamily: "'Space Grotesk'",
            fontWeight: 400,
            fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            maxWidth: 500,
            margin: '0 auto 44px',
          }}>
            An agentic DeFi terminal that pays, verifies, and holds its agents accountable on-chain.
          </p>

          <Link
            href="/terminal"
            className="btn-primary"
            style={{ textDecoration: 'none', fontSize: '1rem', padding: '14px 32px' }}
          >
            Open Terminal <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  )
}
