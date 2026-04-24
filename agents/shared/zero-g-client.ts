// Real 0G Storage SDK integration
// Docs: https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk

import { Indexer, KvClient, Batcher } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";

// ─── 0G KV Store — real-time agent state ─────────────────────────────────────

const AXIOM_STREAM_ID = process.env.OG_STREAM_ID!; // MISSING_VALUE if not set

export async function write0GKV(params: {
  key: string;
  value: object;
  signer: ethers.Signer;
}): Promise<{ txHash: string }> {
  if (!process.env.OG_KV_URL) throw new Error("MISSING_VALUE: OG_KV_URL");
  if (!process.env.OG_STREAM_ID) throw new Error("MISSING_VALUE: OG_STREAM_ID");

  const indexer = new Indexer(process.env.OG_INDEXER_URL!);
  const [nodes, err] = await (indexer as any).selectNodes(1);
  if (err) throw new Error(`0G node selection failed: ${err}`);

  const flowContract = new ethers.Contract(
    process.env.OG_FLOW_CONTRACT!, // from 0G docs / testnet deployments
    ["function batchSubmit(bytes32 streamId, bytes[] keys, bytes[] values) external"],
    params.signer
  );

  const batcher = new Batcher(1, nodes, flowContract, process.env.OG_EVM_RPC!);
  const keyBytes = Uint8Array.from(Buffer.from(params.key, "utf-8"));
  const valueBytes = Uint8Array.from(
    Buffer.from(JSON.stringify(params.value), "utf-8")
  );

  (batcher as any).streamDataBuilder.set(AXIOM_STREAM_ID, keyBytes, valueBytes);
  const [tx, batchErr] = await (batcher as any).exec();
  if (batchErr) throw new Error(`0G KV write failed: ${batchErr}`);

  return { txHash: tx.hash };
}

export async function read0GKV(key: string): Promise<object | null> {
  if (!process.env.OG_KV_URL) throw new Error("MISSING_VALUE: OG_KV_URL");

  const kvClient = new KvClient(process.env.OG_KV_URL);
  const keyBytes = Uint8Array.from(Buffer.from(key, "utf-8"));
  const value = await (kvClient as any).getValue(
    AXIOM_STREAM_ID,
    ethers.encodeBase64(keyBytes)
  );

  if (!value) return null;
  return JSON.parse(Buffer.from(value, "base64").toString("utf-8"));
}

// ─── 0G Log Store — agent decision history (append-only) ─────────────────────

export async function write0GLog(params: {
  agentId: string;
  event: string;
  data: object;
  signer?: ethers.Signer;
}): Promise<{ txHash: string }> {
  if (!process.env.OG_INDEXER_URL) throw new Error("MISSING_VALUE: OG_INDEXER_URL");
  if (!process.env.OG_EVM_RPC) throw new Error("MISSING_VALUE: OG_EVM_RPC");

  const logEntry = JSON.stringify({
    agentId: params.agentId,
    event: params.event,
    data: params.data,
    timestamp: Date.now(),
  });

  const indexer = new Indexer(process.env.OG_INDEXER_URL);

  // Use the Blob upload path for log entries (append-only, verifiable)
  const { Blob: ZgBlob } = await import("@0gfoundation/0g-ts-sdk");
  const blob = new ZgBlob(Buffer.from(logEntry, "utf-8"));
  const [merkleTree, treeErr] = await (blob as any).merkleTree();
  if (treeErr) throw new Error(`0G merkle tree failed: ${treeErr}`);

  const signer =
    params.signer ??
    new ethers.Wallet(process.env.OG_PRIVATE_KEY!, new ethers.JsonRpcProvider(process.env.OG_EVM_RPC));

  const [tx, uploadErr] = await (indexer as any).upload(blob, process.env.OG_EVM_RPC, signer);
  if (uploadErr) throw new Error(`0G log upload failed: ${uploadErr}`);

  return { txHash: tx.hash };
}

export async function read0GLog(params: {
  agentId?: string;
  limit?: number;
}): Promise<any[]> {
  if (!process.env.OG_INDEXER_URL) throw new Error("MISSING_VALUE: OG_INDEXER_URL");

  const res = await fetch(`${process.env.OG_INDEXER_URL}/api/v1/blobs?limit=${params.limit || 10}`);
  if (!res.ok) return [];
  const blobs = await res.json() as any;
  
  return (blobs.data || []).map((b: any) => ({
    ...JSON.parse(Buffer.from(b.data, 'base64').toString('utf-8')),
    txHash: b.txHash
  }));
}
