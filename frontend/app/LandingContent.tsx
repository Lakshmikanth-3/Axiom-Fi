"use client"

import React, { useRef, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight, ArrowSquareOut,
  ShieldCheck, Cpu, ChartLineUp, CurrencyEth,
  MagnifyingGlass, Scales, Lightning, GitBranch, Lock,
  Database
} from "@phosphor-icons/react"

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true) }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function BentoCard({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView(0.08)
  return (
    <div
      ref={ref}
      className={`bento ${className}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="tag">{children}</span>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--fg-3)", display: "inline-block" }} />
      <Tag>{children}</Tag>
    </div>
  )
}

const AGENT_PIPELINE = [
  { icon: <MagnifyingGlass size={20} />, label: "Research Agent", desc: "Fetches live ETH price from CoinGecko, Uniswap V3 TVL from DeFiLlama, then runs LLM inference via 0G Compute Network for a confidence-scored recommendation." },
  { icon: <Scales size={20} />, label: "Risk Guard", desc: "Validates the recommendation against volatility thresholds, liquidity flags, and exposure limits. Approves or rejects with on-chain audit log." },
  { icon: <Lightning size={20} />, label: "Executor Agent", desc: "Submits a Uniswap V3 swap via KeeperHub with x402 micropayment settlement. Records the transaction hash to 0G Storage." },
  { icon: <GitBranch size={20} />, label: "Orchestrator", desc: "Coordinates all agents, derives HD wallets, manages inter-agent x402 payments, and writes the full pipeline state to 0G KV store." },
]

const STATS = [
  { value: "4", label: "AI Agents" },
  { value: "100%", label: "On-chain" },
  { value: "0G", label: "Storage" },
  { value: "x402", label: "Payments" },
]

const FEATURES = [
  { icon: <CurrencyEth size={18} />, title: "Live Market Data", desc: "CoinGecko ETH price and DeFiLlama TVL fetched in real-time before every trade decision." },
  { icon: <ShieldCheck size={18} />, title: "Risk Guard Protection", desc: "Every recommendation passes through a dedicated risk agent before execution — no bypasses." },
  { icon: <Lock size={18} />, title: "x402 Micropayments", desc: "Agents pay each other in USDC via x402 protocol for every task completed. Fully on-chain." },
  { icon: <Database size={18} />, title: "0G Decentralized Storage", desc: "All pipeline state, audit logs, and trade history written to 0G KV store — not a database." },
  { icon: <ChartLineUp size={18} />, title: "Reputation Ledger", desc: "Every agent earns an on-chain accuracy score. High-reputation agents are selected first." },
  { icon: <Cpu size={18} />, title: "Decentralized Inference", desc: "LLM inference runs through the 0G Compute Network — verifiable and censorship-resistant." },
]

const HOW_STEPS = [
  { n: "01", title: "Register", desc: "Onboard your agent wallet using deterministic HD derivation from a master seed. Your wallet is registered to the AgentRegistry contract on Base Sepolia." },
  { n: "02", title: "Strategize", desc: "Describe your trade strategy in plain language. The Research Agent fetches live data and produces a confidence-scored recommendation." },
  { n: "03", title: "Verify", desc: "Risk Guard validates the recommendation against thresholds. Every decision is recorded as a hash on the ReputationLedger contract." },
  { n: "04", title: "Execute", desc: "The Executor submits a Uniswap V3 swap via KeeperHub. The transaction hash is stored on 0G and displayed with a clickable BaseScan link." },
]

export default function LandingContent() {
  const [heroReady, setHeroReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setHeroReady(true), 120)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", height: "100vh", overflow: "hidden" }}>

        <video
          autoPlay loop muted playsInline
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover", zIndex: 0,
            transform: heroReady ? "scale(1.05)" : "scale(0.9)",
            transition: "transform 2.2s cubic-bezier(0.16,1,0.3,1)",
          }}
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/agentic-hero-9yW3wnTNMfn2U6lsVhTTZSJFEvAoSj.mp4"
        />

        {/* Progressive blur overlays from bottom */}
        <div style={{ position: "absolute", insetInline: 0, bottom: 0, height: "65%", zIndex: 10, pointerEvents: "none", background: "linear-gradient(to top, #F5F4F0 0%, #F5F4F0 20%, rgba(245,244,240,0.85) 38%, rgba(245,244,240,0.5) 58%, rgba(245,244,240,0.15) 78%, transparent 100%)" }} />
        <div style={{ position: "absolute", insetInline: 0, bottom: 0, height: "22%", zIndex: 10, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", maskImage: "linear-gradient(to top, black 0%, transparent 100%)", WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 100%)" }} />
        <div style={{ position: "absolute", insetInline: 0, bottom: 0, height: "40%", zIndex: 10, backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)", maskImage: "linear-gradient(to top, black 0%, transparent 100%)", WebkitMaskImage: "linear-gradient(to top, black 0%, transparent 100%)" }} />

        {/* Hero content */}
        <div style={{
          position: "absolute", insetInline: 0, bottom: 0, zIndex: 30,
          display: "flex", flexDirection: "column",
          padding: "0 48px 56px", maxWidth: 760,
        }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "5px 14px",
            background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 999,
            marginBottom: 24, width: "fit-content",
            opacity: heroReady ? 1 : 0, transition: "opacity 0.8s ease 0.2s",
          }}>
            <span className="status-dot live" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-2)" }}>
              Live · Base Sepolia · ETHGlobal OpenAgents
            </span>
          </div>

          <h1 style={{
            fontFamily: "var(--font-sans)", fontWeight: 300,
            fontSize: "clamp(3rem, 7vw, 5.5rem)",
            lineHeight: 1.0, letterSpacing: "-0.03em", color: "var(--fg)",
            marginBottom: 32,
            opacity: heroReady ? 1 : 0,
            filter: heroReady ? "blur(0px)" : "blur(20px)",
            transform: heroReady ? "translateY(0)" : "translateY(28px)",
            transition: "opacity 1s cubic-bezier(0.16,1,0.3,1) 0.05s, filter 1s cubic-bezier(0.16,1,0.3,1) 0.05s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.05s",
          }}>
            Trade with agents<br />that have skin<br />in the game.
          </h1>

          <div style={{ display: "flex", gap: 40, marginBottom: 36 }}>
            {STATS.map((s, i) => (
              <div key={s.label} style={{
                opacity: heroReady ? 1 : 0,
                filter: heroReady ? "blur(0)" : "blur(12px)",
                transform: heroReady ? "translateY(0)" : "translateY(16px)",
                transition: `opacity 0.8s ease ${120 + i * 70}ms, filter 0.8s ease ${120 + i * 70}ms, transform 0.8s ease ${120 + i * 70}ms`,
              }}>
                <div style={{ fontFamily: "var(--font-sans)", fontWeight: 300, fontSize: "clamp(1.4rem, 3vw, 2rem)", color: "var(--fg)", letterSpacing: "-0.02em" }}>{s.value}</div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--fg-3)", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, opacity: heroReady ? 1 : 0, transition: "opacity 0.8s ease 0.5s" }}>
            <Link href="/terminal" className="btn btn-dark" style={{ fontSize: "0.875rem" }}>
              Open Terminal <ArrowRight size={16} />
            </Link>
            <Link href="/onboard" className="btn btn-outline" style={{ fontSize: "0.875rem" }}>
              Register Agent
            </Link>
          </div>
        </div>
      </section>

      {/* ── AGENT PIPELINE ───────────────────────────────────────────── */}
      <section className="section section-border" id="pipeline">
        <SectionLabel>Agent Pipeline</SectionLabel>
        <h2 style={{ fontSize: "clamp(2rem,4vw,3.2rem)", marginBottom: 48, maxWidth: 480 }}>
          Four agents.<br />One autonomous pipeline.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {AGENT_PIPELINE.map((a, i) => (
            <BentoCard key={a.label} delay={i * 80} className="p-8">
              <div style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid var(--border-md)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, color: "var(--fg-2)" }}>
                {a.icon}
              </div>
              <h3 style={{ fontWeight: 400, fontSize: "1.05rem", marginBottom: 10 }}>{a.label}</h3>
              <p style={{ fontSize: "0.84rem", color: "var(--fg-2)", lineHeight: 1.65 }}>{a.desc}</p>
            </BentoCard>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="section section-border" id="how-it-works">
        <SectionLabel>Workflow</SectionLabel>
        <h2 style={{ fontSize: "clamp(2rem,4vw,3.2rem)", marginBottom: 48, maxWidth: 520 }}>
          From strategy to<br />on-chain execution.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {HOW_STEPS.map((s, i) => (
            <BentoCard key={s.n} delay={i * 70} className="p-8">
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--fg-4)", letterSpacing: "0.12em", display: "block", marginBottom: 40 }}>{s.n}</span>
              <h3 style={{ fontWeight: 400, fontSize: "1.4rem", marginBottom: 12, letterSpacing: "-0.02em" }}>{s.title}</h3>
              <p style={{ fontSize: "0.84rem", color: "var(--fg-2)", lineHeight: 1.65 }}>{s.desc}</p>
            </BentoCard>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="section section-border" id="features">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 32, marginBottom: 48 }}>
          <div>
            <SectionLabel>Infrastructure</SectionLabel>
            <h2 style={{ fontSize: "clamp(2rem,4vw,3.2rem)", maxWidth: 440 }}>
              Everything you need<br />to trust the pipeline.
            </h2>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--fg-2)", lineHeight: 1.7, maxWidth: 320 }}>
            Built on Base Sepolia with 0G Storage, 0G Compute, KeeperHub, and x402. No mocks. No fallbacks.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
          {FEATURES.map((f, i) => (
            <BentoCard key={f.title} delay={i * 60} className="p-7">
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border-md)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--fg-2)" }}>
                  {f.icon}
                </div>
                <div>
                  <h3 style={{ fontWeight: 400, fontSize: "0.9375rem", marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ fontSize: "0.8125rem", color: "var(--fg-2)", lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              </div>
            </BentoCard>
          ))}
        </div>
      </section>

      {/* ── AUDIT TRAIL ──────────────────────────────────────────────── */}
      <section className="section section-border" id="audit">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 48, alignItems: "center" }}>
          <div>
            <SectionLabel>Transparency</SectionLabel>
            <h2 style={{ fontSize: "clamp(2rem,4vw,3rem)", marginBottom: 20 }}>
              Every decision.<br />On-chain.
            </h2>
            <p style={{ fontSize: "0.875rem", color: "var(--fg-2)", lineHeight: 1.7, marginBottom: 32, maxWidth: 380 }}>
              Every trade recommendation, risk verdict, and execution is logged to the blockchain. Click any transaction hash to verify it directly on BaseScan.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Agent Registry", desc: "Every agent is registered on-chain with an address and specialization." },
                { label: "Reputation Ledger", desc: "Accuracy scores updated after each trade. Bronze to Axiom tier." },
                { label: "0G Audit Log", desc: "Full pipeline state written to decentralized KV storage." },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", gap: 14 }}>
                  <div style={{ width: 3, background: "var(--border-md)", borderRadius: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: "0.875rem", marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--fg-2)" }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <BentoCard className="p-6" delay={0}>
            <div style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--fg-3)", marginBottom: 16, fontFamily: "var(--font-mono)" }}>Live Audit Feed</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { time: "17:04:21", action: "orchestrator_session_started", status: "done" },
                { time: "17:04:22", action: "research_agent_executed", status: "done" },
                { time: "17:04:26", action: "risk_guard_approved", status: "done" },
                { time: "17:04:28", action: "executor_swap_submitted", status: "done" },
                { time: "17:04:29", action: "0g_kv_state_written", status: "done" },
                { time: "17:04:30", action: "reputation_ledger_updated", status: "running" },
              ].map((row, i) => (
                <div key={i} className="audit-row">
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--fg-3)", minWidth: 58 }}>{row.time}</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--fg-2)", flex: 1 }}>{row.action}</span>
                  <span className={`status-dot ${row.status}`} />
                </div>
              ))}
            </div>
          </BentoCard>
        </div>
      </section>

      {/* ── MARQUEE ───────────────────────────────────────────────────── */}
      <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", overflow: "hidden", userSelect: "none" }}>
        <div style={{ display: "flex" }} className="marquee-left">
          {[...Array(3)].map((_, rep) => (
            <div key={rep} style={{ display: "flex", flexShrink: 0 }}>
              {["Research Agent", "Risk Guard", "Executor", "0G Storage", "x402 Payments", "KeeperHub", "Base Sepolia", "Uniswap V3", "Reputation Ledger", "0G Compute"].map(c => (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 40px", borderRight: "1px solid var(--border)", flexShrink: 0 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--fg-4)", flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.8rem", color: "var(--fg-2)", whiteSpace: "nowrap" }}>{c}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section style={{ padding: "96px 48px", textAlign: "center", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(2rem,4vw,3.2rem)", marginBottom: 20 }}>
            Start trading with<br />autonomous agents.
          </h2>
          <p style={{ fontSize: "0.9375rem", color: "var(--fg-2)", lineHeight: 1.7, marginBottom: 40 }}>
            Register your agent wallet, describe your strategy, and let the pipeline handle the rest — all on-chain, all verifiable.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/onboard" className="btn btn-dark">
              Register Agent <ArrowRight size={16} />
            </Link>
            <Link href="/terminal" className="btn btn-outline">
              Open Terminal
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer style={{ padding: "40px 48px", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--fg-3)" }}>Axiom-Fi</span>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            {[
              { label: "Terminal", href: "/terminal" },
              { label: "Agents", href: "/agents" },
              { label: "History", href: "/history" },
              { label: "Verify", href: "/verify" },
              { label: "Onboard", href: "/onboard" },
            ].map(l => (
              <Link key={l.label} href={l.href} style={{ fontSize: "0.8rem", color: "var(--fg-3)", textDecoration: "none" }}>{l.label}</Link>
            ))}
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--fg-4)" }}>Base Sepolia · ETHGlobal OpenAgents 2026</span>
        </div>
      </footer>
    </div>
  )
}
