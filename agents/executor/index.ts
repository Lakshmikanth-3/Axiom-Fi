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
  const { executionId } = await executeWorkflow(workflowId);
  const result = await waitForExecution(executionId);

  if (result.status !== "success" || !result.txHash) {
    throw new Error(
      `KeeperHub execution failed: ${JSON.stringify(result.auditTrail)}`
    );
  }

  const provider = new JsonRpcProvider(process.env.RPC_URL!);
  const wallet = new Wallet(process.env.EXECUTOR_PRIVATE_KEY!, provider);

  // 4. Record real outcome on-chain
  await recordOutcome({
    decisionHash,
    txHash: result.txHash,
    success: true,
    gasUsed: result.gasUsed ?? "0",
    signer: wallet,
  });

  // 5. Persist execution log to 0G Storage
  await write0GLog({
    agentId: "executor-001",
    event: "swap_executed",
    data: {
      txHash: result.txHash,
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
    txHash: result.txHash,
    auditTrail: result.auditTrail,
  };
}
