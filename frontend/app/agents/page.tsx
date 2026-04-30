'use client'
import { useState, useEffect } from 'react'
import Nav from '@/components/Nav'
import ReputationBadge from '@/components/ReputationBadge'
import { ethers } from 'ethers'
import { REPUTATION_LEDGER_ADDRESS, REPUTATION_LEDGER_ABI, RPC_URL } from '@/lib/contracts'
import { Search, Filter, ShieldCheck, Zap, Activity, Info } from 'lucide-react'

const AGENT_BASE_DATA = [
  {
    id: 'research-001',
    name: 'Axiom Research',
    role: 'research',
    tags: ['L2', 'Momentum', 'ETH'],
    description: 'Specializes in Base ecosystem sentiment and technical momentum analysis.',
  },
  {
    id: 'risk-guard-001',
    name: 'Sentinel Risk',
    role: 'risk-guard',
    tags: ['Safety', 'Exposure', 'Portfolio'],
    description: 'Dynamic exposure management and drawdown protection for DeFi portfolios.',
  },
  {
    id: 'executor-001',
    name: 'Flash Executor',
    role: 'executor',
    tags: ['MEV', 'Guaranteed', 'Slippage'],
    description: 'Guaranteed trade settlement via KeeperHub with minimum slippage routing.',
  },
  {
    id: 'research-002',
    name: 'Alpha Seeker',
    role: 'research',
    tags: ['Low Cap', 'High Risk'],
    description: 'Experimental agent focused on low-market-cap opportunity discovery.',
  }
]

const TIER_MAP: Record<number, string> = {
  0: 'unranked',
  1: 'bronze',
  2: 'silver',
  3: 'gold',
  4: 'axiom'
}

export default function AgentsMarketplace() {
  const [filter, setFilter] = useState('all')
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReputations() {
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL)
        const contract = new ethers.Contract(REPUTATION_LEDGER_ADDRESS, REPUTATION_LEDGER_ABI, provider)

        const enriched = await Promise.all(AGENT_BASE_DATA.map(async (base) => {
          try {
            const idHash = ethers.id(base.id)
            const rep = await contract.getReputation(idHash)
            const feeCoeff = await contract.getFeeCoefficient(idHash)
            
            return {
              ...base,
              accuracy: Number(rep.accuracyBps) / 100,
              totalDecisions: Number(rep.totalDecisions),
              tier: TIER_MAP[Number(rep.tier)] || 'unranked',
              fee: (Number(feeCoeff) / 10000).toFixed(3) // base fee is $0.01
            }
          } catch (e) {
            console.error(`Failed to fetch rep for ${base.id}:`, e)
            return { ...base, accuracy: 0, totalDecisions: 0, tier: 'unranked', fee: '0.001' }
          }
        }))
        setAgents(enriched)
      } catch (err) {
        console.error("Ledger fetch failed:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchReputations()
  }, [])

  const filteredAgents = filter === 'all' 
    ? agents 
    : agents.filter(a => a.role === filter)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <Nav />
      
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 24px 60px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '2.5rem', marginBottom: 12 }}>
            Agent <span style={{ color: 'var(--blue-glow)' }}>Marketplace</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 600 }}>
            Browse and select specialized agents with verifiable on-chain track records. 
            Fees are automatically adjusted based on proven performance.
          </p>
        </div>

        {/* Filters bar */}
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 32, padding: '12px 20px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'btn-active' : 'btn-ghost'}
              style={filterStyle(filter === 'all')}
            >
              All Agents
            </button>
            <button 
              onClick={() => setFilter('research')}
              className={filter === 'research' ? 'btn-active' : 'btn-ghost'}
              style={filterStyle(filter === 'research')}
            >
              Research
            </button>
            <button 
              onClick={() => setFilter('risk-guard')}
              className={filter === 'risk-guard' ? 'btn-active' : 'btn-ghost'}
              style={filterStyle(filter === 'risk-guard')}
            >
              Risk Guard
            </button>
            <button 
              onClick={() => setFilter('executor')}
              className={filter === 'executor' ? 'btn-active' : 'btn-ghost'}
              style={filterStyle(filter === 'executor')}
            >
              Executor
            </button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.5 }}>
            <Search size={18} />
            <Filter size={18} />
          </div>
        </div>

        {/* Agents Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 24 
        }}>
          {filteredAgents.map(agent => (
            <div key={agent.id} style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 24,
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            className="agent-card-hover"
            >
              {/* Glossy overlay for Axiom tier */}
              {agent.tier === 'axiom' && (
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  width: '100px', height: '100px',
                  background: 'linear-gradient(225deg, rgba(96,165,250,0.1) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }} />
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: '1.25rem', fontWeight: 600, marginBottom: 4 }}>
                    {agent.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {agent.role === 'research' && <Zap size={14} color="var(--blue-glow)" />}
                    {agent.role === 'risk-guard' && <ShieldCheck size={14} color="var(--amber)" />}
                    {agent.role === 'executor' && <Activity size={14} color="var(--green)" />}
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {agent.role} Agent
                    </span>
                  </div>
                </div>
                <ReputationBadge 
                  agentId={agent.id} 
                  tier={agent.tier as any} 
                  accuracy={agent.accuracy} 
                  totalDecisions={agent.totalDecisions} 
                />
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                {agent.description}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                {agent.tags.map(tag => (
                  <span key={tag} style={{
                    padding: '3px 10px',
                    background: 'rgba(30,58,110,0.2)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    fontSize: '0.65rem',
                    color: 'var(--text-secondary)'
                  }}>
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 16, borderTop: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                    Fee / Execution
                  </div>
                  <div style={{ fontFamily: "'Space Mono'", fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {agent.fee} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>USDC</span>
                  </div>
                </div>
                <button style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid var(--border-accent)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontFamily: "'Space Grotesk'",
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}>
                  View History <Info size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .agent-card-hover:hover {
          border-color: var(--border-accent);
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
      `}</style>
    </main>
  )
}

function filterStyle(active: boolean) {
  return {
    padding: '6px 16px',
    background: active ? 'var(--blue-primary)' : 'transparent',
    border: active ? 'none' : '1px solid transparent',
    borderRadius: 6,
    color: active ? 'white' : 'var(--text-secondary)',
    fontSize: '0.85rem',
    fontFamily: "'Space Grotesk'",
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
}
