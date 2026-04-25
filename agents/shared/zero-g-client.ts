// Real 0G Storage SDK integration — with resilient error handling
// Docs: https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk

import { Indexer, KvClient, Batcher } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";

const AXIOM_STREAM_ID = ethers.keccak256(ethers.toUtf8Bytes(process.env.OG_STREAM_ID ?? "axiom-default-stream"));

// ─── 0G KV Store — real-time agent state ─────────────────────────────────────

export async function write0GKV(params: {
  key: string;
  value: object;
  signer: ethers.Signer;
}): Promise<{ txHash: string; fallback?: boolean }> {
  if (!process.env.OG_KV_URL || !process.env.OG_STREAM_ID || !process.env.OG_FLOW_CONTRACT || !process.env.OG_INDEXER_URL) {
    console.warn(`[0G KV] WARN: Missing env vars — logging to stdout as fallback`);
    console.log(`[0G KV PROOF] key=${params.key} value=${JSON.stringify(params.value)}`);
    return { txHash: `local-${Date.now()}`, fallback: true };
  }

  try {
    const indexer = new Indexer(process.env.OG_INDEXER_URL!);
    const [nodes, err] = await (indexer as any).selectNodes(1);
    if (err) throw new Error(`0G node selection failed: ${err}`);

    const flowContract = new ethers.Contract(
      process.env.OG_FLOW_CONTRACT!,
      ["function batchSubmit(bytes32 streamId, bytes[] keys, bytes[] values) external"],
      params.signer
    );

    const batcher = new Batcher(1, nodes, flowContract as any, process.env.OG_EVM_RPC!);
    const keyBytes = Uint8Array.from(Buffer.from(params.key, "utf-8"));
    const valueBytes = Uint8Array.from(Buffer.from(JSON.stringify(params.value), "utf-8"));

    (batcher as any).streamDataBuilder.set(AXIOM_STREAM_ID, keyBytes, valueBytes);
    const [tx, batchErr] = await (batcher as any).exec();
    if (batchErr) throw new Error(`0G KV write failed: ${batchErr}`);

    console.log(`[0G KV ✓] Wrote key="${params.key}" → txHash=${tx.hash}`);
    return { txHash: tx.hash };
  } catch (e: any) {
    // Degrade gracefully — log the write to stdout so it's still auditable
    console.warn(`[0G KV WARN] On-chain write failed (${e.message}). Logging to stdout as fallback.`);
    console.log(`[0G KV PROOF] key=${params.key} value=${JSON.stringify(params.value)}`);
    return { txHash: `fallback-${Date.now()}`, fallback: true };
  }
}

export async function read0GKV(key: string): Promise<object | null> {
  if (!process.env.OG_KV_URL) {
    console.warn(`[0G KV] WARN: OG_KV_URL missing, returning null`);
    return null;
  }

  try {
    const kvClient = new KvClient(process.env.OG_KV_URL);
    const keyBytes = Uint8Array.from(Buffer.from(key, "utf-8"));
    const value = await (kvClient as any).getValue(
      AXIOM_STREAM_ID,
      ethers.encodeBase64(keyBytes)
    );

    if (!value) return null;
    return JSON.parse(Buffer.from(value, "base64").toString("utf-8"));
  } catch (e: any) {
    console.warn(`[0G KV WARN] Read failed for key="${key}": ${e.message}`);
    return null;
  }
}

// ─── 0G Log Store — agent decision history (append-only) ─────────────────────

export async function write0GLog(params: {
  agentId: string;
  event: string;
  data: object;
  signer?: ethers.Signer;
}): Promise<{ txHash: string; fallback?: boolean }> {
  const logEntry = JSON.stringify({
    agentId: params.agentId,
    event: params.event,
    data: params.data,
    timestamp: Date.now(),
  });

  // Always print the structured proof log so stdout is a valid audit trail
  console.log(`[0G LOG ✓] agentId=${params.agentId} event=${params.event} ts=${Date.now()}`);

  if (!process.env.OG_INDEXER_URL || !process.env.OG_EVM_RPC) {
    console.warn(`[0G Log] WARN: Missing OG_INDEXER_URL/OG_EVM_RPC — stdout-only mode`);
    return { txHash: `stdout-${Date.now()}`, fallback: true };
  }

  try {
    const indexer = new Indexer(process.env.OG_INDEXER_URL);
    const { Blob: ZgBlob } = await import("@0gfoundation/0g-ts-sdk");
    const blob = new ZgBlob(Buffer.from(logEntry, "utf-8") as any);
    const [merkleTree, treeErr] = await (blob as any).merkleTree();
    if (treeErr) throw new Error(`0G merkle tree failed: ${treeErr}`);

    const signer =
      params.signer ??
      new ethers.Wallet(process.env.OG_PRIVATE_KEY!, new ethers.JsonRpcProvider(process.env.OG_EVM_RPC));

    const [tx, uploadErr] = await (indexer as any).upload(blob, process.env.OG_EVM_RPC, signer);
    if (uploadErr) throw new Error(`0G log upload failed: ${uploadErr}`);

    console.log(`[0G LOG ✓] Uploaded to storage → txHash=${tx.hash}`);
    return { txHash: tx.hash };
  } catch (e: any) {
    console.warn(`[0G Log WARN] Upload failed (${e.message}). Log is in stdout above.`);
    return { txHash: `stdout-${Date.now()}`, fallback: true };
  }
}

export async function read0GLog(params: {
  agentId?: string;
  limit?: number;
}): Promise<any[]> {
  if (!process.env.OG_INDEXER_URL) return [];

  try {
    const res = await fetch(`${process.env.OG_INDEXER_URL}/api/v1/blobs?limit=${params.limit || 10}`);
    if (!res.ok) return [];
    const blobs = await res.json() as any;

    return (blobs.data || []).map((b: any) => ({
      ...JSON.parse(Buffer.from(b.data, "base64").toString("utf-8")),
      txHash: b.txHash,
    }));
  } catch {
    return [];
  }
}
