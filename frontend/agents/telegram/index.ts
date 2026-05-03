/**
 * Telegram bot process entry point.
 * Dev:  uses long polling (bot.start())
 * Prod: registers real webhook at TELEGRAM_WEBHOOK_URL, then exits
 *       (updates are delivered by the Next.js /api/telegram/webhook route)
 */

import { bot } from './bot'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables for local execution (ts-node)
if (!process.env.TELEGRAM_BOT_TOKEN) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') })
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
}

// ── Global crash guards ──────────────────────────────────────────────────────
// The 0G SDK runs background storage-sync promises after we've already captured
// the txHash and moved on. If those background tasks reject (e.g. storage node
// timeout), Node would kill the process without these guards.
process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message ?? String(reason)
  // Only log unexpected errors — suppress known 0G storage sync noise
  if (!msg.includes('storage node') && !msg.includes('0G_KV_TIMEOUT')) {
    console.error('[TelegramBot] Unhandled rejection (non-fatal):', msg)
  }
})

process.on('uncaughtException', (err: Error) => {
  console.error('[TelegramBot] Uncaught exception (non-fatal):', err.message)
  // Do NOT call process.exit() — keep the bot alive
})

async function main() {
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL
  const forcePolling = process.env.TELEGRAM_FORCE_POLLING === 'true'

  if (!forcePolling && process.env.NODE_ENV === 'production' && webhookUrl) {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (!secret) throw new Error('MISSING_VALUE: TELEGRAM_WEBHOOK_SECRET required in production')

    console.log(`[TelegramBot] Production mode. Registering webhook: ${webhookUrl}`)
    await bot.api.setWebhook(webhookUrl, {
      secret_token: secret,
      allowed_updates: ['message', 'callback_query'],
    })
    console.log('[TelegramBot] Webhook registered. Updates will be handled by /api/telegram/webhook.')
  } else {
    console.log(`[TelegramBot] ${forcePolling ? 'Forced polling' : 'Development'} mode. Starting long polling…`)
    await bot.start({
      onStart(info) {
        console.log(`[TelegramBot] Running as @${info.username}`)
      },
      allowed_updates: ['message', 'callback_query'],
    })
  }
}

main().catch((err) => {
  console.error('[TelegramBot] Fatal startup error:', err)
  process.exit(1)
})

