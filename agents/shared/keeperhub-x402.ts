// File: agents/shared/keeperhub-x402.ts
// Implements x402 payment flow for paying KeeperHub per execution

import { createX402Client } from "x402";
import { executeWorkflow, waitForExecution } from "./keeperhub-client";

export async function payKeeperHubAndExecute(params: {
  workflowId: string;
  orchestratorWallet: any; // Using any to avoid complex type import for now
  keeperHubPaymentAddress: string; // KeeperHub's USDC receiving address
  feeUsdc: bigint;                 // fee in USDC base units (6 decimals)
  facilitatorUrl: string;
}): Promise<{ receipt: any; executionResult: any }> {
  const client = createX402Client({
    wallet: params.orchestratorWallet,
    facilitatorUrl: params.facilitatorUrl,
  });

  // Pay KeeperHub the execution fee via x402
  const receipt = await (client as any).pay({
    to: params.keeperHubPaymentAddress,
    amount: params.feeUsdc,
    currency: "USDC",
  });

  if (!receipt.success) {
    throw new Error(`x402 payment to KeeperHub failed: ${receipt.error}`);
  }

  // After payment confirmed, execute workflow
  const { executionId } = await executeWorkflow(params.workflowId);
  const result = await waitForExecution(executionId);

  return { receipt, executionResult: result };
}
