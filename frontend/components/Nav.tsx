'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Hexagon, ExternalLink } from 'lucide-react'

export default function Nav() {
  const path = usePathname()
  const links = [
    { href: '/terminal', label: 'Terminal' },
    { href: '/agents',   label: 'Agents' },
    { href: '/portfolio', label: 'Portfolio' },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: 'rgba(5, 8, 16, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(26, 36, 64, 0.8)',
      height: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px',
    }}>
      {/* Logo */}
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <Hexagon size={22} color="var(--blue-glow)" fill="rgba(96,165,250,0.15)" />
        <span style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          AXIOM
        </span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {links.map(l => (
          <Link key={l.href} href={l.href} style={{
            padding: '6px 14px',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: path === l.href ? 'var(--blue-glow)' : 'var(--text-secondary)',
            background: path === l.href ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
            border: path === l.href ? '1px solid rgba(37,99,235,0.3)' : '1px solid transparent',
            transition: 'all 0.2s ease',
          }}>
            {l.label}
          </Link>
        ))}
      </div>

      {/* Status pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 14px',
        background: 'rgba(34, 197, 94, 0.08)',
        border: '1px solid rgba(34, 197, 94, 0.25)',
        borderRadius: 20,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
        <span style={{ fontFamily: "'Space Mono'", fontSize: '0.7rem', color: 'var(--green)' }}>BASE SEPOLIA</span>
      </div>
    </nav>
  )
}
