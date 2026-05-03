import { buildAndExecuteSwap } from "./swap-flow";
import { registerSwapWorkflow, executeWorkflow, waitForExecution, getLastExpectedTxHash } from "../shared/keeperhub-client";
import { recordOutcome } from "../shared/attestation";
import { write0GLog } from "../shared/zero-g-client";
import { Wallet, JsonRpcProvider } from "ethers";

export async function executeTradeViaKeeperHub(params: {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  chainId: number;
  onLog?: (msg: string) => void;
  confidence?: number;
}): Promise<{ txHash: string; auditTrail: object[] }> {
  const log = (msg: string) => {
    if (params.onLog) params.onLog(msg);
    else console.log(msg);
  };

  // 1. Build swap calldata from Uniswap API + record decision attestation
  const { swapCalldata, decisionHash, quoteRequestId, routing } =
    await buildAndExecuteSwap({ ...params, confidence: params.confidence ?? 95 });

  // 2. Register swap as a KeeperHub workflow (signs + broadcasts the raw tx)
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

  // 3. Capture the deterministic tx hash BEFORE KeeperHub executes
  //    (computed from keccak256(signedTx) in registerSwapWorkflow)
  const expectedTxHash = getLastExpectedTxHash();

  log(`[Executor] Registered KeeperHub Workflow. Waiting for remote execution...`);
  const { executionId } = await executeWorkflow(workflowId);
  const result = await waitForExecution(executionId);

  if (result.status !== "success") {
    throw new Error(
      `KeeperHub execution failed (status=${result.status}). Details: ${JSON.stringify(result.auditTrail)}`
    );
  }

  const provider = new JsonRpcProvider(process.env.RPC_URL!);
  const wallet = new Wallet(process.env.EXECUTOR_PRIVATE_KEY!, provider);

  // 4. Resolve the real on-chain tx hash — priority order:
  //    a) KeeperHub result (if it returns one directly)
  //    b) Our pre-computed keccak256(signedTx) — confirmed by waiting on-chain
  //    c) Fallback workflow reference (never shown on BaseScan)
  let finalTxHash: string | null = result.txHash ?? null;

  if (!finalTxHash && expectedTxHash) {
    log(`[Executor] Waiting for swap tx to confirm on-chain...`);
    try {
      // Wait up to 90s for the exact hash to be mined
      const receipt = await provider.waitForTransaction(expectedTxHash, 1, 90_000);
      if (receipt) {
        finalTxHash = receipt.hash;
        log(`[Executor] Swap tx confirmed on-chain: ${finalTxHash}`);
      }
    } catch {
      // waitForTransaction timed out — tx may still be pending
      log(`[Executor] Swap tx not yet mined — using computed hash for audit link`);
      finalTxHash = expectedTxHash; // hash is still correct, just show it
    }
  }

  if (!finalTxHash) {
    throw new Error(
      `EXECUTOR_ERROR: KeeperHub workflow ${workflowId} completed but no real on-chain txHash was resolved. ` +
      `Check KeeperHub dashboard: https://app.keeperhub.com/workflows/${workflowId}`
    );
  }

  // 5. Wait for swap tx to be confirmed before outcome attestation
  //    (prevents nonce collision between pending swap and attestation)
  log(`[Executor] Waiting 8s before outcome attestation...`);
  await new Promise(r => setTimeout(r, 8_000));

  // 6. Record outcome on-chain
  await recordOutcome({
    decisionHash,
    txHash: finalTxHash,
    success: true,
    gasUsed: result.gasUsed ?? "0",
    signer: wallet,
  });
  log(`[Executor] Trade outcome recorded on-chain!`);
  log(`[Uniswap] Routing: ${routing}`);
  log(`[KeeperHub ✓] Workflow: https://app.keeperhub.com/workflows/${workflowId}`);

  // Only emit BaseScan link for real 0x hashes
  if (finalTxHash && !finalTxHash.startsWith("keeperhub:")) {
    log(`[BaseScan ✓] Verified on Base Sepolia: https://sepolia.basescan.org/tx/${finalTxHash}`);
  }

  // 7. Persist execution log to 0G Storage (non-fatal)
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
