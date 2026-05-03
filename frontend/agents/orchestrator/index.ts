import dotenv from "dotenv";
import path from "path";

// Load environment variables for local execution (ts-node)
if (!process.env.RPC_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
}

import { selectBestAgent } from "./selector";
import { runResearch } from "../research/index";
import { runRiskCheck } from "../risk-guard/index";
import { executeTradeViaKeeperHub } from "../executor/index";
import { getX402Client } from "../shared/x402-client";
import { write0GKV } from "../shared/zero-g-client";
import { deriveWallet } from "../shared/identity";
import { JsonRpcProvider, ethers } from "ethers";

// x402 fees per agent role (in USDC base units, 6 decimals)
const AGENT_FEES: Record<string, bigint> = {
  research:   BigInt(5_000), // $0.005 USDC
  "risk-guard": BigInt(3_000), // $0.003 USDC
  executor:   BigInt(10_000), // $0.010 USDC
};

export async function main(strategy: string, onLog?: (msg: string) => void) {
  const log = (msg: string) => {
    console.log(msg);
    if (onLog) onLog(msg);
  };
  const sessionId = `session-${Date.now()}`;
  const provider = new JsonRpcProvider(process.env.RPC_URL!);
  const orchestratorWallet = deriveWallet(process.env.AGENT_MASTER_SEED!, "orchestrator-001").connect(provider);

  log(`[Orchestrator] Starting session ${sessionId}`);
  log(`[Orchestrator] Strategy: ${strategy}`);

  // 1. Persist initial state to 0G KV (non-fatal — pipeline continues if 0G is unreachable)
  try {
    const { txHash: ogTx } = await write0GKV({
      key: `orchestrator:state:${sessionId}`,
      value: { strategy, status: "STARTED", ts: Date.now() },
      signer: orchestratorWallet,
    });
    log(`[0G KV ✓] Session state written: https://chainscan-galileo.0g.ai/tx/${ogTx}`);
  } catch (e: any) {
    log(`[0G] KV write skipped (non-fatal): ${e.message}`);
  }

  // 2. Select agents by reputation (reads live on-chain scores)
  const researchAgentId = await selectBestAgent({ role: "research", provider });
  const riskAgentId     = await selectBestAgent({ role: "risk-guard", provider });
  const executorAgentId = await selectBestAgent({ role: "executor", provider });

  log(`[Orchestrator] Selected agents: Research(${researchAgentId}), Risk(${riskAgentId}), Executor(${executorAgentId})`);

  // 3. Create x402 client for all inter-agent micropayments
  const x402 = await getX402Client(orchestratorWallet, process.env.X402_FACILITATOR_URL!);

  // ── Step A: Pay Research Agent → Run Research ──────────────────────────────
  log(`[Orchestrator] Paying ${researchAgentId} via x402 ($0.005)...`);
  const researchPayment = await x402.pay({
    to:        process.env.RESEARCH_WALLET!,
    amount:    AGENT_FEES["research"],
    currency:  "USDC",
    reference: `${sessionId}:research`,
  });
  log(`[Orchestrator] x402 payment header created: ${JSON.stringify(researchPayment.header).substring(0, 80)}...`);

  const researchResult = await runResearch({ strategy, sessionId });
  log(`[Research] Recommendation: ${researchResult.recommendation.substring(0, 100)}...`);

  // ── Step B: Pay Risk Guard → Run Risk Check ────────────────────────────────
  log(`[Orchestrator] Paying ${riskAgentId} via x402 ($0.003)...`);
  const riskPayment = await x402.pay({
    to:        process.env.RISK_WALLET!,
    amount:    AGENT_FEES["risk-guard"],
    currency:  "USDC",
    reference: `${sessionId}:risk-guard`,
  });
  log(`[Orchestrator] x402 payment header created: ${JSON.stringify(riskPayment.header).substring(0, 80)}...`);

  // ── Confidence Gate: abort early if model confidence < 70% ──────────────────
  const confidence = researchResult.confidence;
  if (confidence < 70) {
    log(`[Orchestrator] Trade ABORTED — model confidence ${confidence}% is below the 70% threshold.`);
    try {
      const { txHash: ogTx } = await write0GKV({
        key: `orchestrator:state:${sessionId}`,
        value: { strategy, status: "CONFIDENCE_TOO_LOW", confidence, ts: Date.now() },
        signer: orchestratorWallet,
      });
      log(`[0G KV ✓] Abort state written: https://chainscan-galileo.0g.ai/tx/${ogTx}`);
    } catch (e: any) { log(`[0G] KV write skipped: ${e.message}`); }
    return;
  }

  const riskResult = await runRiskCheck({
    sessionId,
    recommendation: researchResult.recommendation,
    confidence,
  });

  if (!riskResult.approved) {
    log(`[Orchestrator] Trade REJECTED by Risk Guard. Flags: ${riskResult.flags.join(", ")}`);
    try {
      const { txHash: ogTx } = await write0GKV({
        key: `orchestrator:state:${sessionId}`,
        value: { strategy, status: "REJECTED", flags: riskResult.flags, ts: Date.now() },
        signer: orchestratorWallet,
      });
      log(`[0G KV ✓] Rejection state written: https://chainscan-galileo.0g.ai/tx/${ogTx}`);
    } catch (e: any) { log(`[0G] KV write skipped: ${e.message}`); }
    return;
  }

  // ── Step C: Pay Executor → Execute Trade ──────────────────────────────────
  log(`[Orchestrator] Paying ${executorAgentId} via x402 ($0.010)...`);
  const execPayment = await x402.pay({
    to:        process.env.EXECUTOR_WALLET!,
    amount:    AGENT_FEES["executor"],
    currency:  "USDC",
    reference: `${sessionId}:executor`,
  });
  log(`[Orchestrator] x402 payment header created: ${JSON.stringify(execPayment.header).substring(0, 80)}...`);

  // NOTE: Uniswap Trading API only serves mainnets.
  // chainId 8453 = Base Mainnet for quote/swap calldata.
  // The RPC_URL in .env (Base Sepolia) is used only for attestation signing, not the swap itself.
  const tradeResult = await executeTradeViaKeeperHub({
    tokenIn:  "0x4200000000000000000000000000000000000006",
    tokenOut: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amountIn: ethers.parseEther("0.01").toString(),
    chainId:  8453,
    onLog:    (msg) => log(msg),
    confidence: researchResult.confidence,
  });

  // 4. Mark session complete in 0G KV (non-fatal)
  try {
    const { txHash: ogTx } = await write0GKV({
      key: `orchestrator:state:${sessionId}`,
      value: { strategy, status: "COMPLETED", txHash: tradeResult.txHash, ts: Date.now() },
      signer: orchestratorWallet,
    });
    log(`[0G KV ✓] Completion state written: https://chainscan-galileo.0g.ai/tx/${ogTx}`);
  } catch (e: any) { log(`[0G] KV write skipped: ${e.message}`); }

  log(`[Orchestrator] ✅ Session ${sessionId} complete. Tx: ${tradeResult.txHash}`);
  return { txHash: tradeResult.txHash };
}

if (require.main === module) {
  const strategy = process.argv[2] || "Go long ETH if RSI < 35";
  main(strategy).catch(console.error);
}
