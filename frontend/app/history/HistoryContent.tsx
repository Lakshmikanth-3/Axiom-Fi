"use client"

import React, { useEffect, useState } from "react"
import { ArrowSquareOut, ClockCounterClockwise, CheckCircle, XCircle, Warning, Circle } from "@phosphor-icons/react"
import Link from "next/link"

const BASESCAN = "https://sepolia.basescan.org"
const OG_SCAN  = "https://chainscan-galileo.0g.ai"
const KH_BASE  = "https://app.keeperhub.com/hub/workflows"

type Trade = {
  strategy: string
  txHash?: string
  ogTxHash?: string
  keeperHubId?: string
  outcome: string
  timestamp: number
  sessionId: string
}

function ExplorerLinks({ txHash, ogTxHash, keeperHubId }: Pick<Trade, 'txHash' | 'ogTxHash' | 'keeperHubId'>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {txHash && (
        <div>
          <div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-3)", marginBottom: 4 }}>BaseScan</div>
          <a href={`${BASESCAN}/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="tx-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, wordBreak: "break-all", fontSize: "0.72rem" }}>
            {txHash} <ArrowSquareOut size={11} style={{ flexShrink: 0 }} />
          </a>
        </div>
      )}
      {ogTxHash && (
        <div>
          <div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-3)", marginBottom: 4 }}>0G Storage</div>
          <a href={`${OG_SCAN}/tx/${ogTxHash}`} target="_blank" rel="noopener noreferrer" className="tx-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, wordBreak: "break-all", fontSize: "0.72rem" }}>
            {ogTxHash} <ArrowSquareOut size={11} style={{ flexShrink: 0 }} />
          </a>
        </div>
      )}
      {keeperHubId && (
        <div>
          <div style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-3)", marginBottom: 4 }}>KeeperHub</div>
          <a href={`${KH_BASE}/${keeperHubId}`} target="_blank" rel="noopener noreferrer" className="tx-link" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.72rem" }}>
            {keeperHubId} <ArrowSquareOut size={11} style={{ flexShrink: 0 }} />
          </a>
        </div>
      )}
    </div>
  )
}

function OutcomeIcon({ outcome }: { outcome: string }) {
  if (outcome === "executed") return <CheckCircle size={16} color="var(--green)" weight="fill" />
  if (outcome === "rejected") return <XCircle size={16} color="var(--red)" weight="fill" />
  return <Warning size={16} color="var(--amber)" weight="fill" />
}

const STORAGE_KEY = "axiom-trade-history"

export default function HistoryPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed: Trade[] = raw ? JSON.parse(raw) : []
      // Sort newest first
      setTrades(parsed.sort((a, b) => b.timestamp - a.timestamp))
    } catch {
      setTrades([])
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div style={{ paddingTop: 64 }}>
      <div className="section">
        <div style={{ marginBottom: 48 }}>
          <span className="tag" style={{ marginBottom: 16, display: "inline-flex" }}>
            <ClockCounterClockwise size={12} /> Trade History
          </span>
          <h1 style={{ fontSize: "clamp(2rem,4vw,3rem)", marginBottom: 12 }}>Pipeline Executions</h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--fg-2)", lineHeight: 1.6, maxWidth: 520 }}>
            Every trade run through the Axiom-Fi pipeline. Each entry links to BaseScan, 0G Storage, and KeeperHub for full cross-chain verification.
          </p>
        </div>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--fg-2)", padding: "48px 0" }}>
            <Circle size={16} style={{ animation: "spinSlow 1.5s linear infinite" }} />
            <span style={{ fontSize: "0.875rem" }}>Loading…</span>
          </div>
        )}

        {!loading && trades.length === 0 && (
          <div style={{ padding: "64px 0", textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--fg-4)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>No executions yet</div>
            <Link href="/terminal" className="btn btn-dark" style={{ display: "inline-flex" }}>
              Run your first trade
            </Link>
          </div>
        )}

        {trades.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {trades.map((t, i) => (
              <div key={i} className="bento" style={{ padding: "20px 24px" }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <OutcomeIcon outcome={t.outcome} />
                    <span style={{ fontWeight: 600, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{t.outcome}</span>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--fg-3)", flexShrink: 0 }}>
                    {new Date(t.timestamp).toLocaleString()}
                  </span>
                </div>

                {/* Strategy */}
                <p style={{ fontSize: "0.875rem", color: "var(--fg-2)", lineHeight: 1.6, marginBottom: 16, fontFamily: "var(--font-mono)" }}>
                  {t.strategy}
                </p>

                {/* Explorer links */}
                <div style={{ paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                  {(t.txHash || t.ogTxHash || t.keeperHubId) ? (
                    <ExplorerLinks txHash={t.txHash} ogTxHash={t.ogTxHash} keeperHubId={t.keeperHubId} />
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: "var(--fg-3)" }}>
                      Pipeline did not produce a transaction (risk rejected or confidence below threshold)
                    </span>
                  )}
                </div>

                {/* Session ID + Verify button */}
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--fg-4)" }}>{t.sessionId}</span>
                  {t.txHash && (
                    <Link
                      href={`/verify?txHash=${t.txHash}`}
                      className="btn btn-outline"
                      style={{ padding: "4px 12px", fontSize: "0.72rem" }}
                    >
                      Verify on-chain
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
