import { selectBestAgent } from "./selector";
import { runResearch } from "../research/index";
import { runRiskCheck } from "../risk-guard/index";
import { executeTradeViaKeeperHub } from "../executor/index";
import { getX402Client } from "../shared/x402-client";
import { write0GKV } from "../shared/zero-g-client";
import { deriveWallet } from "../shared/identity";
import { JsonRpcProvider, ethers } from "ethers";

export async function main(strategy: string) {
  const sessionId = `session-${Date.now()}`;
  const provider = new JsonRpcProvider(process.env.RPC_URL!);
  const orchestratorWallet = deriveWallet(process.env.AGENT_MASTER_SEED!, "orchestrator-001").connect(provider);

  console.log(`[Orchestrator] Starting session ${sessionId}`);
  console.log(`[Orchestrator] Strategy: ${strategy}`);

  // 1. Persist initial state to 0G KV
  await write0GKV({
    key: `orchestrator:state:${sessionId}`,
    value: { strategy, status: "STARTED", ts: Date.now() },
    signer: orchestratorWallet,
  });

  // 2. Select agents by reputation
  const researchAgentId = await selectBestAgent({ role: "research", provider });
  const riskAgentId = await selectBestAgent({ role: "risk-guard", provider });
  const executorAgentId = await selectBestAgent({ role: "executor", provider });

  console.log(`[Orchestrator] Selected agents: Research(${researchAgentId}), Risk(${riskAgentId}), Executor(${executorAgentId})`);

  // 3. Coordinate workflow with x402 payments
  const x402Client = await getX402Client(orchestratorWallet, process.env.X402_FACILITATOR_URL!);

  // Step A: Research
  console.log(`[Orchestrator] Paying ${researchAgentId} via x402...`);
  // (Simplified x402 call for logic flow)
  const researchResult = await runResearch({ strategy, sessionId });

  // Step B: Risk Check
  console.log(`[Orchestrator] Paying ${riskAgentId} via x402...`);
  const riskResult = await runRiskCheck({ sessionId, recommendation: researchResult.recommendation });

  if (!riskResult.approved) {
    console.log("[Orchestrator] Trade rejected by Risk Guard");
    return;
  }

  // Step C: Execution
  console.log(`[Orchestrator] Paying ${executorAgentId} via x402...`);
  const tradeResult = await executeTradeViaKeeperHub({
    tokenIn: "0x4200000000000000000000000000000000000006", // WETH on Base
    tokenOut: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
    amountIn: ethers.parseEther("0.01").toString(),
    chainId: Number(process.env.CHAIN_ID),
  });

  console.log(`[Orchestrator] Session ${sessionId} complete. Tx: ${tradeResult.txHash}`);
}

if (require.main === module) {
  const strategy = process.argv[2] || "Go long ETH if RSI < 35";
  main(strategy).catch(console.error);
}
