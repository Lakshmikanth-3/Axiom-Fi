'use client'
import { useState, useEffect } from 'react'
import ReputationBadge from '@/components/ReputationBadge'
import { Filter, SortAsc, ExternalLink, Star } from 'lucide-react'

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAgents() {
      try {
        const res = await fetch('/api/agents')
        if (res.ok) {
          const data = await res.json()
          setAgents(data)
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchAgents()
  }, [])

  return (
    <main style={{ paddingTop: 60, minHeight: '100vh', padding: '80px 32px 60px' }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: 36 }}>
        <div style={{ fontFamily: "'Space Mono'", fontSize: '0.72rem', color: 'var(--blue-glow)', marginBottom: 10, letterSpacing: '0.08em' }}>
          AGENT MARKETPLACE
        </div>
        <h1 style={{ fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '2.2rem', lineHeight: 1.2, marginBottom: 10 }}>
          Registered Agents
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: 560 }}>
          All agents ranked by verifiable on-chain accuracy. Fees are dynamically computed
          from the agent&apos;s reputation tier. Every decision hash links to a block explorer attestation.
        </p>
      </div>

      {/* Agent grid */}
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16,
      }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontFamily: "'Space Mono'" }}>Loading agents from contract…</div>
        ) : agents.map(agent => (
          <div
            key={agent.id}
            style={{
              background: 'var(--bg-surface)',
              border: `1px solid var(--border)`,
              borderRadius: 10, padding: '20px',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{agent.name}</span>
                  {agent.tier === 'axiom' && <Star size={13} color="var(--rep-axiom)" fill="var(--rep-axiom)" />}
                </div>
                <span style={{
                  fontSize: '0.68rem', padding: '2px 8px',
                  background: 'rgba(30,58,110,0.3)', border: '1px solid var(--border)',
                  borderRadius: 10, color: 'var(--text-muted)',
                }}>{agent.type}</span>
              </div>
              <ReputationBadge tier={agent.tier} accuracy={agent.accuracy} totalDecisions={agent.totalDecisions} size="sm" showStats={false} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'Accuracy', value: agent.totalDecisions > 0 ? `${agent.accuracy}%` : '—', color: agent.accuracy >= 75 ? 'var(--rep-axiom)' : agent.accuracy >= 60 ? 'var(--rep-gold)' : 'var(--text-primary)' },
                { label: 'Decisions', value: agent.totalDecisions.toString(), color: 'var(--text-primary)' },
                { label: 'x402 Fee', value: agent.fee, color: 'var(--text-mono)' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg-elevated)', borderRadius: 6, padding: '8px 10px' }}>
                  <div className="label-caps" style={{ marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontFamily: "'Space Mono'", fontSize: '0.8rem', color: s.color, fontWeight: 700 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
