"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowSquareOut, MagnifyingGlass, CheckCircle, XCircle, Warning } from "@phosphor-icons/react"

const BASESCAN = "https://sepolia.basescan.org"

type VerifyResult = {
  hash: string
  blockNumber: number
  gasUsed: string
  status: number
  events: { name: string; args: string }[]
}

function VerifyInner() {
  const searchParams = useSearchParams()
  const [txHash, setTxHash] = useState(searchParams.get("txHash") ?? "")
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Auto-fill from last session if no URL param
  useEffect(() => {
    if (!txHash) {
      try {
        const session = JSON.parse(sessionStorage.getItem("axiom-session") ?? "{}")
        if (session.txHash) setTxHash(session.txHash)
      } catch {}
    }
  }, [])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash.trim())) {
      setError("Enter a valid 32-byte transaction hash (0x…)")
      return
    }
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const res = await fetch(`/api/verify?txHash=${txHash.trim()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ paddingTop: 64 }}>
      <div className="section" style={{ maxWidth: 760 }}>
        <div style={{ marginBottom: 40 }}>
          <span className="tag" style={{ marginBottom: 16, display: "inline-flex" }}>
            <MagnifyingGlass size={12} /> On-Chain Verify
          </span>
          <h1 style={{ fontSize: "clamp(2rem,4vw,3rem)", marginBottom: 12 }}>Verify Transaction</h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--fg-2)", lineHeight: 1.6 }}>
            Paste any Axiom-Fi transaction hash to decode its on-chain events from the ReputationLedger contract.
            The hash is auto-filled from your last terminal run.
          </p>
        </div>

        <form onSubmit={handleVerify} style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            <label className="form-label">Transaction Hash</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                className="form-input"
                placeholder="0x0000000000000000000000000000000000000000000000000000000000000000"
                value={txHash}
                onChange={e => setTxHash(e.target.value)}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                data-gramm="false"
                translate="no"
                style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}
              />
              <button type="submit" className="btn btn-dark" disabled={loading} style={{ flexShrink: 0 }}>
                {loading ? "Verifying…" : "Verify"}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div style={{ padding: "14px 18px", background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--red)", marginBottom: 20 }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Summary card */}
            <div className="bento" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                {result.status === 1
                  ? <CheckCircle size={20} color="var(--green)" weight="fill" />
                  : <XCircle size={20} color="var(--red)" weight="fill" />}
                <span style={{ fontWeight: 500 }}>{result.status === 1 ? "Transaction Succeeded" : "Transaction Reverted"}</span>
                <a href={`${BASESCAN}/tx/${result.hash}`} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ marginLeft: "auto", padding: "6px 14px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  BaseScan <ArrowSquareOut size={13} />
                </a>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--fg-3)", marginBottom: 4 }}>Block</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{result.blockNumber}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--fg-3)", marginBottom: 4 }}>Gas Used</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>{Number(result.gasUsed).toLocaleString()}</div>
                </div>
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--fg-3)", marginBottom: 6 }}>Full Transaction Hash</div>
                <a href={`${BASESCAN}/tx/${result.hash}`} target="_blank" rel="noopener noreferrer" className="tx-link" translate="no">
                  {result.hash} <ArrowSquareOut size={11} style={{ display: "inline" }} />
                </a>
              </div>
            </div>

            {/* Decoded events */}
            <div className="bento" style={{ padding: 24 }}>
              <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--fg-3)", marginBottom: 16 }}>Decoded ReputationLedger Events</div>
              {result.events.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--fg-3)", fontSize: "0.875rem" }}>
                  <Warning size={16} color="var(--amber)" />
                  No ReputationLedger events found in this transaction
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {result.events.map((ev, i) => (
                    <div key={i} style={{ padding: "12px 16px", background: "rgba(0,0,0,0.02)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                      <div style={{ fontWeight: 500, fontSize: "0.875rem", marginBottom: 6 }}>{ev.name}</div>
                      <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--fg-2)", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{ev.args}</pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div style={{ paddingTop: 64, textAlign: "center", color: "var(--fg-3)", fontSize: "0.875rem" }}>Loading…</div>}>
      <VerifyInner />
    </Suspense>
  )
}
