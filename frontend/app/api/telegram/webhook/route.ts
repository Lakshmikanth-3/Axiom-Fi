import { NextRequest, NextResponse } from 'next/server'
import { bot } from '@/agents/telegram/bot'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Verify Telegram's secret token header before processing any update
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret) {
    console.error('[Webhook] MISSING_VALUE: TELEGRAM_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const incoming = req.headers.get('x-telegram-bot-api-secret-token')
  if (!incoming || incoming !== secret) {
    console.warn('[Webhook] Rejected request with invalid or missing secret token')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let update: any
  try {
    update = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    await bot.handleUpdate(update)
  } catch (err: any) {
    console.error('[Webhook] bot.handleUpdate threw:', err)
    // Return 200 so Telegram doesn't retry — we already logged the error
  }

  return NextResponse.json({ ok: true })
}
