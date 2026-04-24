// File: agents/shared/keeperhub-client.ts
// Docs: https://docs.keeperhub.com/api

const KEEPERHUB_BASE = "https://api.keeperhub.com";

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
  const res = await fetch(`${KEEPERHUB_BASE}/v1/workflows`, {
    method: "POST",
    headers: khHeaders(),
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`KeeperHub workflow registration failed [${res.status}]: ${err}`);
  }
  return res.json() as Promise<WorkflowRegistration>;
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
  const res = await fetch(`${KEEPERHUB_BASE}/v1/workflows/${workflowId}/execute`, {
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
  timeoutMs = 60_000
): Promise<WorkflowExecutionResult> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(
      `${KEEPERHUB_BASE}/v1/executions/${executionId}`,
      { headers: khHeaders() }
    );
    if (!res.ok) {
      throw new Error(`KeeperHub poll failed [${res.status}]`);
    }
    const result: WorkflowExecutionResult = await res.json();
    if (result.status === "success" || result.status === "failed") {
      return result;
    }
    await new Promise((r) => setTimeout(r, 2_000)); // poll every 2s
  }
  throw new Error(`KeeperHub execution timed out after ${timeoutMs}ms`);
}
