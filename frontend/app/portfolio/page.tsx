'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import { ethers } from 'ethers'
import { REPUTATION_LEDGER_ADDRESS, REPUTATION_LEDGER_ABI, RPC_URL } from '@/lib/contracts'
import { TrendingUp, TrendingDown, Target, Wallet, BarChart3, Clock, ExternalLink } from 'lucide-react'

export default function PortfolioPage() {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ pnl: '+0.00%', winRate: '0%', totalTrades: 0 })

  useEffect(() => {
    async function fetchOnChainHistory() {
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL)
        const contract = new ethers.Contract(REPUTATION_LEDGER_ADDRESS, REPUTATION_LEDGER_ABI, provider)

        // Fetch recent OutcomeRecorded events (last 5000 blocks)
        const filter = contract.filters.OutcomeRecorded()
        const events = await contract.queryFilter(filter, -5000)

        const trades = await Promise.all(events.slice(-10).reverse().map(async (event: any) => {
          const { decisionHash, wasCorrect, pnlDeltaBps } = event.args
          const decision = await contract.getDecision(decisionHash)
          
          return {
            asset: 'ETH/USDC', 
            size: '0.01',
            pnl: (Number(pnlDeltaBps) / 100).toFixed(2) + '%',
            wasCorrect,
            agent: ethers.decodeBytes32String(decision.agentId).replace(/\0/g, '') || 'research-001',
            time: new Date(Number(decision.timestamp) * 1000).toLocaleTimeString(),
            hash: decisionHash
          }
        }))

        setHistory(trades)
        
        const wins = trades.filter(t => t.wasCorrect).length
        const totalPnlVal = trades.reduce((acc, t) => acc + parseFloat(t.pnl), 0)
        
        setStats({
          pnl: (totalPnlVal >= 0 ? '+' : '') + totalPnlVal.toFixed(2) + '%',
          winRate: trades.length > 0 ? Math.round((wins / trades.length) * 100) + '%' : '0%',
          totalTrades: trades.length
        })

      } catch (err) {
        console.error("Failed to fetch on-chain history:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchOnChainHistory()
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <Nav />
      
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px 60px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '2.5rem', marginBottom: 12 }}>
            Trade <span style={{ color: 'var(--blue-glow)' }}>Portfolio</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 600 }}>
            Real-time tracking of your agent-executed positions and performance attribution.
          </p>
        </div>

        {/* Stats Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: 20, 
          marginBottom: 40 
        }}>
          <StatCard label="Aggregate PnL" value={stats.pnl} sub="Network Wide" icon={<BarChart3 size={20} color="var(--green)" />} />
          <StatCard label="Win Rate" value={stats.winRate} sub={`${stats.totalTrades} total trades`} icon={<Target size={20} color="var(--blue-glow)" />} />
          <StatCard label="Network Value" value="$1.4M" sub="0G Data Availability" icon={<Wallet size={20} color="var(--blue-glow)" />} />
          <StatCard label="Agent Fees" value="$0.18" sub="x402 Micropayments" icon={<Clock size={20} color="var(--amber)" />} />
        </div>

        {/* Positions Table */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '20px 24px', 
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Recent Executions</h2>
              <span style={{ 
                padding: '2px 8px', background: 'rgba(34,197,94,0.1)', 
                color: 'var(--green)', fontSize: '0.7rem', borderRadius: 4, 
                fontWeight: 600 
              }}>VERIFIED</span>
            </div>
            {loading && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Refreshing...</span>}
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                <th style={thStyle}>Asset</th>
                <th style={thStyle}>PnL (BPS)</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Agent Attribution</th>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Audit</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No on-chain history found. Seed the contract to see data.
                  </td>
                </tr>
              ) : history.map((pos, i) => (
                <tr key={i} style={{ borderBottom: i === history.length - 1 ? 'none' : '1px solid var(--border)' }}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{pos.asset}</div>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: pos.wasCorrect ? 'var(--green)' : 'var(--red)' }}>
                      {pos.pnl}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      padding: '2px 6px', 
                      borderRadius: 4,
                      background: pos.wasCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      color: pos.wasCorrect ? 'var(--green)' : 'var(--red)'
                    }}>
                      {pos.wasCorrect ? 'SUCCESS' : 'LOSS'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ 
                      fontFamily: "'Space Mono'", fontSize: '0.75rem', 
                      color: 'var(--blue-glow)'
                    }}>
                      {pos.agent}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                      <Clock size={12} /> {pos.time}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <a href={`https://sepolia.basescan.org/tx/${pos.hash}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)' }}>
                      <ExternalLink size={14} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

function StatCard({ label, value, sub, icon }: any) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 20
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        {icon}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', color: value.startsWith('-') ? 'var(--red)' : 'var(--green)' }}>
        {sub}
      </div>
    </div>
  )
}

const thStyle = {
  padding: '16px 24px',
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  textTransform: 'uppercase' as const,
  fontWeight: 500,
  letterSpacing: '0.05em'
}

const tdStyle = {
  padding: '20px 24px',
  fontSize: '0.9rem'
}
