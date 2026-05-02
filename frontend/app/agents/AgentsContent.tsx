"use client"

import React, { useEffect, useState } from "react"
import { ArrowSquareOut, Circle, CheckCircle, XCircle, Cpu, Scales, Lightning, GitBranch } from "@phosphor-icons/react"

const BASESCAN = "https://sepolia.basescan.org"
const REGISTRY = process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS ?? ""
const LEDGER   = process.env.NEXT_PUBLIC_REPUTATION_LEDGER_ADDRESS ?? ""

const TIER_LABELS: Record<number, string> = { 0: "Unranked", 1: "Bronze", 2: "Silver", 3: "Gold", 4: "Axiom" }
const TIER_COLORS: Record<number, string> = { 0: "var(--fg-3)", 1: "#b45309", 2: "#64748b", 3: "#ca8a04", 4: "var(--blue)" }

const AGENT_ICONS: Record<string, React.ReactNode> = {
  research:  <Cpu size={18} />,
  risk:      <Scales size={18} />,
  executor:  <Lightning size={18} />,
  orchestrator: <GitBranch size={18} />,
}

type Agent = {
  id: string
  name: string
  agentType: string
  specializations: string[]
  address: string
  isActive: boolean
  registeredAt: number
  tier: number
  accuracyBps: number
  totalDecisions: number
}

function TxLink({ hash, short = true }: { hash: string; short?: boolean }) {
  if (!hash) return null
  return (
    <a
      href={`${BASESCAN}/address/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="tx-link"
      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
    >
      {short ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash}
      <ArrowSquareOut size={11} />
    </a>
  )
}

function AgentCard({ agent }: { agent: Agent }) {
  const tierColor = TIER_COLORS[agent.tier] ?? "var(--fg-3)"
  const accuracy  = (agent.accuracyBps / 100).toFixed(1)
  const icon = AGENT_ICONS[agent.agentType?.toLowerCase()] ?? <Cpu size={18} />

  return (
    <div className="bento" style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid var(--border-md)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-2)" }}>
            {icon}
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: "0.9375rem" }}>{agent.name}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{agent.agentType}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {agent.isActive
            ? <CheckCircle size={16} color="var(--green)" weight="fill" />
            : <XCircle size={16} color="var(--red)" weight="fill" />}
          <span style={{ fontSize: "0.75rem", color: agent.isActive ? "var(--green)" : "var(--red)" }}>
            {agent.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 24, marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", fontWeight: 500, color: "var(--fg)" }}>{accuracy}%</div>
          <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-3)", marginTop: 2 }}>Accuracy</div>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", fontWeight: 500, color: "var(--fg)" }}>{Number(agent.totalDecisions)}</div>
          <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-3)", marginTop: 2 }}>Decisions</div>
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 500, color: tierColor }}>{TIER_LABELS[agent.tier]}</div>
          <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-3)", marginTop: 2 }}>Tier</div>
        </div>
      </div>

      {/* Specializations */}
      {agent.specializations?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {agent.specializations.map(s => (
            <span key={s} className="tag" style={{ fontSize: "0.6rem" }}>{s}</span>
          ))}
        </div>
      )}

      {/* Address */}
      <div style={{ paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--fg-3)" }}>Wallet</span>
        <TxLink hash={agent.address} />
      </div>
    </div>
  )
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/agents/list")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setAgents(data.agents ?? [])
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div style={{ paddingTop: 64 }}>
      <div className="section">
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <span className="tag" style={{ marginBottom: 16, display: "inline-flex" }}>Agent Registry</span>
          <h1 style={{ fontSize: "clamp(2rem,4vw,3rem)", marginBottom: 12 }}>Registered Agents</h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--fg-2)", lineHeight: 1.6, maxWidth: 480 }}>
            All agents are registered on-chain via AgentRegistry.sol on Base Sepolia. Reputation scores are updated after every trade decision.
          </p>
          {REGISTRY && (
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.75rem", color: "var(--fg-3)" }}>Contract:</span>
              <a href={`${BASESCAN}/address/${REGISTRY}`} target="_blank" rel="noopener noreferrer" className="tx-link">
                {REGISTRY} <ArrowSquareOut size={11} style={{ display: "inline" }} />
              </a>
            </div>
          )}
        </div>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--fg-2)", padding: "48px 0" }}>
            <Circle size={16} style={{ animation: "spinSlow 1.5s linear infinite" }} />
            <span style={{ fontSize: "0.875rem" }}>Querying AgentRegistry.sol on Base Sepolia…</span>
          </div>
        )}

        {error && (
          <div style={{ padding: "16px 20px", background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--red)" }}>
            Failed to load agents: {error}
          </div>
        )}

        {!loading && !error && agents.length === 0 && (
          <div style={{ padding: "48px 0", textAlign: "center", color: "var(--fg-3)", fontSize: "0.875rem" }}>
            No agents registered yet. <a href="/onboard" style={{ color: "var(--fg)", textDecoration: "underline" }}>Register your agent</a>
          </div>
        )}

        {agents.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {agents.map(a => <AgentCard key={a.id} agent={a} />)}
          </div>
        )}
      </div>
    </div>
  )
}
