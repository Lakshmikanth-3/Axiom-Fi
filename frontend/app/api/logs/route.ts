import { NextResponse } from 'next/server'
// We'll import the logic from the agents shared folder
// Next.js can import from outside app/ if paths are handled, 
// but we'll use a direct fetch to the indexer to keep it simple and robust
export async function GET() {
  const indexerUrl = process.env.OG_INDEXER_URL
  if (!indexerUrl) return NextResponse.json({ error: 'Config not set' }, { status: 500 })

  try {
    const res = await fetch(`${indexerUrl}/api/v1/blobs?limit=20`)
    if (!res.ok) return NextResponse.json([])
    const blobs = await res.json() as any
    
    const logs = (blobs.data || []).map((b: any) => {
      try {
        return {
          ...JSON.parse(Buffer.from(b.data, 'base64').toString('utf-8')),
          txHash: b.txHash
        }
      } catch (e) { return null }
    }).filter(Boolean)

    return NextResponse.json(logs)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
