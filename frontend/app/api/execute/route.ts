import { NextRequest, NextResponse } from 'next/server'
import { main as runOrchestrator } from '@/agents/orchestrator/index'

export async function POST(req: NextRequest) {
  const { strategy } = await req.json()

  if (!strategy || strategy.trim().length < 5) {
    return NextResponse.json({ error: 'Strategy too short' }, { status: 400 })
  }

  try {
    const logs: string[] = []
    
    // Call orchestrator directly
    await runOrchestrator(strategy, (msg) => {
      logs.push(msg)
    })

    return NextResponse.json({ 
      success: true, 
      logs,
      message: 'Orchestrator completed successfully' 
    })
  } catch (err: any) {
    console.error('[Execute] Orchestrator failed:', err)
    return NextResponse.json({ 
      success: false, 
      error: `Orchestrator failed: ${err.message}` 
    }, { status: 500 })
  }
}
