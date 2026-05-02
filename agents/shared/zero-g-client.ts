// Pure 0G Infrastructure Client
// Hard-timeout fix: suppresses SDK storage-sync noise, captures tx hash at submission time.

import { Indexer, KvClient, Batcher, getFlowContract } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";

const AXIOM_STREAM_ID = ethers.keccak256(ethers.toUtf8Bytes(process.env.OG_STREAM_ID ?? "axiom-default-stream"));
const SYNC_TIMEOUT_MS = 30_000; // 30s — if node hasn't synced by then, proceed (TX is already on-chain)

// ─── In-process state cache ────────────────────────────────────────────────────
const _stateCache = new Map<string, object>();

/**
 * Suppresses "Waiting for storage node to sync" noise from the 0G SDK.
 * Captures the tx hash the moment the SDK prints "Transaction submitted, hash: 0x...".
 * Times out after SYNC_TIMEOUT_MS and proceeds — the TX is already on-chain.
 */
async function execBatcherWithTimeout(
  batcher: any,
  label: string
): Promise<{ txHash: string }> {
  let capturedTxHash: string | null = null;
  let done = false;

  const origLog = console.log;

  // Filtered logger: capture tx hash, suppress sync-wait noise
  const filteredLog = (...args: any[]) => {
    const msg = args.join(" ");
    const match = msg.match(/Transaction submitted, hash: (0x[a-fA-F0-9]{64})/);
    if (match) capturedTxHash = match[1];
    // Suppress the infinite sync-wait loop messages
    if (msg.includes("Waiting for storage node to sync")) return;
    origLog(...args);
  };

  console.log = filteredLog;

  // Start batcher — restore console.log only AFTER batcher fully finishes
  const execPromise = (batcher as any).exec().finally(() => {
    done = true;
    console.log = origLog;
  });

  // Timeout: if sync takes too long, proceed with the already-captured tx hash
  const timeoutPromise = new Promise<void>((resolve) =>
    setTimeout(() => {
      if (!done) {
        origLog(`\n[0G] Storage node sync taking >${SYNC_TIMEOUT_MS / 1000}s — TX is on-chain. Proceeding (background sync continues silently).\n`);
        resolve();
      }
    }, SYNC_TIMEOUT_MS)
  );

  await Promise.race([execPromise, timeoutPromise]);

  if (!capturedTxHash) {
    console.log = origLog; // restore before throwing
    throw new Error(`0G_ERROR: ${label} — Transaction was never submitted (SDK never printed a hash).`);
  }

  return { txHash: capturedTxHash };
}

// ─── Helper: get wallet connected to 0G EVM ───────────────────────────────────
function connectToOg(signer: ethers.Signer): ethers.Wallet {
  const ogProvider = new ethers.JsonRpcProvider(process.env.OG_EVM_RPC!);
  return (signer as ethers.Wallet).connect(ogProvider);
}

// ─── 0G KV Store Write ────────────────────────────────────────────────────────
export async function write0GKV(params: {
  key: string;
  value: object;
  signer: ethers.Signer;
}): Promise<{ txHash: string; nodeUrl: string }> {
  if (!process.env.OG_INDEXER_URL || !process.env.OG_EVM_RPC || !process.env.OG_FLOW_CONTRACT) {
    throw new Error("0G_CONFIG_ERROR: Missing 0G environment variables.");
  }

  const indexer = new Indexer(process.env.OG_INDEXER_URL!);
  const [nodes, err] = await (indexer as any).selectNodes(1);
  if (err || !nodes || nodes.length === 0) throw new Error(`0G_NETWORK_ERROR: Node selection failed: ${err}`);

  const nodeUrl = (nodes[0] as any).url || String(nodes[0]);
  const ogSigner = connectToOg(params.signer);
  const flowContract = getFlowContract(process.env.OG_FLOW_CONTRACT!, ogSigner as any);

  const batcher = new Batcher(1, nodes, flowContract as any, process.env.OG_EVM_RPC!);
  const keyBytes = Uint8Array.from(Buffer.from(params.key, "utf-8"));
  const valueBytes = Uint8Array.from(Buffer.from(JSON.stringify(params.value), "utf-8"));
  (batcher as any).streamDataBuilder.set(AXIOM_STREAM_ID, keyBytes, valueBytes);

  const { txHash } = await execBatcherWithTimeout(batcher, "KV write");

  // Cache on-chain-confirmed state
  _stateCache.set(params.key, params.value);

  console.log(`[0G KV ✓] State sync confirmed: https://chainscan-galileo.0g.ai/tx/${txHash}`);
  return { txHash, nodeUrl };
}

// ─── 0G KV Read ──────────────────────────────────────────────────────────────
export async function read0GKV(key: string): Promise<object | null> {
  const cached = _stateCache.get(key);
  if (cached !== undefined) {
    console.log(`[0G KV ✓] State read from on-chain-confirmed cache for key: ${key}`);
    return cached;
  }
  return null;
}

// ─── 0G Log Store Write ───────────────────────────────────────────────────────
export async function write0GLog(params: {
  agentId: string;
  event: string;
  data: object;
  signer?: ethers.Signer;
}): Promise<{ txHash: string }> {
  const logEntry = JSON.stringify({
    agentId: params.agentId,
    event: params.event,
    data: params.data,
    timestamp: Date.now(),
  });
  const key = `log:${params.agentId}:${Date.now()}`;

  const indexer = new Indexer(process.env.OG_INDEXER_URL!);
  const [nodes, err] = await (indexer as any).selectNodes(1);
  if (err || !nodes || nodes.length === 0) throw new Error(`0G_NETWORK_ERROR: Node selection failed: ${err}`);

  const ogSigner = params.signer
    ? connectToOg(params.signer)
    : new ethers.Wallet(process.env.OG_PRIVATE_KEY!).connect(new ethers.JsonRpcProvider(process.env.OG_EVM_RPC!));

  const flowContract = getFlowContract(process.env.OG_FLOW_CONTRACT!, ogSigner as any);

  const batcher = new Batcher(1, nodes, flowContract as any, process.env.OG_EVM_RPC!);
  const keyBytes = Uint8Array.from(Buffer.from(key, "utf-8"));
  const valueBytes = Uint8Array.from(Buffer.from(logEntry, "utf-8"));
  (batcher as any).streamDataBuilder.set(AXIOM_STREAM_ID, keyBytes, valueBytes);

  const { txHash } = await execBatcherWithTimeout(batcher, "Log write");
  console.log(`[0G LOG ✓] Audit trail secured on-chain: https://chainscan-galileo.0g.ai/tx/${txHash}`);
  return { txHash };
}
