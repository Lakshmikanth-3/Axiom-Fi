import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(req: Request) {
  const { strategy } = await req.json()
  
  if (!strategy) {
    return NextResponse.json({ error: 'Strategy required' }, { status: 400 })
  }

  // Spawn the orchestrator process
  const agentDir = path.resolve(process.cwd(), '../agents')
  const scriptPath = path.join(agentDir, 'orchestrator/index.ts')
  
  console.log(`[API] Spawning orchestrator for strategy: ${strategy}`)
  
  const child = spawn('npx', ['ts-node', scriptPath, strategy], {
    cwd: agentDir,
    env: { ...process.env },
    detached: true,
    stdio: 'ignore'
  })
  
  child.unref()

  return NextResponse.json({ success: true, message: 'Orchestrator started' })
}
