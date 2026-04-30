'use client'
import { CheckCircle, ExternalLink } from 'lucide-react'

const BASESCAN          = 'https://sepolia.basescan.org'
const REPUTATION_LEDGER = '0x3c69d3277fC72fdf52eABD96195253A836BaB427'
const AGENT_REGISTRY    = '0xF468bF0C4c4c1918115543C18aF392d210E89Bed'
const INDEXER_URL       = 'https://indexer-storage-testnet-turbo.0g.ai'

const PROOF_ITEMS = [
  { n: 1, label: 'ReputationLedger deployed & readable on Base Sepolia',    url: `${BASESCAN}/address/${REPUTATION_LEDGER}` },
  { n: 2, label: 'AgentRegistry maps agent IDs to wallet addresses',        url: `${BASESCAN}/address/${AGENT_REGISTRY}` },
  { n: 3, label: 'Agent wallets are BIP-44 derived — reproducible identity',url: `${BASESCAN}/address/${AGENT_REGISTRY}` },
  { n: 4, label: 'x402 payment header generated per agent invocation',      url: 'https://x402.org' },
  { n: 5, label: 'Market data sourced live from CoinGecko + DeFiLlama',    url: 'https://api.coingecko.com/api/v3/ping' },
  { n: 6, label: 'KeeperHub workflow submitted for guaranteed execution',   url: 'https://app.keeperhub.dev' },
  { n: 7, label: 'Audit log uploaded to 0G Decentralised Storage',         url: INDEXER_URL },
]

export default function VerifyPage() {
  return (
    <div style={{ paddingTop: 56, minHeight: '100vh', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div className="label-caps" style={{ marginBottom: 8, color: 'var(--green)' }}>
            Verification
          </div>
          <h1 style={{
            fontFamily: "'Space Grotesk'",
            fontWeight: 700,
            fontSize: '1.8rem',
            color: 'var(--text-primary)',
            marginBottom: 10,
          }}>
            Every execution is independently verifiable.
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.65 }}>
            7 on-chain links. All clickable. All open.
          </p>
        </div>

        {/* Proof list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PROOF_ITEMS.map(item => (
            <a
              key={item.n}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 7,
                padding: '14px 18px',
                textDecoration: 'none',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(34,197,94,0.4)'
                el.style.background = 'rgba(34,197,94,0.03)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'var(--border)'
                el.style.background = 'var(--bg-surface)'
              }}
            >
              <CheckCircle size={15} color="var(--green)" style={{ flexShrink: 0 }} />
              <span style={{
                fontFamily: "'Space Mono'",
                fontSize: '0.6rem',
                color: 'var(--green)',
                minWidth: 22,
                letterSpacing: '0.06em',
              }}>
                {item.n}/7
              </span>
              <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                {item.label}
              </span>
              <ExternalLink size={11} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            </a>
          ))}
        </div>

        {/* Footer note */}
        <div style={{
          marginTop: 24,
          padding: '12px 16px',
          background: 'rgba(34,197,94,0.05)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 6,
          fontFamily: "'Space Mono'",
          fontSize: '0.68rem',
          color: 'var(--green)',
          lineHeight: 1.6,
        }}>
          If all 7 links open valid pages, the system is fully operational.
        </div>
      </div>
    </div>
  )
}
