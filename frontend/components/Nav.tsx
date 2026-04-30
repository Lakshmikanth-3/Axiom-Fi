'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/terminal',    label: 'Terminal' },
  { href: '/agents',      label: 'Marketplace' },
  { href: '/portfolio',   label: 'Portfolio' },
  { href: '/analysis',    label: 'Analysis' },
  { href: '/verify',      label: 'Verify' },
]

export default function Nav() {
  const path = usePathname()

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 56,
      background: 'rgba(5,8,16,0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(26,36,64,0.8)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px',
    }}>
      {/* Logo */}
      <Link href="/" style={{
        textDecoration: 'none',
        fontFamily: "'Space Mono'",
        fontSize: '0.9rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
        color: 'var(--blue-glow)',
        marginRight: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--blue-glow)',
          boxShadow: '0 0 8px var(--blue-glow)',
          display: 'inline-block',
        }} />
        AXIOM
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              style={{
                textDecoration: 'none',
                padding: '6px 14px',
                borderRadius: 5,
                fontFamily: "'Space Grotesk'",
                fontSize: '0.825rem',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                background: active ? 'rgba(37,99,235,0.12)' : 'transparent',
                border: active ? '1px solid rgba(37,99,235,0.25)' : '1px solid transparent',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Chain indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: "'Space Mono'",
        fontSize: '0.65rem',
        color: 'var(--text-muted)',
      }}>
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: 'var(--green)',
          boxShadow: '0 0 4px var(--green)',
        }} />
        Base Sepolia
      </div>
    </nav>
  )
}
