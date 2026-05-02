'use client'
import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const STEPS = ['Identity', 'Register', 'Fund', 'Ledger', 'Persist', 'Verify']

type StepStatus = 'pending' | 'active' | 'done'

interface Registration {
  agentId: string
  txHash: string
  blockNumber: number
  address: string
}

interface SseLine { text: string; cls: string }

export default function OnboardPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Step 1 form
  const [name, setName] = useState('')
  const [agentType, setAgentType] = useState('research')
  const [specializations, setSpecializations] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // Step 1 result
  const [derivedAddress, setDerivedAddress] = useState('')
  const [derivedPath, setDerivedPath] = useState('')
  const [deriveToken, setDeriveToken] = useState('')
  const [deriving, setDeriving] = useState(false)
  const [deriveError, setDeriveError] = useState('')

  // Step 2 SSE
  const [sseLines, setSseLines] = useState<SseLine[]>([])
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [registering, setRegistering] = useState(false)
  const sseDivRef = useRef<HTMLDivElement>(null)

  // Step 3 balance
  const [ethBalance, setEthBalance] = useState('')
  const [usdcBalance, setUsdcBalance] = useState('')
  const [funded, setFunded] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const balanceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Step 4 seed
  const [seeding, setSeeding] = useState(false)
  const [seedTxHash, setSeedTxHash] = useState('')
  const [seedError, setSeedError] = useState('')

  // Step 5 persist
  const [persisting, setPersisting] = useState(false)
  const [kvTxHash, setKvTxHash] = useState('')
  const [persistError, setPersistError] = useState('')

  // Step 6 reputation
  const [repScore, setRepScore] = useState<any>(null)

  // Auto-scroll SSE log
  useEffect(() => {
    sseDivRef.current?.scrollTo({ top: sseDivRef.current.scrollHeight, behavior: 'smooth' })
  }, [sseLines])

  // Load QR when address available (Step 3)
  useEffect(() => {
    if (step === 2 && derivedAddress) {
      import('qrcode').then(QR => {
        QR.toDataURL(derivedAddress, { width: 180, margin: 1, color: { dark: '#f0f4ff', light: '#080d1a' } })
          .then(url => setQrDataUrl(url))
          .catch(console.error)
      })
      startBalancePolling()
    }
    return () => {
      if (balanceIntervalRef.current) clearInterval(balanceIntervalRef.current)
    }
  }, [step, derivedAddress])

  function startBalancePolling() {
    async function poll() {
      try {
        const r = await fetch(`/api/onboard/balance?address=${derivedAddress}`)
        if (!r.ok) return
        const data = await r.json()
        setEthBalance(parseFloat(data.eth).toFixed(6))
        setUsdcBalance(parseFloat(data.usdc).toFixed(2))
        setFunded(data.funded)
      } catch { /* network hiccup, retry next interval */ }
    }
    poll()
    balanceIntervalRef.current = setInterval(poll, 5000)
  }

  function stepClass(i: number): StepStatus {
    if (i < step) return 'done'
    if (i === step) return 'active'
    return 'pending'
  }

  // ─── Step 1: Derive wallet ────────────────────────────────────────────────
  async function handleDerive() {
    if (!name.trim()) { setDeriveError('Agent name is required'); return }
    setDeriving(true); setDeriveError('')
    try {
      const r = await fetch('/api/onboard/derive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: agentType }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      setDerivedAddress(data.address)
      setDerivedPath(data.path)
      setDeriveToken(data.token)
      setStep(1)
    } catch (e: any) {
      setDeriveError(e.message)
    } finally {
      setDeriving(false)
    }
  }

  // ─── Step 2: Register on-chain (SSE) ─────────────────────────────────────
  async function handleRegister() {
    setRegistering(true)
    setSseLines([])
    try {
      const r = await fetch('/api/onboard/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), agentType, specializations, derivedAddress }),
      })
      if (!r.body) throw new Error('No response body')
      const reader = r.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''
        for (const part of parts) {
          const line = part.replace(/^data:\s*/, '').trim()
          if (!line) continue
          try {
            const ev = JSON.parse(line)
            const cls = ev.event === 'error' ? 'error' : ev.event === 'verified' ? 'done' : ''
            setSseLines(prev => [...prev, { text: ev.message, cls }])
            if (ev.event === 'verified') {
              setRegistration({ agentId: ev.agentId, txHash: ev.txHash, blockNumber: ev.blockNumber, address: ev.address })
              setStep(2)
            }
            if (ev.event === 'error') setRegistering(false)
          } catch { /* malformed SSE chunk */ }
        }
      }
    } catch (e: any) {
      setSseLines(prev => [...prev, { text: `Error: ${e.message}`, cls: 'error' }])
    } finally {
      setRegistering(false)
    }
  }

  // ─── Step 3: Advance when funded ─────────────────────────────────────────
  function handleFundedContinue() {
    if (balanceIntervalRef.current) clearInterval(balanceIntervalRef.current)
    setStep(3)
  }

  // ─── Step 4: Seed ledger ──────────────────────────────────────────────────
  async function handleSeedLedger() {
    if (!registration) return
    setSeeding(true); setSeedError('')
    try {
      const r = await fetch('/api/onboard/seed-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: agentType, agentId: registration.agentId, token: deriveToken }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      setSeedTxHash(data.seedDecisionTx)
      setStep(4)
    } catch (e: any) {
      setSeedError(e.message)
    } finally {
      setSeeding(false)
    }
  }

  // ─── Step 5: Persist to 0G KV ────────────────────────────────────────────
  async function handlePersist() {
    if (!registration) return
    setPersisting(true); setPersistError('')
    try {
      const r = await fetch('/api/onboard/persist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: registration.agentId, name: name.trim(), agentType, specializations, address: derivedAddress, txHash: registration.txHash }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      setKvTxHash(data.kvTxHash)
      // Fetch initial reputation score
      const repR = await fetch(`/api/agents/reputation?agentId=${encodeURIComponent(registration.agentId)}`)
      if (repR.ok) setRepScore(await repR.json())
      setStep(5)
    } catch (e: any) {
      setPersistError(e.message)
    } finally {
      setPersisting(false)
    }
  }

  function addTag(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const val = tagInput.trim().replace(/,$/, '')
      if (val && !specializations.includes(val)) setSpecializations(prev => [...prev, val])
      setTagInput('')
    }
  }

  return (
    <div className="wizard-container">
      {/* Progress bar */}
      <div className="wizard-progress">
        {STEPS.map((label, i) => {
          const s = stepClass(i)
          return (
            <>
              <div key={`node-${i}`} className="wizard-step-node">
                <div className={`wizard-step-circle ${s}`}>{s === 'done' ? '✓' : i + 1}</div>
                <span className={`wizard-step-label ${s}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div key={`conn-${i}`} className={`wizard-connector ${stepClass(i) === 'done' ? 'done' : ''}`} />}
            </>
          )
        })}
      </div>

      {/* Step 1 – Identity */}
      {step === 0 && (
        <div className="wizard-panel">
          <div className="label-caps">Step 1 — Agent Identity</div>
          <div className="form-field">
            <label className="form-label">Agent Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. momentum-researcher-002" />
          </div>
          <div className="form-field">
            <label className="form-label">Agent Type</label>
            <select className="form-select" value={agentType} onChange={e => setAgentType(e.target.value)}>
              <option value="research">research</option>
              <option value="risk-guard">risk-guard</option>
              <option value="executor">executor</option>
              <option value="orchestrator">orchestrator</option>
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Specializations (press Enter or comma to add)</label>
            <div className="tag-container">
              {specializations.map(t => (
                <span key={t} className="tag-chip">
                  {t}
                  <button className="tag-chip-remove" onClick={() => setSpecializations(prev => prev.filter(x => x !== t))}>×</button>
                </span>
              ))}
              <input className="tag-input-inner" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="momentum, ETH/USDC…" />
            </div>
          </div>
          {deriveError && <div className="sse-line error">{deriveError}</div>}
          <button className="btn-primary" onClick={handleDerive} disabled={deriving}>
            {deriving ? 'Deriving wallet…' : 'Derive Agent Wallet →'}
          </button>
        </div>
      )}

      {/* Step 2 – Register */}
      {step === 1 && (
        <div className="wizard-panel">
          <div className="label-caps">Step 2 — On-Chain Registration</div>
          <div className="derived-address-box">
            <span className="label-caps">Derived Wallet Address</span>
            <span className="mono-address">{derivedAddress}</span>
            <span className="label-caps" style={{ marginTop: 4 }}>Path: {derivedPath}</span>
          </div>
          <a href={`/api/onboard/derive?token=${deriveToken}`} className="btn-ghost" style={{ textDecoration: 'none', textAlign: 'center' }}>
            ⬇ Download Private Key (one-time)
          </a>
          {sseLines.length > 0 && (
            <div className="sse-event-log" ref={sseDivRef}>
              {sseLines.map((l, i) => <div key={i} className={`sse-line ${l.cls}`}>{l.text}</div>)}
            </div>
          )}
          <button className="btn-primary" onClick={handleRegister} disabled={registering || !!registration}>
            {registering ? 'Submitting to Base Sepolia…' : registration ? '✓ Registered' : 'Register Agent On-Chain →'}
          </button>
        </div>
      )}

      {/* Step 3 – Fund */}
      {step === 2 && registration && (
        <div className="wizard-panel">
          <div className="label-caps">Step 3 — Fund Agent Wallet</div>
          <div className="qr-wrapper">
            {qrDataUrl && <img src={qrDataUrl} alt="Agent wallet QR code" width={180} height={180} />}
            <span className="mono-address">{derivedAddress}</span>
          </div>
          <div className="balance-row">
            <span className="label-caps">ETH Balance</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="balance-value">{ethBalance || '…'} ETH</span>
              {funded ? <span className="funded-badge">● FUNDED</span> : <span className="unfunded-badge">◌ NEED ≥ 0.001 ETH</span>}
            </div>
          </div>
          <div className="balance-row">
            <span className="label-caps">USDC Balance</span>
            <span className="balance-value">{usdcBalance || '…'} USDC</span>
          </div>
          <button className="btn-primary" onClick={handleFundedContinue} disabled={!funded}>
            {funded ? 'Continue →' : 'Waiting for funds…'}
          </button>
        </div>
      )}

      {/* Step 4 – Seed Ledger */}
      {step === 3 && (
        <div className="wizard-panel">
          <div className="label-caps">Step 4 — Seed Reputation Ledger</div>
          <p className="sse-line">Seeds an initial neutral record in ReputationLedger.sol so the orchestrator can discover this agent. Uses the deployer wallet as authorized writer.</p>
          {seedError && <div className="sse-line error">{seedError}</div>}
          {seedTxHash && <div className="sse-line done">✓ Seed tx: <a className="tx-link" href={`https://sepolia.basescan.org/tx/${seedTxHash}`} target="_blank" rel="noreferrer">{seedTxHash.slice(0,10)}…</a></div>}
          <button className="btn-primary" onClick={handleSeedLedger} disabled={seeding || !!seedTxHash}>
            {seeding ? 'Writing to Base Sepolia…' : seedTxHash ? '✓ Seeded' : 'Seed Reputation Ledger →'}
          </button>
        </div>
      )}

      {/* Step 5 – Persist to 0G */}
      {step === 4 && (
        <div className="wizard-panel">
          <div className="label-caps">Step 5 — Persist Profile to 0G KV</div>
          <p className="sse-line">Writes agent:{registration?.agentId} to the 0G decentralized KV store so selector.ts can discover this agent across sessions without re-querying the registry every time.</p>
          {persistError && <div className="sse-line error">{persistError}</div>}
          {kvTxHash && <div className="sse-line done">✓ 0G KV tx: <a className="tx-link" href={`https://chainscan-galileo.0g.ai/tx/${kvTxHash}`} target="_blank" rel="noreferrer">{kvTxHash.slice(0,10)}…</a></div>}
          <button className="btn-primary" onClick={handlePersist} disabled={persisting || !!kvTxHash}>
            {persisting ? 'Writing to 0G…' : kvTxHash ? '✓ Persisted' : 'Persist to 0G KV →'}
          </button>
        </div>
      )}

      {/* Step 6 – Verification Summary */}
      {step === 5 && registration && (
        <div className="wizard-panel">
          <div className="label-caps">Step 6 — Verification Summary</div>
          <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div className="summary-row">
              <span className="label-caps">Agent ID</span>
              <span className="mono-address" style={{ maxWidth: 280 }}>{registration.agentId}</span>
            </div>
            <div className="summary-row">
              <span className="label-caps">Wallet</span>
              <a className="tx-link" href={`https://sepolia.basescan.org/address/${derivedAddress}`} target="_blank" rel="noreferrer">{derivedAddress.slice(0,10)}…{derivedAddress.slice(-6)}</a>
            </div>
            <div className="summary-row">
              <span className="label-caps">Registration Tx</span>
              <a className="tx-link" href={`https://sepolia.basescan.org/tx/${registration.txHash}`} target="_blank" rel="noreferrer">{registration.txHash.slice(0,10)}…</a>
            </div>
            <div className="summary-row">
              <span className="label-caps">Block</span>
              <span className="mono-address">{registration.blockNumber}</span>
            </div>
            <div className="summary-row">
              <span className="label-caps">Reputation Tier</span>
              <span className="mono-address">{repScore ? `Unranked · ${repScore.totalDecisions} decisions` : '—'}</span>
            </div>
            <div className="summary-row">
              <span className="label-caps">0G KV Tx</span>
              {kvTxHash && <a className="tx-link" href={`https://chainscan-galileo.0g.ai/tx/${kvTxHash}`} target="_blank" rel="noreferrer">{kvTxHash.slice(0,10)}…</a>}
            </div>
          </div>
          <Link href="/agents" className="btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>
            Go to Agent Marketplace →
          </Link>
        </div>
      )}
    </div>
  )
}
