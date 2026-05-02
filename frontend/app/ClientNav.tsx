"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ClientNav() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Render a height placeholder on server so layout doesn't shift
  if (!mounted) {
    return <div style={{ height: 64, flexShrink: 0 }} />
  }

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">Axiom-Fi</Link>
      <div className="nav-links">
        <Link href="/#how-it-works" className="nav-link">How it works</Link>
        <Link href="/agents" className="nav-link">Agents</Link>
        <Link href="/terminal" className="nav-link">Terminal</Link>
        <Link href="/history" className="nav-link">History</Link>
        <Link href="/verify" className="nav-link">Verify</Link>
      </div>
      <Link href="/onboard" className="nav-cta">Launch App</Link>
    </nav>
  )
}
