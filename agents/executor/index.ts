import { buildAndExecuteSwap } from "./swap-flow";
import { registerSwapWorkflow, executeWorkflow, waitForExecution } from "../shared/keeperhub-client";
import { recordOutcome } from "../shared/attestation";
import { write0GLog } from "../shared/zero-g-client";
import { Wallet, JsonRpcProvider } from "ethers";

export async function executeTradeViaKeeperHub(params: {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  chainId: number;
  onLog?: (msg: string) => void;
}): Promise<{ txHash: string; auditTrail: object[] }> {
  const log = (msg: string) => {
    if (params.onLog) params.onLog(msg);
    else console.log(msg); // standalone mode only
  };
  // 1. Build swap calldata from Uniswap API
  const { swapCalldata, decisionHash, quoteRequestId, routing } =
    await buildAndExecuteSwap(params);

  // 2. Register swap as a KeeperHub workflow
  const { workflowId } = await registerSwapWorkflow({
    name: `axiom-swap-${quoteRequestId}`,
    steps: [
      {
        action: "eth.send_transaction",
        params: {
          to: swapCalldata.to,
          data: swapCalldata.data,
          value: swapCalldata.value,
          gasLimit: swapCalldata.gasLimit,
          maxFeePerGas: swapCalldata.maxFeePerGas,
          maxPriorityFeePerGas: swapCalldata.maxPriorityFeePerGas,
          chainId: swapCalldata.chainId,
        },
      },
    ],
    retryPolicy: {
      maxAttempts: 3,
      backoffMultiplier: 2,
    },
  });

  log(`[Executor] Registered KeeperHub Workflow. Waiting for remote execution...`);
  const { executionId } = await executeWorkflow(workflowId);
  const result = await waitForExecution(executionId);

  if (result.status !== "success") {
    const errorDetails = result.auditTrail
      ? JSON.stringify(result.auditTrail)
      : "No audit trail available";
    throw new Error(
      `KeeperHub execution failed (status=${result.status}). Details: ${errorDetails}`
    );
  }

  const provider = new JsonRpcProvider(process.env.RPC_URL!);
  const wallet = new Wallet(process.env.EXECUTOR_PRIVATE_KEY!, provider);

  const finalTxHash = result.txHash;
  if (!finalTxHash) {
    throw new Error(`[Executor] FATAL: KeeperHub execution succeeded but returned no txHash. Real execution requires KeeperHub to broadcast the transaction.`);
  }

  // 4. Record real outcome on-chain
  await recordOutcome({
    decisionHash,
    txHash: finalTxHash,
    success: true,
    gasUsed: result.gasUsed ?? "0",
    signer: wallet,
  });
  log(`[Executor] Trade outcome recorded on-chain!`);
  log(`[Uniswap] Routing: ${routing}`);
  log(`[KeeperHub ✓] Workflow: https://app.keeperhub.com/hub/workflows/${workflowId}`);
  log(`[BaseScan ✓] Verified on Base Sepolia: https://sepolia.basescan.org/tx/${finalTxHash}`);

  // 5. Persist execution log to 0G Storage (non-fatal)
  try {
    await write0GLog({
      agentId: "executor-001",
      event: "swap_executed",
      data: {
        txHash: finalTxHash,
        quoteRequestId,
        routing,
        workflowId,
        executionId,
        auditTrail: result.auditTrail,
        timestamp: Date.now(),
      },
      signer: wallet,
    });
  } catch (e: any) {
    log(`[Executor] 0G log write skipped (non-fatal): ${e.message}`);
  }

  return {
    txHash: finalTxHash,
    auditTrail: result.auditTrail,
  };
}
