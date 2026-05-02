/**
 * Telegram bot process entry point.
 * Dev:  uses long polling (bot.start())
 * Prod: registers real webhook at TELEGRAM_WEBHOOK_URL, then exits
 *       (updates are delivered by the Next.js /api/telegram/webhook route)
 */

import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import { bot } from './bot'

async function main() {
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL

  if (process.env.NODE_ENV === 'production' && webhookUrl) {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (!secret) throw new Error('MISSING_VALUE: TELEGRAM_WEBHOOK_SECRET required in production')

    console.log(`[TelegramBot] Production mode. Registering webhook: ${webhookUrl}`)
    await bot.api.setWebhook(webhookUrl, {
      secret_token: secret,
      allowed_updates: ['message', 'callback_query'],
    })
    console.log('[TelegramBot] Webhook registered. Updates will be handled by /api/telegram/webhook.')
  } else {
    console.log('[TelegramBot] Development mode. Starting long polling…')
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
