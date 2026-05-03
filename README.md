# 🪐 Axiom-Fi: The Autonomous Agentic Trading Terminal

```text
      ___       ___           ___           ___           ___           ___           ___     
     /  /\     /  /\         /__/\         /  /\         /  /\         /  /\         /__/\    
    /  /::\   /  /::\        \  \:\       /  /::\       /  /::\       /  /::\        \  \:\   
   /  /:/\:\ /  /:/\:\        \  \:\     /  /:/\:\     /  /:/\:\     /  /:/\:\        \  \:\  
  /  /:/~/://  /:/~/::\   _____\__\:\   /  /:/  \:\   /  /:/  \:\   /  /:/~/::\   _____\__\:\ 
 /__/:/ /://__/:/ /:/\:\ /__/::::::::\ /__/:/ \__\:\ /__/:/ \__\:\ /__/:/ /:/\:\ /__/::::::::\
 \  \:\/:/ \  \:\/:/__\/ \  \:\~~~~~~\ \  \:\ /  /:/ \  \:\ /  /:/ \  \:\/:/__\/ \  \:\~~~~~~\
  \  \::/   \  \::/       \  \:\        \  \:\  /:/   \  \:\  /:/   \  \::/       \  \:\      
   \  \:\    \  \:\        \  \:\        \  \:\/:/     \  \:\/:/     \  \:\        \  \:\     
    \  \:\    \  \:\        \  \:\        \  \::/       \  \::/       \  \:\        \  \:\    
     \__\/     \__\/         \__\/         \__\/         \__\/         \__\/         \__\/    

                 DECENTRALIZED AGENTIC INTELLIGENCE · POWERED BY 0G NETWORK
```

Axiom-Fi is a state-of-the-art, **100% decentralized trading terminal** that orchestrates a pipeline of specialized AI agents to automate complex DeFi strategies. Built for the **0G Network Hackathon**, it leverages **0G Storage**, **0G KV**, and **0G Compute** to ensure every decision is verifiable, immutable, and performant.

---

## 💡 The Core Idea: The "Agentic Pipeline"

Traditional trading bots are "black boxes." You send money, and hope it works. **Axiom-Fi** breaks this paradigm by splitting the trading process into a verifiable, multi-agent pipeline where agents **pay each other** for work and **prove their decisions** on-chain.

### The Pipeline Architecture:

1.  **🔍 Research Agent**: Analyzes live market data (Uniswap V3 pools, sentiment, volatility) and generates a structured trade proposal using **0G Compute**.
2.  **🛡️ Risk Guard Agent**: Validates the proposal against the user's historical portfolio and global risk parameters stored in **0G KV**.
3.  **⚡ Executor Agent**: Converts the approved proposal into an on-chain workflow using **KeeperHub** and monitors the settlement.
4.  **🪙 Orchestrator**: The "Glue" that manages state transitions, triggers **x402 Micropayments**, and anchors the entire audit trail to **0G Storage**.

---

## 🛠️ Infrastructure Hardening (No-Mock Policy)

Axiom-Fi follows a strict **"Hard-Fail"** mandate. Unlike typical demos that use mocks when infrastructure is slow, Axiom-Fi is engineered for production stability on the **0G Galileo Testnet**:

- **Singleton Provider Caching**: Optimized `JsonRpcProvider` with `staticNetwork(16602)` and extended 90s timeouts to survive testnet latency.
- **On-Chain Audit Trails**: Every agent decision is hashed and anchored to the **0G Log Store** before the next stage proceeds.
- **Deterministic Verification**: Every trade outcome is attested on **Base Sepolia** via the `ReputationLedger` contract.
- **x402 Protocol**: Real cryptographic signatures used for all inter-agent micropayments.

---

## 🔄 The Flow of Intelligence

### Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User (Telegram/Web)
    participant O as Orchestrator
    participant R as Research Agent
    participant RG as Risk Guard
    participant E as Executor
    participant OG as 0G Network (Storage/KV)
    participant KH as KeeperHub

    U->>O: /trade "Swap 0.1 ETH for USDC"
    O->>OG: Fetch User Wallet/State
    O->>R: Analyze Market (0G Compute)
    R-->>O: Trade Proposal + Confidence
    O->>RG: Validate Risk (Portfolio from 0G KV)
    RG-->>O: Approval/Rejection
    O->>E: Execute Trade
    E->>KH: Trigger On-Chain Workflow
    KH-->>E: Tx Hash
    E->>OG: Record Outcome (Log + Proof)
    O->>U: Update UI (Pipeline Complete)
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18.x or higher
- **Wallet**: A wallet funded with **Base Sepolia ETH** and **A0GI** (0G Testnet Tokens).
- **Telegram Bot**: Obtain a token from [@BotFather](https://t.me/botfather).

### 2. Environment Setup
Create a `.env` file in the root directory (see `.env.example` for full fields):
```env
# Network
RPC_URL=https://sepolia.base.org
OG_EVM_RPC=https://evmrpc-testnet.0g.ai

# 0G Infrastructure
OG_INDEXER_URL=https://indexer-storage-testnet-turbo.0g.ai
OG_FLOW_CONTRACT=0x22E03a6A89B950F1c82ec5e74F8eCa321a105296

# Contracts
AGENT_REGISTRY_ADDRESS=0xF468bF0C4c4c1918115543C18aF392d210E89Bed
REPUTATION_LEDGER_ADDRESS=0x3c69d3277fC72fdf52eABD96195253A836BaB427
```

### 3. Installation & Launch
```bash
# Install root & agent dependencies
npm install

# Run the Telegram Bot (Forced Polling Mode)
npm run bot

# Run the Web Dashboard
npm run dev
```

---

## 📱 Using the App

### Via Telegram (@AxiomFiTrading_bot)
The Telegram bot is your primary interface for the autonomous pipeline.
-   **/start**: Initialize the bot and receive your unique agent identity.
-   **/wallet <address>**: Register your Base Sepolia wallet. Stored in **0G KV**.
-   **/trade <strategy>**: Trigger the agentic pipeline.
-   **/status**: Check the current health of the 0G Network nodes.

### Via Web Terminal
Navigate to `localhost:3000/terminal` to view:
-   **Live Audit Trail**: Every log line streamed from the agents in real-time.
-   **0G Explorer Links**: Direct links to the 0G Chain Scan for every stored proof.
-   **Reputation Scoreboard**: Live accuracy tracking for every registered agent.

---

## 🛡️ Trust & Verification
Axiom-Fi is built on the principle of **"Don't Trust, Verify."** 
- Every decision made by an agent is signed and stored in **0G Storage**.
- You can verify any trade by clicking the **"Full Analysis"** button in Telegram, which pulls the raw logs directly from the decentralized storage network.

---

## 📜 License
Built with ❤️ for the 0G Network Hackathon. MIT License.
�� for the 0G Network Hackathon. MIT License.
