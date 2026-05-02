import { NextRequest } from 'next/server'
import { main as runOrchestrator } from '@/agents/orchestrator/index'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { strategy } = await req.json()

  if (!strategy || strategy.trim().length < 5) {
    return new Response(JSON.stringify({ error: 'Strategy too short' }), { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      send({ type: 'status', message: '⚙ Starting Axiom-Fi agent pipeline…' })

      try {
        await runOrchestrator(strategy, (line) => {
          const tag =
            line.includes('Research') ? 'research' :
            line.includes('Risk') || line.includes('risk') ? 'risk-guard' :
            line.includes('Executor') || line.includes('executor') ? 'executor' :
            line.includes('x402') || line.includes('Paying') ? 'payment' :
            line.includes('Attestation') || line.includes('Tx:') ? 'attestation' :
            'orchestrator'

          // ── CRITICAL: only extract hashes for their correct explorer ──────
          // BaseScan tx: ONLY from lines that explicitly say sepolia.basescan.org
          const baseScanMatch = line.match(/sepolia\.basescan\.org\/tx\/(0x[a-fA-F0-9]{64})/)
          const txHash = baseScanMatch?.[1]  // undefined for all other log lines

          // 0G chain tx: ONLY from chainscan-galileo.0g.ai URLs
          const ogMatch = line.match(/chainscan-galileo\.0g\.ai\/tx\/(0x[a-fA-F0-9]{64})/)
          const ogTxHash = ogMatch?.[1]

          // KeeperHub workflow ID
          const khMatch = line.match(/keeperhub\.com\/hub\/workflows\/([a-zA-Z0-9_-]+)/)
          const keeperHubId = khMatch?.[1]

          send({
            type: 'log',
            tag,
            message: line,
            // These are undefined for most log lines — only set when the line
            // contains the explicit explorer URL for that specific tx type
            txHash,
            ogTxHash,
            keeperHubId,
          })
        })

        send({ type: 'done', success: true, message: '✅ Pipeline complete. Audit trail written to 0G Storage.' })
      } catch (err: any) {
        console.error('[Stream] Orchestrator failed:', err)
        send({ type: 'error', message: `Orchestrator failed: ${err.message}` })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
