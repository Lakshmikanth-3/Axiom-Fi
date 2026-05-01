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

export async function registerSwapWorkflow(
  config: SwapWorkflowConfig
): Promise<WorkflowRegistration> {
  const step = config.steps[0];
  if (!step) throw new Error("No steps provided for workflow");

  // Construct the graph-based nodes and edges required by the production API
  const nodes = [
    {
      id: "trigger-1",
      type: "trigger",
      data: {
        type: "manual",
        label: "Manual Trigger"
      },
      position: { x: 250, y: 5 }
    },
    {
      id: "action-1",
      type: "action",
      data: {
        type: "action",
        label: "Uniswap Swap",
        config: {
          actionType: "web3:write-contract",
          network: "base-sepolia",
          to: step.params.to,
          data: step.params.data,
          value: step.params.value || "0"
        }
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
          
          // In production, txHash might be in the top-level or within nodeStatuses
          const actionNode = result.nodeStatuses?.find((n: any) => 
            n.status === "success" && (n.txHash || n.transactionHash || n.hash)
          );
          
          const txHash = result.txHash || result.transactionHash || result.hash || 
                         actionNode?.txHash || actionNode?.transactionHash || actionNode?.hash;

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
