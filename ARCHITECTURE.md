# 🏗️ Axiom-Fi: Technical Architecture & Workflow

This document outlines the high-level architecture and the step-by-step operational flow of the Axiom-Fi autonomous trading terminal.

---

## 1. System Architecture

The Axiom-Fi system is built on a modular, decentralized stack that separates the user interface, agentic intelligence, and infrastructure layers.

```mermaid
graph TD
    subgraph "User Interface Layer"
        Web[Web Terminal Interface]
        TG[Telegram Bot Interface]
    end

    subgraph "Agentic Pipeline Layer"
        ORC[Orchestrator]
        RES[Research Agent]
        RG[Risk Guard Agent]
        EXE[Executor Agent]
    end

    subgraph "0G Network Infrastructure"
        OGS[(0G Storage - Audit Trail)]
        OGK[(0G KV - Reputation Registry)]
        OGC[0G Compute - LLM Analysis]
    end

    subgraph "Execution & Payment"
        KH[KeeperHub Automation]
        UNI[Uniswap V3 - Base Sepolia]
        X402[x402 Micropayments]
    end

    %% Connections
    Web & TG --> ORC
    ORC <--> OGK
    ORC -- x402 --> RES & RG
    RES & RG --> OGS
    RES & RG --> OGC
    ORC --> EXE
    EXE --> KH
    KH --> UNI
    EXE -- Settlement Proof --> OGK
```

### Architectural Components:
- **Web Terminal:** A premium dashboard for real-time monitoring of the agent audit trail.
- **Telegram Bot:** The primary interface for users to register wallets and trigger strategies.
- **Agent Pipeline:** Specialized TypeScript agents that research, validate risk, and execute trades.
- **0G Storage:** Stores the "Proof of Decision" and logs for every trade, ensuring total transparency.
- **0G KV:** Acts as the decentralized state store for user settings and the "Agent Reputation Registry."
- **0G Compute:** Powers the LLM-driven research and risk analysis logic.
- **x402 Protocol:** Facilitates trustless, performance-indexed micropayments between agents.

---

## 2. Working Workflow (Sequence)

The following sequence diagram illustrates the lifecycle of a single trade strategy, from input to on-chain settlement and reputation update.

```mermaid
sequenceDiagram
    participant U as User (TG/Web)
    participant O as Orchestrator
    participant KV as 0G KV (Reputation)
    participant A as Agents (Research/Risk)
    participant S as 0G Storage (Proofs)
    participant E as Executor (KeeperHub)

    U->>O: Enter Strategy (e.g., "Buy ETH if RSI < 30")
    O->>KV: Fetch Agents with highest Reputation
    KV-->>O: Return Agent Profiles
    O->>A: Dispatch Task + x402 Micropayment
    A->>S: Store signed proof of decision/research
    A-->>O: Return validated trade proposal
    O->>E: Execute Trade on Base Sepolia
    E->>E: Verify on-chain settlement
    E->>KV: Update Agent Reputation based on outcome
    O->>U: Send "Audit Trail Secured" notification
```

### The 5 Steps of Intelligence:
1. **Input:** The strategy is parsed by the Orchestrator.
2. **Selection:** Agents are chosen based on their verifiable on-chain history (Reputation).
3. **Attestation:** Agents provide research and risk checks, anchoring their proofs to 0G Storage.
4. **Execution:** Trades are settled on-chain via KeeperHub and Uniswap.
5. **Accountability:** Reputation scores are updated based on the actual PnL of the trade.

---

## 3. The "No-Mock" Infrastructure

Axiom-Fi follows a strict **No-Mock Policy**. Every component in this architecture interacts with live network nodes:
- **Storage:** All uploads go to the live 0G Storage Testnet.
- **KV:** All reputation state is stored in 0G KV via on-chain flow contracts.
- **Settlement:** All transactions are executed on the Base Sepolia network.
