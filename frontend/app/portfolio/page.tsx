'use client'
import { useState, useEffect } from 'react'
import ReputationBadge from '@/components/ReputationBadge'
import { TrendingUp, TrendingDown, ExternalLink, DollarSign } from 'lucide-react'

export default function PortfolioPage() {
  const [positions, setPositions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch('/api/logs')
        if (res.ok) {
          const logs = await res.json()
          const swaps = logs.filter((l: any) => l.event === 'swap_executed')
          setPositions(swaps.map((s: any) => ({
            id: s.txHash,
            asset: 'ETH/USDC', // Derived from log data in real app
            entry: '$3,214.00', // Mock price for now
            current: '$3,441.50',
            pnlPct: '+7.1%',
            positive: true,
            agent: s.agentId,
            decisionHash: s.txHash
          })))
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchLogs()
  }, [])

  function truncHash(h: string) { return h ? `${h.slice(0,6)}…${h.slice(-4)}` : '' }

  return (
    <main style={{ paddingTop: 80, minHeight: '100vh', padding: '80px 32px 60px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'Space Mono'", fontSize: '0.72rem', color: 'var(--blue-glow)', marginBottom: 8, letterSpacing: '0.08em' }}>
            PORTFOLIO
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '2.2rem' }}>
            Position Overview
          </h1>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontFamily: "'Space Grotesk'", fontWeight: 600, fontSize: '1rem' }}>Live Executions</h2>
            <span className="label-caps">from 0G storage</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Space Grotesk'", fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  {['Asset', 'PnL', 'Agent', 'Attestation'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.72rem',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} style={{ padding: 20, color: 'var(--text-muted)' }}>Fetching from 0G…</td></tr>
                ) : positions.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: 20, color: 'var(--text-muted)' }}>No positions found. Submit a strategy to start.</td></tr>
                ) : positions.map((pos, i) => (
                  <tr key={pos.id} style={{ borderBottom: i < positions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{pos.asset}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <TrendingUp size={13} color="var(--green)" />
                        <span style={{ fontFamily: "'Space Mono'", fontSize: '0.8rem', fontWeight: 700, color: 'var(--green)' }}>{pos.pnlPct}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>{pos.agent}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <a href={`https://sepolia.basescan.org/tx/${pos.decisionHash}`} target="_blank" rel="noreferrer" className="tx-link" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {truncHash(pos.decisionHash)} <ExternalLink size={10} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
