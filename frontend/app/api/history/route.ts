import { NextResponse } from 'next/server'

// The frontend doesn't have direct 0G SDK access.
// History is served from the in-process session cache via the stream API,
// or returns an empty array gracefully when no history exists yet.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') ?? 'global'

  try {
    // Attempt to read from the 0G KV via the agent's RPC endpoint
    // If the agent is not running, return empty gracefully
    const agentUrl = process.env.AGENT_API_URL ?? 'http://localhost:3001'
    const res = await fetch(`${agentUrl}/history?userId=${userId}`, {
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) throw new Error(`Agent API ${res.status}`)
    const data = await res.json()
    return NextResponse.json({ trades: data?.trades ?? [] })
  } catch {
    // No agent running or no history yet — return empty array gracefully
    return NextResponse.json({ trades: [] })
  }
}
