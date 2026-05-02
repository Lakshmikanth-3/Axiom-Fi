// File: agents/shared/keeperhub-client.ts
// Docs: https://docs.keeperhub.com/api

const KEEPERHUB_BASE = "https://app.keeperhub.com/api";

function khHeaders(): Record<string, string> {
  if (!process.env.KEEPERHUB_API_KEY) {
    throw new Error("MISSING_VALUE: KEEPERHUB_API_KEY is not set");
  }
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.KEEPERHUB_API_KEY}`,
  };
}

// ─── Register a swap execution workflow ──────────────────────────────────────

export interface SwapWorkflowConfig {
  name: string;
  steps: Array<{
    action: "eth.send_transaction";
    params: {
      to: string;
      data: string;
      value: string;
      gasLimit: string;
      maxFeePerGas: string;
      maxPriorityFeePerGas: string;
      chainId: number;
    };
  }>;
  retryPolicy?: {
    maxAttempts: number;
    backoffMultiplier: number;
  };
}

export interface WorkflowRegistration {
  workflowId: string;
  status: "registered";
}

import { ethers, Wallet, JsonRpcProvider, TransactionRequest } from "ethers";

// ... existing code ...

let lastExpectedTxHash: string | null = null;

/** Returns the keccak256(signedTx) hash computed during registerSwapWorkflow.
 *  This IS the real BaseScan tx hash as long as KeeperHub broadcasts our exact signed bytes. */
export function getLastExpectedTxHash(): string | null {
  return lastExpectedTxHash;
}

export async function registerSwapWorkflow(
  config: SwapWorkflowConfig
): Promise<WorkflowRegistration> {
  const step = config.steps[0];
  if (!step) throw new Error("No steps provided for workflow");

  // Sign the transaction locally so KeeperHub can just broadcast it
  const provider = new JsonRpcProvider(process.env.RPC_URL || "https://sepolia.base.org");
  const wallet = new Wallet(process.env.EXECUTOR_PRIVATE_KEY!, provider);
  
  const txReq: TransactionRequest = {
    to: step.params.to,
    data: step.params.data,
    value: step.params.value || "0",
    gasLimit: step.params.gasLimit || 500000,
    chainId: 84532, // Base Sepolia
    nonce: await wallet.getNonce("pending")
  };

  const populatedTx = await wallet.populateTransaction(txReq);
  const signedTx = await wallet.signTransaction(populatedTx);
  lastExpectedTxHash = ethers.keccak256(signedTx);

  const jsonRpcBody = JSON.stringify({
    jsonrpc: "2.0",
    method: "eth_sendRawTransaction",
    params: [signedTx],
    id: 1
  });

  // Construct the graph-based nodes and edges required by the production API
  const nodes = [
    {
      id: "trigger-1",
      type: "trigger",
      data: {
        type: "trigger",
        config: {
          triggerType: "Manual"
        },
        label: "Manual Trigger"
      },
      position: { x: 250, y: 5 }
    },
    {
      id: "action-1",
      type: "action",
      data: {
        type: "action",
        config: {
          actionType: "HTTP Request",
          endpoint: process.env.RPC_URL || "https://sepolia.base.org",
          httpMethod: "POST",
          httpHeaders: JSON.stringify({ "Content-Type": "application/json" }),
          httpBody: jsonRpcBody
        },
        label: "Broadcast Transaction"
      },
      position: { x: 250, y: 150 }
    }
  ];

  const edges = [
    {
      id: "e1-2",
      source: "trigger-1",
      target: "action-1",
      animated: true
    }
  ];

  const payload = {
    name: config.name,
    nodes,
    edges
  };

  const res = await fetch(`${KEEPERHUB_BASE}/workflows/create`, {
    method: "POST",
    headers: khHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`KeeperHub workflow registration failed [${res.status}]: ${err}`);
  }

  const data = await res.json();
  return {
    workflowId: data.id,
    status: "registered"
  };
}

// ─── Execute a registered workflow ───────────────────────────────────────────

export interface WorkflowExecutionResult {
  executionId: string;
  workflowId: string;
  status: "pending" | "running" | "success" | "failed";
  txHash?: string;
  gasUsed?: string;
  auditTrail: Array<{
    timestamp: string;
    event: string;
    details: object;
  }>;
}

export async function executeWorkflow(
  workflowId: string
): Promise<WorkflowExecutionResult> {
  const res = await fetch(`${KEEPERHUB_BASE}/workflow/${workflowId}/execute`, {
    method: "POST",
    headers: khHeaders(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`KeeperHub execute failed [${res.status}]: ${err}`);
  }
  return res.json() as Promise<WorkflowExecutionResult>;
}

// ─── Poll for execution result ────────────────────────────────────────────────

export async function waitForExecution(
  executionId: string,
  timeoutMs = 120_000
): Promise<WorkflowExecutionResult> {
  const deadline = Date.now() + timeoutMs;
  console.log(`[KeeperHub] Polling execution ${executionId}...`);

  while (Date.now() < deadline) {
    try {
      const res = await fetch(
        `${KEEPERHUB_BASE}/workflows/executions/${executionId}/status`,
        { headers: khHeaders() }
      );
      
      if (res.ok) {
        const result = await res.json();
        console.log(`[KeeperHub] Execution status: ${result.status}`);

        if (result.status === "success") {
          console.log(`[KeeperHub Debug] Execution successful. Result:`, JSON.stringify(result));
          
          let txHash = result.txHash || result.transactionHash || result.hash;
          if (!txHash && result.nodeStatuses) {
            const actionNode = result.nodeStatuses.find((n: any) => n.id === "action-1" || (n.status === "success" && n.result));
            if (actionNode && actionNode.result) {
              try {
                const parsed = typeof actionNode.result === 'string' ? JSON.parse(actionNode.result) : actionNode.result;
                txHash = parsed.result || parsed.hash || actionNode.txHash;
              } catch (e) {
                txHash = actionNode.result;
              }
            }
          }
          if (!txHash && lastExpectedTxHash) {
            txHash = lastExpectedTxHash;
          }

          return {
            ...result,
            status: "success",
            txHash: txHash,
            auditTrail: result.auditTrail || result.nodeStatuses || []
          };
        }
        
        if (result.status === "error" || result.status === "failed") {
          const errorMsg = result.error || result.message || "Unknown error";
          throw new Error(`Execution failed: ${errorMsg}`);
        }
      } else if (res.status === 404) {
        // Sometimes the execution takes a moment to propagate to the status DB
        console.log(`[KeeperHub] Execution ${executionId} not found yet, retrying...`);
      } else {
        console.warn(`[KeeperHub] Poll warning [${res.status}]: ${await res.text()}`);
      }
    } catch (e: any) {
      if (e.message.includes("Execution failed")) throw e;
      console.warn(`[KeeperHub] Poll error: ${e.message}`);
    }
    
    await new Promise((r) => setTimeout(r, 4000)); // poll every 4s
  }
  throw new Error(`KeeperHub execution timed out after ${timeoutMs}ms`);
}
