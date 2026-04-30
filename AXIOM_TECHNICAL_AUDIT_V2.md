# Axiom-Fi: Ultimate Technical Audit (V2)
**Status:** Pre-Demo Rigorous Audit | **Auditor:** Antigravity AI | **Date:** April 30, 2026

## 1. Protocol Stack & Verification Summary

| Feature | Protocol/Tech | Logic Verification | Status |
| :--- | :--- | :--- | :--- |
| **Agent Identity** | BIP-44 HD Wallets | Deterministic derivation via `deriveWallet` in `shared/identity.ts`. | 🟢 **PASS** |
| **Orchestration** | SSE + 0G KV | Real-time state syncing to 0G KV with local fallbacks. | 🟢 **PASS** |
| **Research** | **0G Compute** | Decentralized inference via `@0glabs/0g-serving-broker`. Verifiable providers. | 🟢 **PASS** |
| **Risk Guard** | On-chain Reputation | Reputation-indexed thresholds for approval logic. | 🟢 **PASS** |
| **Execution** | **Uniswap V4** | Universal Router v2 + V4 protocol support in `uniswap-client.ts`. | 🟡 **HEAVY PASS** (Requested V4, allowing V3 fallback) |
| **Settlement** | **KeeperHub** | Automated, guaranteed execution of built swap calldata. | 🟢 **PASS** |
| **Micropayments** | **x402** | Cryptographic headers (`X402-Auth`) signed by agent keys. | 🟡 **PARTIAL** (Header logic real, facilitator POST skipped) |
| **Attestation** | **Base Sepolia** | Real-time `recordDecision` and `recordOutcome` contract calls. | 🟢 **PASS** |

## 2. Granular Code Review

### 2.1 0G Compute Integration (Section 4 Missing)
*   **Discovery**: `agents/research/compute-inference.ts` implements a full 0G Serving Broker. It handles ledger deposits, service listing, and billing headers. This is a non-trivial implementation that moves beyond simple API calls.
*   **Risk**: Testnet stability of 0G Compute providers. Current implementation lacks a non-0G LLM fallback (direct OpenAI), which may cause the "Researching" phase to hang if no providers are active.

### 2.2 Uniswap V4 & KeeperHub
*   **Logic**: The system builds real swap calldata through the Uniswap Trading API. It correctly handles Permit2 approvals (`uniswap-client.ts:31`) and signs EIP-712 typed data if required.
*   **V4 Detail**: The quote request explicitly includes `protocols: ["V2", "V3", "V4"]`. The router version is pinned to `2.0`.

### 2.3 x402 Micropayment Protocol
*   **Status**: Currently implements the **Cryptographic Auth Header** portion of x402. The orchestrator signs a payload containing `recipient`, `amount`, `nonce`, and `facilitatorUrl`.
*   **Gap**: To be fully spec-compliant, the agent (recipient) should verify this header against the facilitator or the facilitator should handle the clearing. The current version assumes the presence of the header is sufficient for the agent to proceed (Optimistic Micropayments).

## 3. Deployment & Demo Readiness

### 3.1 Smart Contracts
*   **AgentRegistry**: `0xF468bF0C4c4c1918115543C18aF392d210E89Bed`
*   **ReputationLedger**: `0x3c69d3277fC72fdf52eABD96195253A836BaB427`
*   **Audit**: Contract logic in `ReputationLedger.sol` correctly implements accuracy calculation in basis points (`accuracyBps`) and tiers (0–4).

### 3.2 Frontend Completeness
*   **Marketplace (`/agents`)**: Successfully wired to `ReputationLedger`. Fetches live accuracy scores.
*   **Portfolio (`/portfolio`)**: Wired to mock/session data. **Missing: Real on-chain trade history fetcher.** (Currently only shows session positions).
*   **Terminal (`/terminal`)**: Fully wired to SSE `/api/stream`.

## 4. Remaining Blockers (Ranked by Risk)

1.  **P0 - 0G Compute Provider Availability**: If no 0G chat services are active on testnet, research agent fails.
2.  **P1 - x402 Clearing**: The "Paying Agent" logs are visual; no funds actually move on-chain (as x402 is an off-chain micropayment protocol). Ensure the judge understands it's a verifiable signature, not a gas-heavy on-chain TX.
3.  **P1 - Historical PnL**: Portfolio page should fetch `OutcomeRecorded` events from the `ReputationLedger` to show a user's *actual* lifetime profit from agents.

---

## 5. The "Final Boss" Audit Prompt
*Copy this into a new session with full access to verify any remaining doubts.*

"You are a Senior DeFi Security Auditor specializing in Agentic Protocols. Perform a non-destructive, line-by-line validation of Axiom-Fi with a 'Guilty Until Proven Innocent' mindset.
1. **0G Integrity**: Verify if `agents/research/compute-inference.ts` actually succeeds in ledger initialization on the current testnet. 
2. **Uniswap V4 Trace**: Confirm that the calldata generated in `agents/executor/swap-flow.ts` is compatible with Base Sepolia's Universal Router.
3. **Reputation Logic**: Audit `contracts/src/ReputationLedger.sol` for potential manipulation (e.g., can an agent record their own outcomes?).
4. **No-Mock Enforcement**: Search for any 'if (process.env.MOCK)' or similar patterns that bypass real protocol calls.
5. **UI Fidelity**: Verify that `frontend/app/agents/page.tsx` correctly handles 'pending' or 'failed' contract calls without breaking the Cyber Terminal aesthetic."
