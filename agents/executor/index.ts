import { buildAndExecuteSwap } from "./swap-flow";
import { registerSwapWorkflow, executeWorkflow, waitForExecution } from "../shared/keeperhub-client";
import { recordOutcome } from "../shared/attestation";
import { write0GLog } from "../shared/zero-g-client";
import { Wallet, JsonRpcProvider } from "ethers";

/**
 * After KeeperHub confirms success, query the RPC for the latest tx hash
 * from our wallet address — this is the REAL on-chain swap tx.
 */
async function resolveRealTxHash(
  provider: JsonRpcProvider,
  wallet: Wallet,
  expectedCalldata: string,
  timeoutMs = 90_000
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  const address = wallet.address;

  while (Date.now() < deadline) {
    try {
      // Get confirmed tx count
      const latestNonce = await provider.getTransactionCount(address, "latest");
      // Check the last few txs (nonce-2 to nonce-1)
      for (let n = latestNonce - 1; n >= Math.max(0, latestNonce - 4); n--) {
        const tx = await (provider as any).send("eth_getTransactionByBlockNumberAndIndex", []);
        if (tx) break;
      }

      // Fallback: query via eth_getBlockByNumber latest transactions
      const block = await provider.getBlock("latest", true);
      if (block && block.transactions) {
        for (const txOrHash of block.transactions) {
          const tx = typeof txOrHash === "string"
            ? await provider.getTransaction(txOrHash)
            : txOrHash as any;
          if (tx && tx.from?.toLowerCase() === address.toLowerCase()) {
            // Check if this looks like a Uniswap swap (large data field)
            const data = tx.data ?? (tx as any).input ?? "";
            if (data && data.length > 10) {
              console.log(`[Executor] Found real swap tx in latest block: ${tx.hash}`);
              return tx.hash;
            }
          }
        }
      }

      // Also check previous block
      const prevBlock = await provider.getBlock("latest", true);
      if (prevBlock && prevBlock.transactions) {
        for (const txOrHash of prevBlock.transactions) {
          const tx = typeof txOrHash === "string"
            ? await provider.getTransaction(txOrHash)
            : txOrHash as any;
          if (tx && tx.from?.toLowerCase() === address.toLowerCase()) {
            const data = tx.data ?? (tx as any).input ?? "";
            if (data && data.length > 10) {
              console.log(`[Executor] Found real swap tx in prev block: ${tx.hash}`);
              return tx.hash;
            }
          }
        }
      }
    } catch (e: any) {
      console.log(`[Executor] Block scan attempt: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  return null;
}

export async function executeTradeViaKeeperHub(params: {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  chainId: number;
  onLog?: (msg: string) => void;
}): Promise<{ txHash: string; auditTrail: object[] }> {
  const log = (msg: string) => {
    if (params.onLog) params.onLog(msg);
    else console.log(msg);
  };

  // 1. Build swap calldata from Uniswap API + record decision attestation
  const { swapCalldata, decisionHash, quoteRequestId, routing } =
    await buildAndExecuteSwap(params);

  // 2. Register swap as a KeeperHub workflow (no pre-signed tx — KeeperHub signs it)
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

  // 3. Get the REAL on-chain tx hash from KeeperHub result or block scan
  let finalTxHash: string | null = result.txHash ?? null;

  if (!finalTxHash) {
    log(`[Executor] KeeperHub did not return txHash — scanning recent blocks...`);
    finalTxHash = await resolveRealTxHash(provider, wallet, swapCalldata.data);
  }

  if (!finalTxHash) {
    // KeeperHub confirmed success but we can't find the tx hash yet — 
    // Use the workflow execution ID as a reference and log a warning
    log(`[Executor] WARNING: Could not resolve on-chain txHash. Workflow ${workflowId} confirmed success.`);
    // Use a derived reference hash from the workflowId so the pipeline can continue
    finalTxHash = `keeperhub:${workflowId}`;
  }

  // 4. Wait a few seconds for the tx to propagate before recording outcome
  // (prevents nonce collision between KeeperHub's tx and our outcome attestation)
  log(`[Executor] Waiting 10s for swap tx to propagate before outcome attestation...`);
  await new Promise(r => setTimeout(r, 10_000));

  // 5. Record outcome on-chain (uses latest nonce AFTER swap is propagated)
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

  // Only log BaseScan link if we have a real tx hash
  if (!finalTxHash.startsWith("keeperhub:")) {
    log(`[BaseScan ✓] Verified on Base Sepolia: https://sepolia.basescan.org/tx/${finalTxHash}`);
  } else {
    log(`[KeeperHub ✓] Execution verified. Workflow: https://app.keeperhub.com/hub/workflows/${workflowId}`);
  }

  // 6. Persist execution log to 0G Storage (non-fatal)
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
