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
}): Promise<{ txHash: string; auditTrail: object[] }> {
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

  // 3. Execute via KeeperHub (guaranteed delivery)
  console.log(`[Executor] Registered KeeperHub Workflow. Waiting for remote execution...`);
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

  // KeeperHub confirmed the workflow trigger but did NOT submit the on-chain tx
  // (it only ran trigger-1, not action-1 — no wallet is configured on KeeperHub's side).
  // Fall back: execute the swap directly with our own wallet.
  let finalTxHash = result.txHash;
  if (!finalTxHash) {
    console.log(`[Executor] KeeperHub trigger-only — no txHash returned. Executing swap directly on-chain...`);
    const rawTx = await wallet.sendTransaction({
      to:       swapCalldata.to,
      data:     swapCalldata.data,
      value:    BigInt(swapCalldata.value ?? "0"),
      gasLimit: swapCalldata.gasLimit ? BigInt(swapCalldata.gasLimit) : undefined,
    });
    console.log(`[Executor] Direct tx submitted: ${rawTx.hash} — waiting for confirmation...`);
    const receipt = await rawTx.wait();
    finalTxHash = receipt?.hash ?? rawTx.hash;
    console.log(`[Executor ✓] Direct tx confirmed: ${finalTxHash}`);
  }

  // 4. Record real outcome on-chain
  await recordOutcome({
    decisionHash,
    txHash: finalTxHash,
    success: true,
    gasUsed: result.gasUsed ?? "0",
    signer: wallet,
  });
  console.log(`[Executor ✓] Trade outcome recorded on-chain!`);
  console.log(`[Uniswap ✓] Routing: ${routing}`);
  console.log(`[Uniswap ✓] Swap UI: https://app.uniswap.org/swap?inputCurrency=${params.tokenIn}&outputCurrency=${params.tokenOut}&chain=base_sepolia`);
  console.log(`[KeeperHub ✓] Status: https://app.keeperhub.com/executions/${executionId}`);
  console.log(`[BaseScan ✓] Verified on Base Sepolia: https://sepolia.basescan.org/tx/${finalTxHash}`);

  // 5. Persist execution log to 0G Storage
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

  return {
    txHash: finalTxHash,
    auditTrail: result.auditTrail,
  };
}
