# Axiom-Fi: The Autonomous Agentic Trading Terminal

Axiom-Fi is a 100% decentralized, production-ready trading terminal built on the **0G Network** and **Base Sepolia**. It orchestrates a pipeline of specialized AI agents (Research, Risk Guard, and Executor) to automate DeFi strategies with complete on-chain auditability.

## 🚀 Key Features

- **Decentralized AI Orchestration**: Multi-agent workflow powered by **0G Compute** and **x402 Micropayments**.
- **Immutable Audit Trails**: Every agent decision and market signal is anchored to **0G Storage** and **0G KV**.
- **Automated DeFi Execution**: Intelligent trade routing and execution via **KeeperHub** and **Uniswap V3**.
- **On-Chain Reputation**: Agents are registered on-chain with performance metrics recorded in a dedicated **Reputation Ledger**.
- **Premium Terminal UI**: A real-time, streaming dashboard for strategy execution, analysis, and verification.

## 🛠️ Technology Stack

- **L1 Infrastructure**: [0G Network](https://0g.ai/) (Storage, KV, Compute)
- **Execution Layer**: [Base Sepolia](https://sepolia.basescan.org/) (Smart Contracts & Settlement)
- **Automation**: [KeeperHub](https://keeperhub.com/) (Workflow Orchestration)
- **Micropayments**: [x402](https://x402.org/) (Agent-to-Agent Payments)
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS

## 📋 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Environment variables configured in `.env`

### Installation
```bash
# Clone the repository
git clone https://github.com/Lakshmikanth-3/Axiom-Fi
cd Axiom-Fi

# Install dependencies
npm install
cd frontend
npm install
```

### Running the Terminal
```bash
# Start the frontend and agentic API
cd frontend
npm run dev
```
Navigate to `http://localhost:3000` to access the terminal.

## ⚙️ Environment Variables

The project requires the following environment variables in a `.env` file:

```env
# Network Config
RPC_URL=https://sepolia.base.org
OG_EVM_RPC=https://evmrpc-testnet.0g.ai

# 0G Infrastructure
OG_INDEXER_URL=https://indexer-storage-testnet-standard.0g.ai
OG_FLOW_CONTRACT=0x...
OG_KV_URL=https://kv-testnet.0g.ai

# Agent Wallets
AGENT_MASTER_SEED=your_mnemonic_here
REPUTATION_LEDGER_ADDRESS=0x...

# Third-party APIs
KEEPER_HUB_API_KEY=your_key
BASESCAN_API_KEY=your_key
```

## 🧪 Testing

We provide a comprehensive E2E test script to validate the entire pipeline from research to on-chain settlement:

```powershell
powershell -ExecutionPolicy Bypass -File .\test-e2e.ps1
```

## 📜 License

MIT License. See [LICENSE](LICENSE) for details.
