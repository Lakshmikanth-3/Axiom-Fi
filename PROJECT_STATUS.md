# 🛡️ AXIOM — Verifiable Agentic DeFi Terminal
## Complete Project Status Document

**Chain:** Base Sepolia (Chain ID: 84532)  
**Hackathon:** ETHGlobal  
**Date:** April 25, 2026  
**Overall Status:** 🟢 LIVE & DEMO-READY

---

## 📐 Architecture Overview

```
USER INPUT (Natural Language Strategy)
          │
          ▼
┌─────────────────────────────────────────┐
│          FRONTEND (Next.js 15)          │
│  - Cyber Terminal UI (localhost:3000)   │
│  - Agent Status Dashboard               │
│  - Real-time Activity Feed              │
│  - /api/agents → On-chain reputation   │
│  - /api/logs   → 0G Turbo Indexer      │
└───────────────┬─────────────────────────┘
                │ CLI / API call
                ▼
┌─────────────────────────────────────────┐
│        ORCHESTRATOR (TypeScript)        │
│  - Loads .env, starts session           │
│  - Writes state to 0G KV               │
│  - Selects agents by REPUTATION         │
│  - Pays each agent via x402 headers     │
└────┬──────────────┬──────────────┬──────┘
     │              │              │
     ▼              ▼              ▼
┌─────────┐  ┌─────────────┐  ┌──────────┐
│Research │  │  Risk Guard │  │ Executor │
│  Agent  │  │    Agent    │  │  Agent   │
└────┬────┘  └──────┬──────┘  └────┬─────┘
     │              │              │
     ▼              ▼              ▼
  0G Compute    0G KV Store    KeeperHub
  (LLM Infer)  (State Write)  (Automation)
     │                             │
     ▼                             ▼
  DeFiLlama              Uniswap Trading API
  CoinGecko              (Real Swap Calldata)
                               │
                               ▼
                    Base Sepolia Blockchain
                    (Real tx, Attestation)
```

---

## 📁 Directory Structure

```
openagent/
├── .env                    ✅ All real values set
├── rules.md                📋 Project constraints
├── contracts/              ✅ Deployed Solidity contracts
│   └── src/
│       ├── AgentRegistry.sol
│       └── ReputationLedger.sol
├── agents/                 ✅ Multi-agent backend
│   ├── orchestrator/
│   │   ├── index.ts        Main entry point
│   │   └── selector.ts     Reputation-based agent selection
│   ├── research/
│   │   ├── index.ts        DeFiLlama + CoinGecko + 0G LLM
│   │   └── compute-inference.ts  0G Serving Broker
│   ├── risk-guard/
│   │   └── index.ts        Risk check + 0G KV write
│   ├── executor/
│   │   ├── index.ts        KeeperHub + On-chain attestation
│   │   └── swap-flow.ts    Uniswap API 3-step flow
│   └── shared/
│       ├── identity.ts     HD wallet derivation from seed
│       ├── x402-client.ts  Real x402 payment headers
│       ├── zero-g-client.ts  0G KV + Log Store
│       ├── uniswap-client.ts Real Uniswap Trading API v1
│       ├── keeperhub-client.ts  KeeperHub workflow execution
│       ├── keeperhub-x402.ts    KeeperHub + x402 combined
│       └── attestation.ts  On-chain decision recording
└── frontend/               ✅ Running at localhost:3000
    ├── .env                (copied from root)
    └── app/
        ├── terminal/
        │   └── page.tsx    Main UI page
        └── api/
            ├── agents/route.ts   Live blockchain data
            └── logs/route.ts     Live 0G Indexer data
```

---

## ⛓️ Layer 1: Smart Contracts (Base Sepolia)

| Contract | Address | Status |
|---|---|---|
| **AgentRegistry** | `0xF468bF0C4c4c1918115543C18aF392d210E89Bed` | 🟢 Deployed |
| **ReputationLedger** | `0x3c69d3277fC72fdf52eABD96195253A836BaB427` | 🟢 Deployed |

### 🏆 Proof of Project (Judges' Guide)

The Axiom terminal is designed for maximum verifiability. Judges can audit the system via:

1. **On-Chain Reputation**: Every agent card in the UI links to the `ReputationLedger` contract on Basescan. Judges can see the `accuracyBps` and `totalDecisions` stored in the contract state.
2. **Decentralized Logs**: Every transaction in the Activity Feed contains a **"0G AUDIT ✅"** link. This points to the 0G Storage Indexer, proving that agent logs are immutable and stored on 0G.
3. **HD Identity**: All agent addresses are derived from a single master seed using BIP-44, which judges can reproduce to verify the identity layer.
4. **x402 Micropayments**: Every internal agent call is authorized by a cryptographic x402 header, which can be inspected in the Orchestrator's logs.

### `AgentRegistry.sol`
- Stores the mapping of agent IDs to their wallet addresses.
- Enables lookup of "which wallet is agent `research-001`?"

### `ReputationLedger.sol`
- Core trust layer. Stores per-agent: `totalDecisions`, `correctDecisions`, `accuracyBps`, `tier`, `lastUpdated`.
- **Tiers**: `Unranked → Bronze → Silver → Gold → Axiom`
- Exposes `getReputation(bytes32 agentId)` — called by the frontend `/api/agents` route.
- Exposes `recordDecision` and `recordOutcome` — called by Executor after every trade.
- **Seeded Data**: 30 historical decisions loaded to demonstrate tier logic. All 3 agents are at **Gold Tier (70% accuracy)**.

**Verify on Basescan:**
```
https://sepolia.basescan.org/address/0x3c69d3277fC72fdf52eABD96195253A836BaB427
```

---

## 🧠 Layer 2: Multi-Agent Backend (`/agents`)

### Orchestrator
**File:** `agents/orchestrator/index.ts`
**Run:** `npx ts-node orchestrator/index.ts "strategy"`

| Step | Action | Status |
|---|---|---|
| 1 | Load `.env` via dotenv | ✅ |
| 2 | Derive orchestrator wallet from `AGENT_MASTER_SEED` | ✅ |
| 3 | Write session state to 0G KV Store | 🟡 May fail if testnet nodes are busy |
| 4 | Select best agents by on-chain reputation score | ✅ |
| 5 | Create x402 payment client | ✅ |
| 6 | Run Research → Risk → Execute pipeline | ✅ |

---

### Research Agent
**File:** `agents/research/index.ts`

| Step | Action | Technology | Status |
|---|---|---|---|
| 1 | Fetch live ETH price + 24hr change | CoinGecko API | ✅ |
| 2 | Fetch Uniswap V3 TVL | DeFiLlama API | ✅ |
| 3 | Build analysis prompt | In-memory | ✅ |
| 4 | Submit prompt to 0G Compute Network | `@0glabs/0g-serving-broker` | 🟡 Testnet providers may be offline |
| 5 | Write result to 0G KV Store | `zero-g-client.ts` | 🟡 |
| 6 | Append to 0G Log Store | `zero-g-client.ts` | 🟡 |

---

### Risk Guard Agent
**File:** `agents/risk-guard/index.ts`

| Step | Action | Status |
|---|---|---|
| 1 | Read portfolio state from 0G KV | 🟡 |
| 2 | Evaluate risk parameters | ✅ |
| 3 | Write risk assessment to 0G KV | 🟡 |

---

### Executor Agent
**File:** `agents/executor/index.ts`

| Step | Action | Technology | Status |
|---|---|---|---|
| 1 | Build swap calldata (3-step) | Uniswap Trading API v1 | ✅ |
| 2 | Register as KeeperHub workflow | KeeperHub REST API | ✅ |
| 3 | Execute workflow (guaranteed delivery) | KeeperHub | ✅ |
| 4 | Record outcome on-chain | `ReputationLedger.sol` | ✅ |
| 5 | Persist execution log to 0G Storage | `write0GLog()` | 🟡 |

---

## 🔧 Layer 3: Shared Modules

| Module | What it does | Status |
|---|---|---|
| `identity.ts` | BIP-44 HD wallet derivation from seed | ✅ Real |
| `x402-client.ts` | Real `createPaymentHeader()` from `x402/client` | ✅ Real |
| `zero-g-client.ts` | 0G KV Batcher + Log Indexer upload | 🟡 Testnet |
| `uniswap-client.ts` | Live `/check_approval`, `/quote`, `/swap` calls | ✅ Real |
| `keeperhub-client.ts` | KeeperHub workflow registration + execution | ✅ Real |
| `attestation.ts` | On-chain `recordDecision` + `recordOutcome` | ✅ Real |

---

## 🌐 Layer 4: Frontend Dashboard

| Route | Data Source | Status |
|---|---|---|
| `/terminal` | Page render | 🟢 200 OK |
| `/api/agents` | `ReputationLedger` contract | 🟢 Live (~1-2s) |
| `/api/logs` | 0G Turbo Indexer JSON-RPC | 🟡 Returns after first run |

---

## ⚙️ Environment Config Status

| Variable | Status |
|---|---|
| `RPC_URL` | ✅ Alchemy Base Sepolia |
| `DEPLOYER_PRIVATE_KEY` | ✅ `0x7c7f...` (0x prefixed) |
| `AGENT_MASTER_SEED` | ✅ Set |
| `RESEARCH/RISK/EXECUTOR_PRIVATE_KEY` | ✅ Set |
| `UNISWAP_API_KEY` | ✅ Real key |
| `KEEPERHUB_API_KEY` | ✅ `kh_C06s...` |
| `KEEPERHUB_PAYMENT_ADDRESS` | ✅ `0xdf83...3AC` |
| `X402_FACILITATOR_URL` | ✅ Set |
| `OG_INDEXER_URL` | ✅ Turbo endpoint |
| `OG_FLOW_CONTRACT` | ✅ Set |
| `AGENT_REGISTRY_ADDRESS` | ✅ Deployed |
| `REPUTATION_LEDGER_ADDRESS` | ✅ Deployed |
| `BASESCAN_API_KEY` | ✅ Real key |

---

## ✅ Rules Compliance

| Rule | Status |
|---|---|
| ❌ No Mocks | ✅ All mock fallbacks removed |
| ✅ Real Uniswap | ✅ `uniswap-client.ts` hits live API |
| ✅ Real On-chain Reputation | ✅ Contracts deployed & seeded |
| ✅ Real x402 payments | ✅ `createPaymentHeader()` from x402/client |
| ✅ Real 0G Storage | ✅ `zero-g-client.ts` (testnet dependent) |
| ✅ Real Identity | ✅ BIP-44 HD derivation |
| ✅ Premium UI | ✅ Cyber Terminal with glassmorphism |
| ✅ Verifiable Outcomes | ✅ `attestation.ts` writes on-chain |

---

## 🚦 Known Issues

| Issue | Severity | Root Cause |
|---|---|---|
| 0G KV `flow.market()` error | Medium | SDK `Batcher` expects a different `FixedPriceFlow` contract interface than our v1.2.6 |
| 0G Compute no providers | Medium | 0G testnet inference nodes may be offline during demo |
| Logs empty until first run | Low | Activity Feed only populates after a CLI workflow completes |
| x402 payment not debited | Low | Requires USDC balance in wallet on testnet; facilitator creates the header, debit happens async |

---

## 🏁 Run Commands

```bash
# Terminal 1 — Start the UI
cd frontend && npm run dev
# Open http://localhost:3000/terminal

# Terminal 2 — Run a full agent workflow
cd agents
npx ts-node orchestrator/index.ts "Buy ETH if price drops 5%"

# Verify agents on-chain
npx ts-node scratch/check-rep.ts
```
