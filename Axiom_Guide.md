# Axiom Implementation & Infrastructure Guide

This guide explains how to obtain the missing values in your `.env` and successfully deploy the Axiom Agentic Terminal on **Base Sepolia**.

---

## 1. Network & RPC Keys
You need a connection to the Base Sepolia testnet.

*   **`BASE_SEPOLIA_RPC_URL` & `RPC_URL`**
    1.  Go to [Alchemy](https://www.alchemy.com/) or [QuickNode](https://www.quicknode.com/).
    2.  Create a new App for **Base Sepolia**.
    3.  Copy the HTTPS URL and paste it into both `BASE_SEPOLIA_RPC_URL` and `RPC_URL`.

---

## 2. Wallets & Private Keys
You need at least one wallet with testnet funds.

*   **`DEPLOYER_PRIVATE_KEY`**
    1.  Open your browser wallet (e.g., Metamask).
    2.  Switch to **Base Sepolia**.
    3.  Export your Private Key (Settings > Account Details > Show Private Key).
    4.  **Action**: Get free Base Sepolia ETH from the [Base Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet).
*   **`OG_PRIVATE_KEY`**
    *   You can use the same key as above.
    *   **Action**: Get free A0GI tokens from the [0G Faucet](https://faucet.0g.ai/) to pay for decentralized log storage.

---

## 3. 0G Storage Infrastructure
0G provides decentralized storage for your agent's audit trails and KV state.

*   **`OG_FLOW_CONTRACT`**: Use `0x22E03a6A89B950F1c82ec5e74F8eCa321a105296` (Standard for Galileo Testnet).
*   **`OG_STREAM_ID`**: You can use any unique string (e.g., `axiom_production_001`). The system will auto-initialize it.

---

## 4. KeeperHub & x402 Payments
These enable autonomous agent-to-agent payments and execution.

*   **`KEEPERHUB_PAYMENT_ADDRESS`**
    1.  Log into [KeeperHub Dashboard](https://app.keeperhub.com).
    2.  Go to **Developer Settings** or **Wallet**.
    3.  Copy your organization's payment address.
*   **`X402_FACILITATOR_URL`**
    *   Use `https://facilitator.keeperhub.com` for the default x402 gateway.

---

## 5. Deployment Workflow
Once your `.env` is ready, run these exact commands:

### Step A: Deploy Contracts
```powershell
cd contracts
# Run deployment
forge script script/Deploy.s.sol --rpc-url $env:RPC_URL --broadcast --verify
```
*   **Action**: After deployment, `forge` will print the addresses of `AgentRegistry` and `ReputationLedger`. Copy them into the bottom of your `.env`.

### Step B: Seed Reputation Data
```powershell
# Run the seed script to create 30 historical decisions
forge script script/Seed.s.sol --rpc-url $env:RPC_URL --broadcast
```

### Step C: Launch Frontend
```powershell
cd ../frontend
npm run dev
```

---

## 6. How it Works (Real Implementation)
1.  **Orchestrator** receives your strategy.
2.  It queries the **ReputationLedger** on-chain to find the best Research Agent.
3.  It makes an **x402 payment** to the Research Agent via the facilitator.
4.  The agent writes its reasoning to **0G Storage**.
5.  The **Executor** picks up the approved trade and swaps on **Uniswap** using the real Trading API.
6.  The **Outcome** is reconciled on-chain, updating the agent's score.
