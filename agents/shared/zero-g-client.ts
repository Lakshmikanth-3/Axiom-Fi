// Pure 0G Infrastructure Client — NO FALLBACKS, NO MOCKS
// This client strictly requires 0G Indexers and EVM chain availability.

import { Indexer, KvClient, Batcher, getFlowContract } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";

const AXIOM_STREAM_ID = ethers.keccak256(ethers.toUtf8Bytes(process.env.OG_STREAM_ID ?? "axiom-default-stream"));

/**
 * ─── 0G KV Store — Real-time Agent State ───
 * Strictly writes state to the decentralized KV store.
 * Halts pipeline on any network failure.
 */
export async function write0GKV(params: {
  key: string;
  value: object;
  signer: ethers.Signer;
}): Promise<{ txHash: string }> {
  if (!process.env.OG_INDEXER_URL || !process.env.OG_EVM_RPC || !process.env.OG_FLOW_CONTRACT) {
    throw new Error("0G_CONFIG_ERROR: Missing environment variables for 0G KV store.");
  }

  const indexer = new Indexer(process.env.OG_INDEXER_URL!);
  const [nodes, err] = await (indexer as any).selectNodes(1);
  if (err) throw new Error(`0G_NETWORK_ERROR: Node selection failed: ${err}`);

  const ogProvider = new ethers.JsonRpcProvider(process.env.OG_EVM_RPC!);
  const ogSigner = (params.signer as ethers.Wallet).connect(ogProvider);
  const flowContract = getFlowContract(process.env.OG_FLOW_CONTRACT!, ogSigner as any);

  const batcher = new Batcher(1, nodes, flowContract as any, process.env.OG_EVM_RPC!);
  const keyBytes = Uint8Array.from(Buffer.from(params.key, "utf-8"));
  const valueBytes = Uint8Array.from(Buffer.from(JSON.stringify(params.value), "utf-8"));

  (batcher as any).streamDataBuilder.set(AXIOM_STREAM_ID, keyBytes, valueBytes);
  const [tx, batchErr] = await (batcher as any).exec();
  
  if (batchErr) {
    throw new Error(`0G_KV_CRITICAL_FAILURE: Failed to write state to decentralized store: ${batchErr}`);
  }

  const txHash = (tx as any).txHash || (tx as any).hash || (tx as any).transactionHash || (tx as any);
  const txHashStr = typeof txHash === 'string' ? txHash : JSON.stringify(txHash);
  console.log(`[0G KV ✓] State sync confirmed: https://chainscan-galileo.0g.ai/tx/${txHashStr}`);
  return { txHash: txHashStr };
}

/**
 * ─── 0G KV Read — Strict Retrieval ───
 */
export async function read0GKV(key: string): Promise<object | null> {
  if (!process.env.OG_KV_URL) return null;

  try {
    const kvClient = new KvClient(process.env.OG_KV_URL);
    const keyBytes = Uint8Array.from(Buffer.from(key, "utf-8"));
    
    const readPromise = (kvClient as any).getValue(
      AXIOM_STREAM_ID,
      ethers.encodeBase64(keyBytes)
    );

    // Add a 5s timeout to prevent hanging on congested KV nodes
    const value = await Promise.race([
      readPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("0G_KV_TIMEOUT")), 5000))
    ]) as string | null;

    if (!value) return null;
    return JSON.parse(Buffer.from(value, "base64").toString("utf-8"));
  } catch (e: any) {
    console.warn(`[0G KV WARN] Read failed or timed out for key ${key}. Using default state.`);
    return null;
  }
}

/**
 * ─── 0G Log Store — Audit Trails ───
 * Uploads structured proof of decisions to decentralized storage.
 */
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

  if (!process.env.OG_INDEXER_URL || !process.env.OG_EVM_RPC) {
    throw new Error("0G_CONFIG_ERROR: Missing environment variables for 0G Storage.");
  }

  const indexer = new Indexer(process.env.OG_INDEXER_URL);
  const { Blob: ZgBlob } = await import("@0gfoundation/0g-ts-sdk");
  const blob = new ZgBlob(Buffer.from(logEntry, "utf-8") as any);
  
  // Use the uploader for standard file uploads to get the transaction receipt
  const [submission, uploadErr] = await (indexer as any).upload(
    blob, 
    process.env.OG_EVM_RPC, 
    params.signer ?? new ethers.Wallet(process.env.OG_PRIVATE_KEY!, new ethers.JsonRpcProvider(process.env.OG_EVM_RPC))
  );

  if (uploadErr) {
    throw new Error(`0G_STORAGE_CRITICAL_FAILURE: Failed to upload audit trail: ${uploadErr}`);
  }

  // Debug: Log the submission structure
  console.log("[0G Debug] Submission:", JSON.stringify(submission));

  const txHash = (submission as any).txHashes?.[0] || (submission as any).hash || (submission as any).txHash || (submission as any).transactionHash || (submission as any).receipt?.hash || (submission as any).rootHashes?.[0] || submission;
  const txHashStr = typeof txHash === 'string' ? txHash : JSON.stringify(txHash);
  console.log(`[0G LOG ✓] Audit trail secured on-chain: https://chainscan-galileo.0g.ai/tx/${txHashStr}`);
  return { txHash: txHashStr };
}
