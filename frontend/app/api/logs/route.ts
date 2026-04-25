import { NextResponse } from 'next/server'
import { Indexer } from "@0gfoundation/0g-ts-sdk";

export async function GET() {
  const indexerUrl = process.env.OG_INDEXER_URL
  if (!indexerUrl) return NextResponse.json({ error: '0G Indexer URL missing in .env' }, { status: 500 })

  try {
    const indexer = new Indexer(indexerUrl);
    // Fetching the list of blobs from the indexer
    // We'll use a direct fetch to the JSON-RPC endpoint if the SDK doesn't expose a simple listBlobs
    const res = await fetch(indexerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'indexer_getBlobs',
        params: [0, 20], // offset, limit
        id: 1
      })
    });

    if (!res.ok) throw new Error(`Indexer RPC returned ${res.status}`);
    const json = await res.json();
    const blobs = json.result?.blobs || [];
    
    const logs = blobs.map((b: any) => {
      try {
        // 0G blobs are hex encoded in the RPC response
        const data = Buffer.from(b.data.replace('0x', ''), 'hex').toString('utf-8');
        return {
          ...JSON.parse(data),
          txHash: b.txHash
        }
      } catch (e) { return null }
    }).filter(Boolean);

    return NextResponse.json(logs)
  } catch (err: any) {
    console.error(`[API/Logs] Real SDK Call Failed:`, err)
    return NextResponse.json({ error: `0G fetch failed: ${err.message}` }, { status: 500 })
  }
}
