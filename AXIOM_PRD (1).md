# Axiom — Product Requirements Document
### *The first agentic trading terminal where agents earn their reputation on-chain and charge accordingly.*

> **Tagline:** "Finally, tools that have something to lose."

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [The Problem — Judge-Oriented Framing](#2-the-problem--judge-oriented-framing)
3. [The Solution](#3-the-solution)
4. [The Story / Pitch Narrative](#4-the-story--pitch-narrative)
5. [What Makes Axiom Different (The "AHA" Layer)](#5-what-makes-axiom-different-the-aha-layer)
6. [Core Features](#6-core-features)
7. [Technical Architecture](#7-technical-architecture)
8. [Repository Structure](#8-repository-structure)
9. [Frontend — `/frontend`](#9-frontend--frontend)
10. [Smart Contracts — `/contracts`](#10-smart-contracts--contracts)
11. [Agent Layer — `/agents`](#11-agent-layer--agents)
12. [Build Flow / Implementation Plan](#12-build-flow--implementation-plan)
13. [Demo Script (Hackathon Presentation)](#13-demo-script-hackathon-presentation)
14. [Judging Criteria Alignment](#14-judging-criteria-alignment)

---

## 1. Project Overview

**Project Name:** Axiom

**Subtitle:** Agentic Trading OS with On-Chain Agent Reputation

**One-liner:** Axiom is a fully autonomous multi-agent trading terminal where every agent builds a verifiable on-chain track record, charges x402 micropayments proportional to its proven performance, and competes in an open agent marketplace — making it the first DeFi system where the tools themselves have accountability.

**Core Technologies:**
- x402 Protocol — agent-to-agent micropayments
- EVM Smart Contracts — agent reputation registry & decision attestation
- Next.js 14 (App Router) — terminal-style frontend
- CDP AgentKit / custom multi-agent orchestration
- On-chain attestation via lightweight custom contract (no third-party dependency required)

---

## 2. The Problem — Judge-Oriented Framing

### The Current State of DeFi Tooling is Broken in a Specific Way Nobody Is Talking About

Every DeFi user who has ever paid for a signal bot, trading assistant, or alpha tool has faced the same invisible wall: **you cannot independently verify whether the tool you are paying for actually works.**

Signal providers show you cherry-picked dashboards. Trading bots show you backtests with survivorship bias baked in. "AI agents" give you confident trade recommendations with zero accountability for outcomes. You pay $200/month and you are trusting a vendor's word — there is no on-chain proof, no trustless track record, no way to audit the agent's history independently.

This is not a tooling problem. This is a **trust infrastructure problem.** And it is endemic across all DeFi.

### The Multi-Agent Angle Makes It Worse

Every multi-agent trading system being built this hackathon season will have the same invisible flaw: the Orchestrator agent blindly trusts its sub-agents. Research Agent says "buy ETH," Risk Guard Agent says "acceptable exposure," Executor Agent fires the trade. Nobody asked: **why should the Orchestrator trust those agents?** There is no history, no accountability, no performance record. It is just a function call dressed up as intelligence.

This is not an agentic economy. This is a hardcoded call graph.

### The Real-World Parallel

When you hire a fund manager, you check their audited track record. When you subscribe to a trading signal provider, you look at Sharpe ratio and maximum drawdown — computed from independently verifiable trade history. When DeFi protocols deploy a new contract, they get audited and verified on-chain.

**Why should AI agents in DeFi be the only participants with zero accountability?**

---

## 3. The Solution

Axiom is a multi-agent trading terminal that solves two problems simultaneously:

**Problem 1 — Fragmented DeFi UX:** Users need a single agentic interface to research, risk-assess, and execute trades across protocols without manually coordinating fifteen different tools.

**Problem 2 — Unverifiable Alpha:** Every agent in every trading system today operates with zero verifiable history. There is no trustless way to know if the agent giving you a recommendation has ever been right before.

**Axiom's answer:** Every agent in the system has an on-chain identity and writes cryptographic attestations of its decisions. Outcomes are reconciled on-chain after trades settle. Over time, each agent accumulates a verifiable accuracy score that is public, auditable, and immutable. The Orchestrator uses this score to select which agents to route tasks to. Agents with better scores charge higher x402 fees. Agents with poor track records get starved of work.

The market becomes the arbiter of agent quality — with no vendor dashboard you have to trust.

---

## 4. The Story / Pitch Narrative

**Opening hook (30 seconds):**
> "You have paid for a trading signal bot. You have seen the backtests. You have read the testimonials. And then it rugged you. Or maybe it just quietly underperformed for six months and you had no way to know. Here is the question nobody is asking: *what if the bot had something to lose?*"

**The build (60 seconds):**
> "Axiom is a fully autonomous trading terminal. You describe a strategy in plain English. An Orchestrator agent spins up a Research Agent to find alpha, a Risk Guard Agent to set exposure limits, and an Executor Agent to fire transactions — all coordinated in real time, all paying each other via x402 micropayments. But here is what nobody else is building: every decision these agents make is hashed and written on-chain as a verifiable attestation. When a trade settles, the outcome is reconciled against the prediction. The Research Agent's accuracy score updates. The Risk Guard's safety record updates. The Executor's slippage record updates. All of it is public. All of it is immutable."

**The aha moment (30 seconds):**
> "Now the Orchestrator is actually intelligent — not just routing tasks to hardcoded functions, but selecting agents based on *proven* performance. And agents that perform well charge more. A Research Agent with 74% on-chain accuracy charges $0.008 per call. A fresh agent charges $0.001. The market sets the price. For the first time in DeFi, the tools themselves have a track record. The tools themselves have something to lose."

---

## 5. What Makes Axiom Different (The "AHA" Layer)

Other teams this weekend will build:
- Multi-agent trading terminal ✓
- x402 payments between agents ✓
- Code editor-style UI ✓

Axiom adds the one layer nobody else thought of:

**On-chain agent reputation that creates a real economic incentive layer.**

This is not a cosmetic addition. It fundamentally changes the architecture:

1. The Orchestrator becomes genuinely intelligent — it makes selection decisions based on verifiable history, not hardcoding.
2. The x402 payment layer gains economic meaning — fees are not arbitrary, they are performance-indexed.
3. The system is extensible — third-party developers can register their own agents into the marketplace and let them compete on performance. You go from "a trading terminal" to "the first competitive marketplace for verifiably performing trading agents."
4. The user story is real and painful — unverifiable alpha is something every DeFi user has been burned by. This is not an abstract infrastructure problem. It is a $200/month knife that cuts every serious DeFi user.

---

## 6. Core Features

### 6.1 Strategy Input Interface
- Natural language strategy input: "Go long ETH if RSI drops below 35 and BTC dominance is rising"
- Code editor-style terminal UI with syntax highlighting
- Real-time agent spawning visualization in a side panel
- Strategy gets parsed by the Orchestrator agent and decomposed into sub-tasks

### 6.2 Multi-Agent Orchestration
- **Orchestrator Agent:** Receives strategy, decomposes into tasks, selects sub-agents based on reputation scores, coordinates workflow
- **Research Agent:** Fetches on-chain data, protocol TVL, token metrics, sentiment signals; outputs structured research report signed with agent identity
- **Risk Guard Agent:** Evaluates proposed position size, checks portfolio exposure, flags risk conditions; outputs signed risk assessment
- **Executor Agent:** Constructs and submits transactions; records slippage and execution quality on-chain

### 6.3 x402 Agent-to-Agent Payments
- Every sub-agent charges the Orchestrator an x402 micropayment per task execution
- Fee amount is dynamically computed: `base_fee × reputation_coefficient`
- Reputation coefficient derived from on-chain accuracy score
- x402 payment receipts are logged in the UI's live activity feed

### 6.4 On-Chain Reputation Registry (The Core Differentiator)
- Smart contract stores: `agentId → [decisionHash, confidence, timestamp]`
- After trade settlement: `decisionHash → outcome (profit/loss delta, actual vs predicted)`
- Accuracy score computed on-chain: rolling window of last N decisions
- Reputation tiers: Bronze (0-40%), Silver (40-60%), Gold (60-75%), Axiom (75%+)
- Each reputation tier unlocks a higher fee multiplier ceiling

### 6.5 Agent Marketplace Panel
- List of all registered agents with live reputation badges
- Sortable by accuracy score, total calls, asset class specialization
- Third-party agent registration flow (MVP: allowlisted, hackathon: open)
- Agent detail page: full decision history, accuracy breakdown by market condition

### 6.6 Live Activity Feed
- Real-time stream of agent actions: task dispatches, x402 payments, on-chain attestations
- Each entry shows: agent name, action type, reputation badge, fee charged, tx hash
- Color-coded by agent type; monospace font for tx hashes and decision hashes

### 6.7 Portfolio Tracker
- Current open positions, PnL, exposure by asset class
- Attribution layer: which agent's recommendation led to which position
- Verifiable audit trail: every position links to its originating Research Agent decision hash

---

## 7. Technical Architecture

### Agent Communication Flow

```
User Strategy Input
       │
       ▼
  Orchestrator Agent
  (selects agents by reputation score)
       │
       ├──── x402 payment ──► Research Agent
       │                        └── signs recommendation → writes attestation hash on-chain
       │
       ├──── x402 payment ──► Risk Guard Agent
       │                        └── signs risk assessment → writes attestation hash on-chain
       │
       └──── x402 payment ──► Executor Agent
                                └── submits tx → writes execution receipt on-chain
                                └── after settlement: reconciles outcome vs prediction → updates reputation scores
```

### On-Chain Data Flow

```
Decision Phase:
  Agent → recordDecision(agentId, decisionHash, confidence, timestamp)

Settlement Phase (after trade closes):
  Keeper/Executor → recordOutcome(decisionHash, pnlDelta, predictedDirection, actualDirection)
  Contract → recomputeAccuracyScore(agentId)
  Contract → updateReputationTier(agentId)

Fee Computation:
  baseFee × reputationCoefficient(tier) = x402 fee for this call
```

### Key Design Decisions

- **No oracle dependency for reputation:** Outcome reconciliation uses the Executor Agent itself (or a trusted keeper) to write results. This is honest for a hackathon scope and honest about the trust model — you are trusting the Executor, which is the same trust model as trusting the trading terminal itself.
- **Decision hash format:** `keccak256(agentId + strategyHash + recommendationPayload + timestamp)` — lightweight, no IPFS dependency needed for MVP
- **x402 integration:** Use the x402 facilitator pattern — Orchestrator holds a funded wallet, each agent call triggers a micropayment before the agent proceeds
- **Agent identity:** Each agent has a deterministic wallet derived from a master seed + agent role — simple and auditable for hackathon

---

## 8. Repository Structure

```
axiom/
│
├── frontend/                    # Next.js 14 App Router application
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Landing / Hero page
│   │   ├── terminal/
│   │   │   └── page.tsx         # Main trading terminal
│   │   ├── agents/
│   │   │   └── page.tsx         # Agent marketplace
│   │   └── portfolio/
│   │       └── page.tsx         # Portfolio tracker
│   ├── components/
│   │   ├── ui/                  # Primitive UI components
│   │   ├── terminal/            # Code editor, strategy input, activity feed
│   │   ├── agents/              # Agent cards, reputation badges, marketplace
│   │   └── portfolio/           # PnL charts, position cards
│   ├── lib/
│   │   ├── wagmi.ts             # Wagmi config
│   │   ├── contracts.ts         # Contract ABIs and addresses
│   │   └── x402.ts              # x402 client utilities
│   ├── styles/
│   │   └── globals.css          # CSS variables, base styles
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.ts
│
├── contracts/                   # Solidity smart contracts
│   ├── src/
│   │   ├── AgentRegistry.sol    # Agent identity registration
│   │   ├── ReputationLedger.sol # Decision attestation + outcome reconciliation
│   │   └── interfaces/
│   │       └── IReputationLedger.sol
│   ├── script/
│   │   ├── Deploy.s.sol         # Foundry deployment script
│   │   └── Seed.s.sol           # Seed test agent data for demo
│   ├── test/
│   │   ├── AgentRegistry.t.sol
│   │   └── ReputationLedger.t.sol
│   ├── foundry.toml
│   └── .env.example
│
├── agents/                      # Agent runtime (Node.js / Python)
│   ├── orchestrator/
│   │   ├── index.ts
│   │   └── selector.ts          # Reputation-based agent selection logic
│   ├── research/
│   │   └── index.ts
│   ├── risk-guard/
│   │   └── index.ts
│   ├── executor/
│   │   └── index.ts
│   ├── shared/
│   │   ├── x402-client.ts       # x402 payment helpers
│   │   ├── attestation.ts       # On-chain attestation writers
│   │   └── identity.ts          # Agent wallet derivation
│   └── package.json
│
├── README.md
└── .env.example
```

---

## 9. Frontend — `/frontend`

### 9.1 Design System

**Color Palette:**
```css
:root {
  --bg-base: #050810;           /* Near-black, blue-tinted */
  --bg-surface: #080d1a;        /* Card backgrounds */
  --bg-elevated: #0d1425;       /* Elevated panels */
  --border: #1a2440;            /* Subtle borders */
  --border-accent: #1e3a6e;     /* Accent borders */

  --blue-primary: #2563eb;      /* Primary blue */
  --blue-bright: #3b82f6;       /* Hover / active states */
  --blue-glow: #60a5fa;         /* Glow accents */
  --blue-dim: #1d4ed8;          /* Dimmed states */

  --text-primary: #f0f4ff;      /* Primary text */
  --text-secondary: #8ba3cc;    /* Secondary text */
  --text-muted: #4a6088;        /* Muted labels */
  --text-mono: #7dd3fc;         /* Monospace accents (hashes, values) */

  --green: #22c55e;             /* Positive PnL */
  --red: #ef4444;               /* Negative PnL / risk flags */
  --amber: #f59e0b;             /* Warnings */

  --rep-bronze: #cd7f32;
  --rep-silver: #94a3b8;
  --rep-gold: #f59e0b;
  --rep-axiom: #60a5fa;         /* Axiom tier — brand blue */
}
```

**Typography:**
```css
/* Primary: Space Grotesk — all headings, body text, UI labels */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

/* Monospace: Space Mono — tx hashes, decision hashes, fee amounts, code editor */
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

body { font-family: 'Space Grotesk', sans-serif; }
.mono { font-family: 'Space Mono', monospace; }
```

**No simple gradients rule:** All visual depth is achieved through:
- Mesh gradient in hero (radial, multi-stop, animated)
- Noise texture overlay on backgrounds
- Box shadows with blue tint (`box-shadow: 0 0 40px rgba(37, 99, 235, 0.15)`)
- Borders with opacity, not gradient fills
- Glow effects on active elements via `text-shadow` and `filter: drop-shadow`

### 9.2 Pages

#### Landing Page (`/`)

**Hero Section:**
- Full viewport height
- Animated mesh gradient background: two radial gradients (deep blue and electric blue) animated with CSS `@keyframes` to slowly shift position — creates a living, breathing depth without being cheap
- Noise texture SVG overlay at 4% opacity for grain
- Large headline in Space Grotesk 700: `"Finally, tools that have something to lose."`
- Subheadline in Space Grotesk 400: `"The first agentic trading terminal where agents earn their reputation on-chain — and charge accordingly."`
- Two CTAs: `Launch Terminal` (primary, blue filled) and `View Agent Marketplace` (ghost)
- Floating agent reputation card visible in background (decorative, shows a mock agent with Axiom tier badge)

**Below hero — three feature callout sections (no gradients, no cards with fills):**
- Dividers between sections use a single pixel border with `rgba(30, 58, 110, 0.6)`
- Content laid out in asymmetric grid (60/40 split alternating) — text left, visual right or vice versa
- Minimalist numbered section markers

#### Terminal Page (`/terminal`)

The main interface. Split into three panels:

**Left Panel — Strategy Input (35% width):**
- Code editor-style textarea with monospace font (Space Mono)
- Syntax highlighting for basic keywords (buy, sell, if, when, ETH, BTC, etc.)
- Line numbers
- Submit button at bottom
- Below the editor: current strategy summary card showing active agents and their reputation tiers

**Center Panel — Live Activity Feed (35% width):**
- Scrolling real-time stream of agent events
- Each entry: `[timestamp] [AgentIcon] AgentName [RepBadge] → action description (fee: $0.008) [txHash truncated]`
- Color coding: Research Agent entries in blue-dim, Risk Guard in amber-dim, Executor in green-dim
- x402 payment entries highlighted with a small coin icon
- On-chain attestation entries show a chain link icon and turn the hash text into a clickable link to block explorer

**Right Panel — Agent Status (30% width):**
- Three agent cards stacked vertically (Research, Risk Guard, Executor)
- Each card: Agent name + type icon, Reputation tier badge, Accuracy score (e.g., `71%`), Total decisions, Current x402 fee, Status indicator (idle / working / waiting)
- When an agent is actively working: subtle pulsing border animation in that agent's accent color

#### Agent Marketplace (`/agents`)

- Grid of agent cards (3 columns)
- Each card: Agent name, description, creator address (truncated), Reputation tier badge, Accuracy score + total decisions, Specialization tags (e.g., `L2 Protocols` `Momentum` `Low-Cap`), Current fee
- Filter/sort bar at top: sort by accuracy, sort by total calls, filter by tier, filter by specialization
- Click into agent: full decision history table with columns `Date | Market | Recommendation | Actual Outcome | Hit/Miss | Confidence`
- Decision history rows are clickable — opens block explorer for on-chain attestation

#### Portfolio (`/portfolio`)

- Overview row: total PnL, win rate, total positions, total agent fees paid
- Positions table: Asset, Entry, Current, PnL, Agent Attribution (which Research Agent recommended this)
- Attribution column links to the specific agent decision hash
- Right sidebar: fee breakdown (how much was paid to each agent type)

### 9.3 Key Components

**`ReputationBadge`**
```tsx
// Displays tier icon + accuracy % + total decisions
// Color-coded by tier: Bronze / Silver / Gold / Axiom
// Used across Terminal, Marketplace, Activity Feed
<ReputationBadge agentId="research-001" tier="gold" accuracy={71} totalDecisions={43} />
```

**`ActivityFeedItem`**
```tsx
// Single row in the live activity feed
// Props: timestamp, agentName, tier, action, fee, txHash, type
// Type determines left border color and icon
<ActivityFeedItem type="attestation" agentName="Research Agent" ... />
```

**`AgentCard`**
```tsx
// Agent overview card for marketplace
// Shows reputation, accuracy, fees, specialization
// Animated border glow on Axiom-tier agents
```

**`StrategyEditor`**
```tsx
// Code editor with line numbers, Space Mono font
// Keyword highlighting via simple regex map
// Controlled textarea with real-time character count
```

**`MeshGradientHero`**
```tsx
// Hero section with animated mesh gradient
// Uses CSS custom properties + @keyframes
// Noise texture overlay via SVG filter
```

### 9.4 Next.js Configuration

- **Framework:** Next.js 14 with App Router
- **Styling:** Tailwind CSS (extended with custom design tokens) + CSS modules for complex animations
- **Web3:** Wagmi v2 + Viem for contract reads/writes
- **State:** Zustand for terminal state (agent statuses, activity feed, strategy)
- **Real-time:** WebSocket or Server-Sent Events for live agent event streaming
- **Animations:** Framer Motion for page transitions and panel mount/unmount
- **Icons:** Lucide React (minimal, clean)

**`tailwind.config.ts` extensions:**
```typescript
extend: {
  fontFamily: {
    grotesk: ['Space Grotesk', 'sans-serif'],
    mono: ['Space Mono', 'monospace'],
  },
  colors: {
    'bg-base': '#050810',
    'bg-surface': '#080d1a',
    'bg-elevated': '#0d1425',
    'blue-primary': '#2563eb',
    'blue-glow': '#60a5fa',
    // ... full token set
  },
  animation: {
    'mesh-shift': 'meshShift 8s ease-in-out infinite alternate',
    'pulse-border': 'pulseBorder 2s ease-in-out infinite',
    'feed-in': 'feedIn 0.3s ease-out',
  }
}
```

---

## 10. Smart Contracts — `/contracts`

Built with Foundry. Deployed on Base Sepolia (or Base mainnet) for hackathon demo.

### 10.1 `AgentRegistry.sol`

**Purpose:** Central registry for all agent identities in the Axiom system.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgentRegistry {
    struct AgentProfile {
        address agentAddress;       // The agent's wallet address
        string name;                // Human-readable name
        string agentType;           // "research" | "risk-guard" | "executor"
        string[] specializations;   // e.g. ["L2", "momentum", "low-cap"]
        address registeredBy;       // Deployer/operator address
        uint256 registeredAt;
        bool isActive;
    }

    mapping(bytes32 => AgentProfile) public agents;  // agentId → profile
    bytes32[] public agentIds;

    event AgentRegistered(bytes32 indexed agentId, address agentAddress, string agentType);
    event AgentDeactivated(bytes32 indexed agentId);

    function registerAgent(
        bytes32 agentId,
        address agentAddress,
        string calldata name,
        string calldata agentType,
        string[] calldata specializations
    ) external;

    function getAgent(bytes32 agentId) external view returns (AgentProfile memory);
    function getAllAgentIds() external view returns (bytes32[] memory);
    function deactivateAgent(bytes32 agentId) external;
}
```

### 10.2 `ReputationLedger.sol`

**Purpose:** The core contract. Records decisions, outcomes, computes accuracy scores, and exposes reputation tier + fee coefficient.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ReputationLedger {

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct Decision {
        bytes32 agentId;
        bytes32 decisionHash;       // keccak256(agentId + strategyHash + payload + ts)
        uint8 confidence;           // 0-100
        int8 predictedDirection;    // +1 long, -1 short, 0 neutral
        uint256 timestamp;
        bool outcomeRecorded;
        bool wasCorrect;
        int256 pnlDelta;            // actual PnL of the trade in basis points
    }

    struct ReputationScore {
        uint256 totalDecisions;
        uint256 correctDecisions;
        uint256 accuracyBps;        // accuracy in basis points (7100 = 71.00%)
        uint8 tier;                 // 0=Unranked 1=Bronze 2=Silver 3=Gold 4=Axiom
        uint256 lastUpdated;
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    mapping(bytes32 => Decision) public decisions;              // decisionHash → Decision
    mapping(bytes32 => bytes32[]) public agentDecisions;        // agentId → [decisionHashes]
    mapping(bytes32 => ReputationScore) public reputations;    // agentId → score

    // ─── Events ───────────────────────────────────────────────────────────────

    event DecisionRecorded(bytes32 indexed agentId, bytes32 indexed decisionHash, uint8 confidence);
    event OutcomeRecorded(bytes32 indexed decisionHash, bool wasCorrect, int256 pnlDelta);
    event ReputationUpdated(bytes32 indexed agentId, uint256 accuracyBps, uint8 tier);

    // ─── Tier Thresholds (in basis points) ────────────────────────────────────
    // Unranked: < 10 decisions
    // Bronze:   0 - 4000 bps  (0 - 40%)
    // Silver:   4001 - 6000   (40 - 60%)
    // Gold:     6001 - 7500   (60 - 75%)
    // Axiom:    > 7500        (> 75%)

    // ─── Fee Coefficients (multiplied by 1000 for integer math) ───────────────
    // Bronze:  1000 (1.0x)
    // Silver:  2000 (2.0x)
    // Gold:    5000 (5.0x)
    // Axiom:   8000 (8.0x)

    // ─── Write Functions ──────────────────────────────────────────────────────

    function recordDecision(
        bytes32 agentId,
        bytes32 decisionHash,
        uint8 confidence,
        int8 predictedDirection
    ) external;

    function recordOutcome(
        bytes32 decisionHash,
        int8 actualDirection,
        int256 pnlDelta
    ) external;

    // ─── Read Functions ───────────────────────────────────────────────────────

    function getReputation(bytes32 agentId) external view returns (ReputationScore memory);
    function getFeeCoefficient(bytes32 agentId) external view returns (uint256);
    function getDecision(bytes32 decisionHash) external view returns (Decision memory);
    function getAgentDecisionHistory(bytes32 agentId) external view returns (bytes32[] memory);

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _recomputeScore(bytes32 agentId) internal;
    function _getTier(uint256 accuracyBps, uint256 totalDecisions) internal pure returns (uint8);
}
```

### 10.3 Deployment Script (`script/Deploy.s.sol`)

```solidity
// Foundry script — deploys AgentRegistry + ReputationLedger
// Registers the four core Axiom agents
// Seeds ReputationLedger with 30 historical decisions + outcomes
//   (so demo shows non-zero reputation scores immediately)
// Outputs deployed addresses to console for .env population
```

**Seeding for Demo:**
The `Seed.s.sol` script writes 30 pre-computed decision hashes and their outcomes onto the deployed contracts so that the demo starts with a Research Agent at 71% accuracy (Gold tier) and a Risk Guard at 58% (Silver tier). This makes the demo immediately compelling — judges see real reputation scores, not zero.

### 10.4 Foundry Configuration

```toml
# foundry.toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
base_sepolia = "${BASE_SEPOLIA_RPC_URL}"
base = "${BASE_MAINNET_RPC_URL}"

[etherscan]
base_sepolia = { key = "${BASESCAN_API_KEY}", url = "https://api-sepolia.basescan.org/api" }
```

---

## 11. Agent Layer — `/agents`

### 11.1 Agent Identity Model

Each agent has a deterministic wallet derived from master seed + role string:
```typescript
// identity.ts
const masterSeed = process.env.AGENT_MASTER_SEED;
const researchWallet = deriveWallet(masterSeed, "research-001");
const riskWallet = deriveWallet(masterSeed, "risk-guard-001");
const executorWallet = deriveWallet(masterSeed, "executor-001");
```

### 11.2 Orchestrator — Reputation-Based Selection

```typescript
// selector.ts — the key differentiator
async function selectAgent(taskType: "research" | "risk-guard" | "executor"): Promise<AgentConfig> {
  const candidates = await registry.getAgentsByType(taskType);
  const scores = await Promise.all(
    candidates.map(id => reputationLedger.getReputation(id))
  );
  // Select highest accuracy score; if tied, lowest fee
  return candidates[selectBestAgent(scores)];
}
```

### 11.3 Agent Task Lifecycle

```
1. Orchestrator calls selectAgent(taskType) → picks best agent by reputation
2. Orchestrator initiates x402 micropayment to selected agent's wallet
3. Agent receives payment → begins task execution
4. Agent computes decision → calls attestation.recordDecision(agentId, hash, confidence, direction)
5. Returns signed recommendation to Orchestrator
6. After trade settles → Executor calls attestation.recordOutcome(decisionHash, actualDirection, pnlDelta)
7. Contract recomputes reputation score and tier
8. Frontend receives event → updates reputation badges in UI
```

### 11.4 x402 Integration

```typescript
// x402-client.ts
import { createX402Client } from 'x402-client'; // or custom implementation

const client = createX402Client({
  wallet: orchestratorWallet,
  facilitatorUrl: process.env.X402_FACILITATOR_URL,
});

// Before calling any sub-agent:
async function payAndCall(agentAddress: string, fee: bigint, taskPayload: unknown) {
  const receipt = await client.pay({ to: agentAddress, amount: fee });
  // Only proceed if payment confirmed
  if (!receipt.success) throw new Error("x402 payment failed");
  return await callAgent(agentAddress, taskPayload, receipt.paymentId);
}
```

---

## 12. Build Flow / Implementation Plan

This plan is optimized for a hackathon where **demo clarity beats technical depth.** Every phase ends with something visible.

### Phase 0 — Setup (2 hours)

- [ ] Initialize monorepo: `frontend/`, `contracts/`, `agents/`
- [ ] `npx create-next-app@latest frontend` with TypeScript + Tailwind
- [ ] `forge init contracts` with Foundry
- [ ] Add Space Grotesk + Space Mono via Google Fonts in `layout.tsx`
- [ ] Set up CSS variables for full design token set
- [ ] Configure Wagmi + Viem in frontend
- [ ] Set up `.env` files with all required keys (BASE_SEPOLIA_RPC_URL, BASESCAN_API_KEY, AGENT_MASTER_SEED, X402_FACILITATOR_URL)

### Phase 1 — Contracts (3 hours)

- [ ] Write `AgentRegistry.sol` (minimal version — just register and read)
- [ ] Write `ReputationLedger.sol` — focus on `recordDecision`, `recordOutcome`, `getReputation`, `getFeeCoefficient`
- [ ] Write tests for both contracts
- [ ] Write `Deploy.s.sol`
- [ ] Write `Seed.s.sol` — seed 30 historical decisions so demo has real scores
- [ ] Deploy to Base Sepolia
- [ ] Verify on Basescan
- [ ] Copy ABIs to `frontend/lib/contracts.ts`

**Checkpoint:** Contracts deployed, Basescan shows verified source, seeded data visible.

### Phase 2 — Agent Layer (4 hours)

- [ ] Build `identity.ts` — deterministic agent wallet derivation
- [ ] Build `attestation.ts` — wrapper for `recordDecision` and `recordOutcome` contract calls
- [ ] Build `x402-client.ts` — micropayment initiation and receipt handling
- [ ] Build Research Agent — mock market data fetch + recommendation generation (can use Claude/GPT for actual LLM call)
- [ ] Build Risk Guard Agent — simple rule-based risk check + signed output
- [ ] Build Executor Agent — constructs mock trade tx + writes outcome after settlement
- [ ] Build Orchestrator — reputation-based selection + task coordination loop
- [ ] Wire everything together with a local test run: input strategy → see all agents fire → see attestations written on-chain

**Checkpoint:** Full agent loop runs end-to-end locally, attestations visible on Base Sepolia.

### Phase 3 — Frontend Core (5 hours)

- [ ] Build `MeshGradientHero` component — animated mesh + noise + tagline
- [ ] Build landing page with hero + three feature sections
- [ ] Build `StrategyEditor` — code editor UI with Space Mono, line numbers, keyword highlighting
- [ ] Build `ActivityFeedItem` and `ActivityFeed` — scrolling real-time feed
- [ ] Build `ReputationBadge` component — all four tiers with correct colors
- [ ] Build `AgentStatusCard` — status indicator + live accuracy + current fee
- [ ] Assemble terminal page layout — three-panel split
- [ ] Wire frontend to agent layer via WebSocket or SSE for live updates
- [ ] Wire contract reads for reputation scores (Wagmi `useReadContract`)

**Checkpoint:** Full terminal page works visually. Typing a strategy triggers agent events visible in feed.

### Phase 4 — Marketplace + Polish (3 hours)

- [ ] Build Agent Marketplace page — grid of agent cards with filter/sort
- [ ] Build agent detail page — full decision history table
- [ ] Add clickable tx hashes → block explorer links throughout
- [ ] Polish all animations: mesh gradient, feed item entrance, badge pulse
- [ ] Add loading/skeleton states
- [ ] Mobile-responsive check (not priority but good to have)
- [ ] Write README with architecture diagram and demo walkthrough

**Checkpoint:** Full product flows. Demo rehearsed.

### Phase 5 — Demo Prep (2 hours)

- [ ] Seed fresh demo data on deployed contracts
- [ ] Prepare two demo scenarios:
  - Scenario A: New agent (Unranked) vs. established Gold agent — show price difference, show Orchestrator selecting Gold
  - Scenario B: Full strategy → agents fire → attestations written → open block explorer showing on-chain proof
- [ ] Prepare 90-second pitch script (hook → build → aha → tagline)
- [ ] Create backup: record a screen recording of the full demo as insurance

---

## 13. Demo Script (Hackathon Presentation)

**Minute 1 — Hook:**
> Open with the problem slide: "You have paid for a signal bot. You saw the backtests. Then it underperformed for six months and you had no way to know. Here's why: no AI agent in DeFi today has a verifiable track record. They have something to gain. They have nothing to lose."

**Minute 2 — Product walkthrough:**
> Switch to live terminal. Type: `"Go long ETH when RSI < 35 and BTC dominance > 52%. Max 5% portfolio exposure."` → Hit submit. Show the Orchestrator selecting agents in real time (activity feed). Show the Research Agent being selected because it has a 71% on-chain accuracy (Gold tier) over 43 decisions — not because it was hardcoded. Show the x402 payment: Research Agent charges $0.008 because its reputation coefficient is 5x. Show the attestation hash written on-chain, click through to Basescan. Show the Risk Guard sign off. Show Executor construct the trade.

**Minute 3 — The aha moment:**
> Switch to Agent Marketplace. Show a freshly registered agent (0 decisions, Unranked, $0.001/call) next to the established Research Agent (71%, Gold, $0.008/call). Say: "This is the first time in DeFi that the market sets the price of an intelligence service based on verifiable proof of past performance. Not a vendor dashboard. Not a backtest. On-chain. Immutable. Auditable by anyone." → Show decision history table. Every row links to a block explorer attestation.

**Closing line:**
> "Finally, tools that have something to lose."

---

## 14. Judging Criteria Alignment

| Criterion | How Axiom Addresses It |
|-----------|----------------------|
| **Use of x402** | x402 is not decorative — every single agent-to-agent call requires a micropayment. The fee amount is dynamically computed from on-chain reputation. x402 is the economic engine of the agent selection system. |
| **Multi-agent collaboration** | Four distinct agents (Orchestrator, Research, Risk Guard, Executor) with distinct responsibilities and a real selection algorithm. Not just a function call chain. |
| **Novel / compelling idea** | On-chain agent reputation is the one thing no other team built. It adds economic logic that makes the multi-agent architecture genuinely intelligent, not just orchestrated. |
| **Real-world UX problem** | Unverifiable alpha is a real pain every DeFi user has experienced. This is not an abstract infrastructure problem. It has a named cost: money paid to tools that cannot prove they work. |
| **Technical execution** | Smart contracts verified on-chain. Reputation scores computed from real data. x402 payments traceable on-chain. Attestation hashes auditable on block explorer. Everything is verifiable. |
| **Story and presentation** | Clear hook, clear pain, clear aha. Tagline lands because it is emotional and true. Demo shows the full loop end-to-end, not just slides. |
| **UI quality** | Terminal-style interface that matches the agentic nature of the product. Reputation badges and activity feed make the system feel alive. Design is distinctive — mesh gradient hero, Space Grotesk/Mono pairing, no generic gradients, minimalist dark blue aesthetic. |
| **Extensibility** | The agent marketplace framing means judges can see the bigger vision: any developer can register an agent, compete on performance, and earn fees proportional to their track record. Axiom is not just a trading terminal — it is the first performance-verified agent marketplace for DeFi. |

---

*Axiom — built at ETHGlobal OpenAgents. First-place vision, executed with precision.*
