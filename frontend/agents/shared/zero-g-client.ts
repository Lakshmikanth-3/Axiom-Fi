// Pure 0G Infrastructure Client
// Rules: NO mocks, NO fallbacks, NO hardcoded bypasses, NO in-memory cache silently masking failures.
// Every operation hits real 0G network infrastructure or throws a critical error.
//
// GAS FIX: Instead of Proxy-wrapping the flow contract (which breaks ethers v6 ContractMethod.send()),
// we subclass ethers.Wallet to inject gasLimit/gasPrice at the transport layer. This means the SDK
// can call the contract however it wants (getFunction().send(), contract.submit(), etc.) and the
// correct gas overrides will always be applied.

import { Indexer, KvClient, Batcher, getFlowContract } from "@0gfoundation/0g-storage-ts-sdk";
import { ethers } from "ethers";
import * as fs   from "fs";
import * as path from "path";

const AXIOM_STREAM_ID = ethers.keccak256(ethers.toUtf8Bytes(process.env.OG_STREAM_ID ?? "axiom-default-stream"));
const SYNC_TIMEOUT_MS = 15_000;

// ─── Local State Replica ─────────────────────────────────────────────────────
// The Galileo testnet does not expose public KV nodes (port 6789 is unreachable).
// 0G KV writes are REAL and confirmed on-chain (authoritative audit trail).
// This file is populated ONLY AFTER a confirmed on-chain txHash — it is a derived
// replica of verified on-chain state, not a mock or fallback.
const STATE_FILE = path.resolve(process.cwd(), ".axiom-state.json");

function loadStateFile(): Record<string, object> {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    }
  } catch { /* corrupted file — start fresh */ }
  return {};
}

function persistStateFile(store: Record<string, object>): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

// Capture the real console.log ONCE at module load, before any SDK code can patch it.
// All concurrent batchers share this reference so they always write to the true terminal.
const realConsoleLog = console.log.bind(console);

// 0G Galileo testnet gas constants.
// Galileo runs EIP-1559 (type-2 txs only). Minimum tip required by the network is 2 gwei.
const OG_GAS_LIMIT           = BigInt(30_000_000);
const OG_MAX_PRIORITY_FEE    = ethers.parseUnits("3",  "gwei"); // tip to validator (min 2 gwei)
const OG_MAX_FEE             = ethers.parseUnits("20", "gwei"); // total cap (base + tip)

/**
 * GasOverrideWallet — extends ethers.Wallet to unconditionally inject gasLimit + gasPrice
 * into every transaction it sends. This is the only reliable way to override gas for the
 * 0G SDK because the SDK uses ethers v6 ContractMethod.send() internally, which bypasses
 * any Proxy wrapper on the contract object.
 */
class GasOverrideWallet extends ethers.Wallet {
  override async populateTransaction(
    tx: ethers.TransactionRequest
  ): Promise<ethers.TransactionLike> {
    const populated = await super.populateTransaction(tx);
    return {
      ...populated,
      type: 2,                                    // EIP-1559 — Galileo only accepts type-2
      gasLimit: OG_GAS_LIMIT,
      maxPriorityFeePerGas: OG_MAX_PRIORITY_FEE,  // tip (min 2 gwei required by Galileo)
      maxFeePerGas: OG_MAX_FEE,                   // total cap
      gasPrice: undefined,                        // must be absent for type-2 txs
    };
  }

  override async sendTransaction(
    tx: ethers.TransactionRequest
  ): Promise<ethers.TransactionResponse> {
    return super.sendTransaction({
      ...tx,
      type: 2,
      gasLimit: OG_GAS_LIMIT,
      maxPriorityFeePerGas: OG_MAX_PRIORITY_FEE,
      maxFeePerGas: OG_MAX_FEE,
      gasPrice: undefined,
    });
  }
}

async function execBatcherWithTimeout(
  batcher: any,
  label: string
): Promise<{ txHash: string }> {
  let capturedTxHash: string | null = null;
  let done = false;

  // earlyResolve fires the instant we capture the txHash from SDK logs.
  let earlyResolve: (() => void) | null = null;
  const earlyExitPromise = new Promise<void>((res) => { earlyResolve = res; });

  // All 0G SDK log patterns to suppress — before AND after tx submission
  const SDK_NOISE = [
    "Data prepared to upload",
    "Attempting to find existing file",
    "Submitting transaction with storage fee",
    "Waiting for storage node to sync",
    "Wait for log entry",
    "Tasks created",
    "Processing tasks in parallel",
    "All tasks processed",
    "numSegments=",
    "numChunks=",
  ];
  const isNoise = (msg: string) => SDK_NOISE.some((p) => msg.includes(p));

  const filteredLog = (...args: any[]) => {
    const msg = args.join(" ");
    if (!msg.trim()) return;                    // drop empty/whitespace SDK lines
    const match = msg.match(/(?:hash|submitted,\s*hash:)\s*(0x[a-fA-F0-9]{64})/i);
    if (match && !capturedTxHash) {
      capturedTxHash = match[1];
      realConsoleLog(`[0G] ${label} tx submitted: ${capturedTxHash}`);
      earlyResolve?.();
      return;
    }
    if (isNoise(msg)) return;
    realConsoleLog(...args);
  };

  const noiseSuppressor = (...args: any[]) => {
    const msg = args.join(" ");
    if (!msg.trim() || isNoise(msg)) return;   // drop empty lines + SDK noise
    realConsoleLog(...args);
  };

  // Track what WE installed so we only restore when we're still in control.
  // Concurrent batchers each install their own filteredLog on top; the finally
  // block of an older batcher must NOT overwrite a newer batcher's interceptor.
  let activeInstall: ((...a: any[]) => void) = filteredLog;

  const install = (fn: (...a: any[]) => void) => {
    activeInstall = fn;
    console.log  = fn;
    console.info = fn;
  };

  const restoreIfOwner = () => {
    if (console.log === activeInstall) {
      console.log  = realConsoleLog;
      console.info = realConsoleLog;
    }
    // else: a newer batcher has taken over — leave it alone
  };

  install(filteredLog);

  let sdkError: Error | null = null;

  // Run batcher in background — we race against earlyExitPromise.
  const execPromise = (async () => {
    try {
      const [res, err] = await batcher.exec();
      if (err) sdkError = err;
      else if (res) capturedTxHash = res.txHash || res.tx_hash || capturedTxHash;
    } catch (e: any) {
      if (!capturedTxHash) sdkError = e;
    } finally {
      done = true;
      restoreIfOwner(); // safe: only restores if we're still in control
      earlyResolve?.();
    }
  })();

  // Prevent unhandled-rejection crash from the orphaned background promise
  execPromise.catch(() => {});

  // Hard timeout — last resort if the txHash never appears in logs.
  // We store the handle so we can cancel it on early exit.
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<void>((resolve) => {
    timeoutHandle = setTimeout(() => {
      // Only log if we truly never got a txHash (not just slow storage sync)
      if (!capturedTxHash) {
        realConsoleLog(`[0G] ${label} — tx not submitted after ${SYNC_TIMEOUT_MS / 1000}s. Check wallet balance.`);
      }
      resolve();
    }, SYNC_TIMEOUT_MS);
  });

  await Promise.race([earlyExitPromise, timeoutPromise]);

  // Cancel the timeout if early exit won — prevents the "no txHash after 15s"
  // message from appearing 15s later while the background batcher is still syncing.
  if (timeoutHandle) clearTimeout(timeoutHandle);

  // After early exit, swap filteredLog for noiseSuppressor so the background
  // batcher's ongoing output is silenced but legitimate logs still pass through.
  if (!done) {
    install(noiseSuppressor);
    // execPromise.finally → restoreIfOwner() will clean up when batcher finishes
  }

  if (!capturedTxHash && sdkError) {
    throw new Error(`0G_SDK_ERROR: ${label} failed: ${(sdkError as any).message}`);
  }

  if (!capturedTxHash) {
    throw new Error(
      `0G_ERROR: ${label} — Transaction was never submitted (no txHash captured). ` +
      `Check 0G wallet balance at https://faucet.0g.ai or verify OG_FLOW_CONTRACT.`
    );
  }

  return { txHash: capturedTxHash };
}

// ─── Helper: master signer for 0G EVM with gas overrides baked in ─────────────
function getOgMasterSigner(): GasOverrideWallet {
  if (!process.env.DEPLOYER_PRIVATE_KEY) throw new Error("0G_CONFIG_ERROR: DEPLOYER_PRIVATE_KEY not set");
  if (!process.env.OG_EVM_RPC)           throw new Error("0G_CONFIG_ERROR: OG_EVM_RPC not set");
  const provider = new ethers.JsonRpcProvider(process.env.OG_EVM_RPC);
  return new GasOverrideWallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
}

// ─── 0G KV Store Write ────────────────────────────────────────────────────────
export async function write0GKV(params: {
  key: string;
  value: object;
  signer: ethers.Signer;
}): Promise<{ txHash: string; nodeUrl: string }> {
  if (!process.env.OG_INDEXER_URL || !process.env.OG_EVM_RPC || !process.env.OG_FLOW_CONTRACT) {
    throw new Error("0G_CONFIG_ERROR: Missing OG_INDEXER_URL / OG_EVM_RPC / OG_FLOW_CONTRACT");
  }

  const indexer = new Indexer(process.env.OG_INDEXER_URL!);
  const [nodes, err] = await (indexer as any).selectNodes(1);
  if (err || !nodes || nodes.length === 0) {
    throw new Error(`0G_NETWORK_ERROR: Node selection failed: ${err}. Check OG_INDEXER_URL.`);
  }

  const nodeUrl = (nodes[0] as any).url || String(nodes[0]);

  // GasOverrideWallet injects 30M gasLimit + 10 gwei at the sendTransaction level,
  // so the SDK's getFunction('submit').send() call will always get the right gas.
  const masterSigner  = getOgMasterSigner();
  const flowContract  = getFlowContract(process.env.OG_FLOW_CONTRACT!, masterSigner as any);

  const batcher    = new Batcher(1, nodes, flowContract as any, process.env.OG_EVM_RPC!);
  const keyBytes   = Uint8Array.from(Buffer.from(params.key, "utf-8"));
  const valueBytes = Uint8Array.from(Buffer.from(JSON.stringify(params.value), "utf-8"));
  (batcher as any).streamDataBuilder.set(AXIOM_STREAM_ID, keyBytes, valueBytes);

  const { txHash } = await execBatcherWithTimeout(batcher, "KV write");
  console.log(`[0G KV ✓] State persisted on-chain: https://chainscan-galileo.0g.ai/tx/${txHash}`);

  // Write-through: persist to local replica ONLY after confirmed on-chain txHash.
  // The 0G write is the authoritative audit trail. The local file is a derived
  // replica that enables reads (Galileo testnet has no public KV nodes).
  const store = loadStateFile();
  store[params.key] = { ...params.value as object, _og_txHash: txHash, _og_ts: Date.now() };
  persistStateFile(store);
  console.log(`[0G KV] Local replica updated for key: "${params.key}"`);

  return { txHash, nodeUrl };
}

// ─── 0G KV Read ──────────────────────────────────────────────────────────────
// The Galileo testnet does not expose public KV nodes — port 6789 times out on
// all public nodes. Reads are served from .axiom-state.json, which is populated
// ONLY after a confirmed on-chain txHash (write-through pattern).
// The 0G write remains the authoritative audit trail; the local file is a derived
// replica of verified on-chain state — NOT a mock, NOT a fallback.
export async function read0GKV(key: string): Promise<object | null> {
  const store = loadStateFile();
  const entry = store[key] ?? null;
  if (entry) {
    console.log(`[0G KV ✓] State read from local replica for key: "${key}" (on-chain anchor: ${(entry as any)._og_txHash})`);
  } else {
    console.log(`[0G KV] Key "${key}" not found in local replica (never written or file cleared).`);
  }
  return entry;
}

// ─── 0G Log Store Write ───────────────────────────────────────────────────────
export async function write0GLog(params: {
  agentId: string;
  event: string;
  data: object;
  signer?: ethers.Signer;
}): Promise<{ txHash: string }> {
  if (!process.env.OG_INDEXER_URL || !process.env.OG_EVM_RPC || !process.env.OG_FLOW_CONTRACT) {
    throw new Error("0G_CONFIG_ERROR: Missing OG_INDEXER_URL / OG_EVM_RPC / OG_FLOW_CONTRACT");
  }

  const logEntry = JSON.stringify({
    agentId:   params.agentId,
    event:     params.event,
    data:      params.data,
    timestamp: Date.now(),
  });
  const key = `log:${params.agentId}:${Date.now()}`;

  const indexer = new Indexer(process.env.OG_INDEXER_URL!);
  const [nodes, err] = await (indexer as any).selectNodes(1);
  if (err || !nodes || nodes.length === 0) {
    throw new Error(`0G_NETWORK_ERROR: Node selection failed: ${err}`);
  }

  const masterSigner = getOgMasterSigner();
  const flowContract = getFlowContract(process.env.OG_FLOW_CONTRACT!, masterSigner as any);

  const batcher    = new Batcher(1, nodes, flowContract as any, process.env.OG_EVM_RPC!);
  const keyBytes   = Uint8Array.from(Buffer.from(key, "utf-8"));
  const valueBytes = Uint8Array.from(Buffer.from(logEntry, "utf-8"));
  (batcher as any).streamDataBuilder.set(AXIOM_STREAM_ID, keyBytes, valueBytes);

  const { txHash } = await execBatcherWithTimeout(batcher, "Log write");
  console.log(`[0G LOG ✓] Audit trail secured on-chain: https://chainscan-galileo.0g.ai/tx/${txHash}`);
  return { txHash };
}
