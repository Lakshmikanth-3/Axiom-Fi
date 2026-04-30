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
            line.includes('Attestation') || line.includes('txHash') || line.includes('Tx:') ? 'attestation' :
            'orchestrator'

          const txMatch = line.match(/0x[a-fA-F0-9]{64}/)

          send({
            type: 'log',
            tag,
            message: line.replace(/\[.*?\]\s*/, '').trim(),
            txHash: txMatch?.[0],
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
