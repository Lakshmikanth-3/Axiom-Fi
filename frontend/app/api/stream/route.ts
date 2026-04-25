import { NextRequest } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { strategy } = await req.json()

  if (!strategy || strategy.trim().length < 5) {
    return new Response(JSON.stringify({ error: 'Strategy too short' }), { status: 400 })
  }

  const agentsDir = path.resolve(process.cwd(), '..', 'agents')
  const orchestratorPath = path.join(agentsDir, 'orchestrator', 'index.ts')

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      send({ type: 'status', message: '⚙ Starting Axiom agent pipeline…' })

      const proc = spawn(
        'npx',
        ['ts-node', '--project', path.join(agentsDir, 'tsconfig.json'), orchestratorPath, strategy],
        {
          cwd: agentsDir,
          env: { ...process.env },
          shell: true,
        }
      )

      proc.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(l => l.trim())
        lines.forEach(line => {
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
      })

      proc.stderr.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(l => l.trim())
        lines.forEach(line => {
          // Only surface real errors, not ts-node compilation noise
          if (line.includes('Error') || line.includes('WARN')) {
            send({ type: 'error', message: line.trim() })
          }
        })
      })

      proc.on('close', (code: number | null) => {
        if (code === 0) {
          send({ type: 'done', success: true, message: '✅ Pipeline complete. Audit trail written to 0G Storage.' })
        } else {
          send({ type: 'done', success: false, message: `⚠ Pipeline exited with code ${code}` })
        }
        controller.close()
      })

      proc.on('error', (err: Error) => {
        send({ type: 'error', message: `Failed to start orchestrator: ${err.message}` })
        controller.close()
      })

      // 3 minute timeout
      setTimeout(() => {
        proc.kill()
        send({ type: 'done', success: false, message: '⚠ Pipeline timed out after 3 minutes' })
        controller.close()
      }, 180_000)
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
