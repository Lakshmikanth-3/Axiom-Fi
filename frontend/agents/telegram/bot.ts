/**
 * Axiom-Fi Telegram Bot
 * Uses grammy for TypeScript-first bot development.
 * Commands: /start /wallet /trade /agents /reputation /history /balance /verify
 *
 * Rate limiter state is in-process (resets on restart by design — documented).
 * All on-chain reads use live Base Sepolia RPC. All pipeline calls use the real orchestrator.
 */

import { Bot, InlineKeyboard, Context } from 'grammy'
import { ethers } from 'ethers'
import { main as runOrchestrator } from '../orchestrator/index'
import { write0GKV, read0GKV } from '../shared/zero-g-client'

// ── Environment ────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
if (!BOT_TOKEN) throw new Error('MISSING_VALUE: TELEGRAM_BOT_TOKEN is not set')

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'https://axiom-fi.vercel.app'
const RPC_URL = process.env.RPC_URL
if (!RPC_URL) throw new Error('MISSING_VALUE: RPC_URL is not set')

const AGENT_REGISTRY_ADDRESS = process.env.AGENT_REGISTRY_ADDRESS
const REPUTATION_LEDGER_ADDRESS = process.env.REPUTATION_LEDGER_ADDRESS

// ── Contracts ──────────────────────────────────────────────────────────────────
const REGISTRY_ABI = [
  'function getAllAgentIds() external view returns (bytes32[] memory)',
  'function getAgent(bytes32 agentId) external view returns (tuple(address agentAddress, string name, string agentType, string[] specializations, address registeredBy, uint256 registeredAt, bool isActive))',
]
const LEDGER_ABI = [
  'function getReputation(bytes32 agentId) external view returns (tuple(uint256 totalDecisions, uint256 correctDecisions, uint256 accuracyBps, uint8 tier, uint256 lastUpdated))',
  'function getDecision(bytes32 decisionHash) external view returns (tuple(bytes32 agentId, bytes32 decisionHash, uint8 confidence, int8 predictedDirection, uint256 timestamp, bool outcomeRecorded, bool wasCorrect, int256 pnlDeltaBps))',
]
const ERC20_ABI = [
  'function balanceOf(address) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
]

const TIER_NAMES: Record<number, string> = { 0: 'Unranked', 1: '🥉 Bronze', 2: '🥈 Silver', 3: '🥇 Gold', 4: '⚡ Axiom' }

function getProvider() { return new ethers.JsonRpcProvider(RPC_URL!) }

function getReputation(agentIdHash: string) {
  if (!REPUTATION_LEDGER_ADDRESS) throw new Error('MISSING_VALUE: REPUTATION_LEDGER_ADDRESS')
  const ledger = new ethers.Contract(REPUTATION_LEDGER_ADDRESS, LEDGER_ABI, getProvider())
  return ledger.getReputation(agentIdHash)
}

// ── Rate limiter ───────────────────────────────────────────────────────────────
// In-process state: acceptable because /trade rate limits only need to persist
// for 60 seconds, and a restart clears the window (conservative, not a security boundary).
const tradeTimestamps = new Map<number, number[]>()
const RATE_LIMIT_COUNT = 3
const RATE_WINDOW_MS = 60_000

function checkRateLimit(userId: number): boolean {
  const now = Date.now()
  const times = (tradeTimestamps.get(userId) ?? []).filter(t => now - t < RATE_WINDOW_MS)
  if (times.length >= RATE_LIMIT_COUNT) return false
  times.push(now)
  tradeTimestamps.set(userId, times)
  return true
}

// ── Bot instance ───────────────────────────────────────────────────────────────
export const bot = new Bot(BOT_TOKEN)

// ── Error middleware ───────────────────────────────────────────────────────────
bot.catch(async (err) => {
  const ctx = err.ctx as Context
  console.error('[TelegramBot] Unhandled error:', err.error)
  try {
    await ctx.reply(`❌ Error: ${(err.error as Error).message ?? 'Unknown error'}`)
  } catch { /* if reply itself fails, just log */ }
})

// ── /start ─────────────────────────────────────────────────────────────────────
bot.command('start', async (ctx) => {
  const userId = ctx.from?.id ?? 0
  await ctx.reply(
    `🤖 *Welcome to Axiom-Fi*\n\n` +
    `The autonomous on-chain DeFi trading terminal on Base Sepolia.\n\n` +
    `Your Telegram ID: \`${userId}\`\n\n` +
    `*Commands:*\n` +
    `/wallet <0x…> — register your wallet\n` +
    `/trade <strategy> — execute a trade via the full agent pipeline\n` +
    `/agents — list all registered agents with reputation\n` +
    `/reputation <agentId> — look up an agent's on-chain score\n` +
    `/balance — check your wallet ETH + USDC balances\n` +
    `/history — view your last 5 trades\n` +
    `/verify <txHash> — decode on-chain transaction\n\n` +
    `Start by registering your wallet: /wallet 0x…`,
    { parse_mode: 'Markdown' }
  )
})

// ── /chatid ────────────────────────────────────────────────────────────────────
// Prints the user's chat ID — needed to set TELEGRAM_TEST_CHAT_ID in .env
bot.command('chatid', async (ctx) => {
  const id = ctx.chat.id
  console.log(`\n[TelegramBot] Chat ID for .env: TELEGRAM_TEST_CHAT_ID=${id}\n`)
  await ctx.reply(
    `Your chat ID is: \`${id}\`\n\nAdd this to \`.env\`:\n\`TELEGRAM_TEST_CHAT_ID=${id}\``,
    { parse_mode: 'Markdown' }
  )
})

// ── /wallet ────────────────────────────────────────────────────────────────────
bot.command('wallet', async (ctx) => {
  const userId = ctx.from?.id
  if (!userId) return ctx.reply('Could not identify your Telegram user ID.')

  const parts = ctx.message?.text?.split(' ') ?? []
  const address = parts[1]

  if (!address || !ethers.isAddress(address)) {
    return ctx.reply('❌ Invalid address. Usage: /wallet 0xYourAddress')
  }

  await ctx.reply(`⏳ Registering wallet ${address} to 0G KV store…`)

  const provider = getProvider()
  const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider)

  await write0GKV({
    key: `telegram:wallet:${userId}`,
    value: { telegramId: userId, walletAddress: address, registeredAt: Date.now() },
    signer,
  })

  await ctx.reply(
    `✅ Wallet registered!\n\n` +
    `Address: \`${address}\`\n` +
    `[View on BaseScan](https://sepolia.basescan.org/address/${address})`,
    { parse_mode: 'Markdown' }
  )
})

// ── /trade ─────────────────────────────────────────────────────────────────────
bot.command('trade', async (ctx) => {
  const userId = ctx.from?.id
  if (!userId) return ctx.reply('Could not identify your Telegram user ID.')

  if (!checkRateLimit(userId)) {
    return ctx.reply(`⛔ Rate limit: max ${RATE_LIMIT_COUNT} trades per minute. Please wait.`)
  }

  const strategy = ctx.message?.text?.replace('/trade', '').trim()
  if (!strategy || strategy.length < 10) {
    return ctx.reply('❌ Strategy too short. Usage: /trade Buy 0.01 ETH of USDC if ETH drops 2%')
  }

  // Check registered wallet
  const walletEntry = await read0GKV(`telegram:wallet:${userId}`) as any
  if (!walletEntry?.walletAddress) {
    return ctx.reply('❌ No wallet registered. Use /wallet 0xYourAddress first.')
  }

  const statusMsg = await ctx.reply(`🚀 *Pipeline starting…*\n\nStrategy: _${strategy}_\n\n⏳ Research agent is running…`, { parse_mode: 'Markdown' })
  const msgId = statusMsg.message_id
  const chatId = ctx.chat.id

  let currentStatus = `⏳ *Research* running…\n`
  const phases: string[] = []
  let sessionId = `tg-${userId}-${Date.now()}`
  let finalTxHash = ''
  let keeperHubUrl = 'https://app.keeperhub.com'

  try {
    await runOrchestrator(strategy, async (line: string) => {
      const tag = line.includes('[Research') ? 'research'
        : line.includes('[Risk') ? 'risk'
          : line.includes('[Executor') ? 'executor'
            : line.includes('[Orchestrator') ? 'orchestrator'
              : ''

      const clean = line.replace(/\[.*?\]\s*/, '').trim()
      if (!clean) return

      // Capture txHash
      const txMatch = line.match(/0x[a-fA-F0-9]{64}/)
      if (txMatch) finalTxHash = txMatch[0]

      // Capture KeeperHub URL
      if (line.includes('https://app.keeperhub.com/workflows/')) {
        const urlMatch = line.match(/https:\/\/app\.keeperhub\.com\/workflows\/[a-zA-Z0-9-]+/)
        if (urlMatch) keeperHubUrl = urlMatch[0]
      }

      // Update live message on phase transitions
      if (tag === 'risk' && !phases.includes('risk')) {
        phases.push('risk')
        currentStatus = `✅ Research complete\n⏳ *Risk Guard* running…\n`
        await bot.api.editMessageText(chatId, msgId, `🤖 *Axiom-Fi Pipeline*\n\n${currentStatus}`, { parse_mode: 'Markdown' }).catch(() => { })
      } else if (tag === 'executor' && !phases.includes('executor')) {
        phases.push('executor')
        currentStatus = `✅ Research complete\n✅ Risk Guard approved\n⏳ *Executor* running…\n`
        await bot.api.editMessageText(chatId, msgId, `🤖 *Axiom-Fi Pipeline*\n\n${currentStatus}`, { parse_mode: 'Markdown' }).catch(() => { })
      }

      if (clean.includes('CONFIDENCE_TOO_LOW') || clean.includes('Trade ABORTED')) {
        await bot.api.editMessageText(chatId, msgId, `⚠️ *Pipeline Aborted*\n\nReason: ${clean}`, { parse_mode: 'Markdown' }).catch(() => { })
      }
      if (clean.includes('Trade REJECTED')) {
        await bot.api.editMessageText(chatId, msgId, `🚫 *Risk Guard Rejected*\n\n${clean}`, { parse_mode: 'Markdown' }).catch(() => { })
      }
    })

    // Fetch final reputation scores — read live from AgentRegistry (no hardcoded IDs)
    const repLines: string[] = []
    if (AGENT_REGISTRY_ADDRESS && REPUTATION_LEDGER_ADDRESS) {
      try {
        const registry = new ethers.Contract(AGENT_REGISTRY_ADDRESS, REGISTRY_ABI, getProvider())
        const allIds: string[] = await registry.getAllAgentIds()
        for (const agentId of allIds.slice(0, 5)) { // cap at 5 for message length
          try {
            const agent = await registry.getAgent(agentId)
            if (!agent.isActive) continue
            const rep = await getReputation(agentId)
            const acc = (Number(rep.accuracyBps) / 100).toFixed(1)
            repLines.push(`• ${agent.name} (${agent.agentType}): ${TIER_NAMES[Number(rep.tier)]} · ${acc}%`)
          } catch { /* skip individual agent errors */ }
        }
      } catch { /* non-critical — reputation section omitted if registry unreachable */ }
    }

    // Write trade history to 0G KV
    const provider = getProvider()
    const signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider)
    const history = (await read0GKV(`telegram:history:${userId}`) as any)?.trades ?? []
    history.unshift({ strategy, txHash: finalTxHash, outcome: 'executed', timestamp: Date.now(), sessionId })
    const trimmed = history.slice(0, 20) // keep last 20
    await write0GKV({ key: `telegram:history:${userId}`, value: { trades: trimmed }, signer }).catch(console.error)

    const keyboard = new InlineKeyboard()
      .url('📊 Full Analysis', `${FRONTEND_URL}/analysis?session=${sessionId}`)
      .url('✅ BaseScan', `https://sepolia.basescan.org/tx/${finalTxHash || ''}`)

    await bot.api.editMessageText(
      chatId, msgId,
      `✅ *Pipeline Complete!*\n\n` +
      `Strategy: _${strategy}_\n\n` +
      (finalTxHash ? `Tx: [${finalTxHash.slice(0, 10)}…](https://sepolia.basescan.org/tx/${finalTxHash})\n` : '') +
      `[KeeperHub Workflow](${keeperHubUrl})\n\n` +
      `*Agent Reputation:*\n${repLines.join('\n')}`,
      { parse_mode: 'Markdown', reply_markup: keyboard }
    ).catch(() => { })

  } catch (err: any) {
    console.error('[/trade]', err)
    await bot.api.editMessageText(chatId, msgId, `❌ *Pipeline Failed*\n\n${err.message}`, { parse_mode: 'Markdown' }).catch(() => { })
  }
})

// ── /agents ────────────────────────────────────────────────────────────────────
bot.command('agents', async (ctx) => {
  if (!AGENT_REGISTRY_ADDRESS) return ctx.reply('❌ MISSING_VALUE: AGENT_REGISTRY_ADDRESS')

  await ctx.reply('⏳ Querying AgentRegistry.sol on Base Sepolia…')

  const registry = new ethers.Contract(AGENT_REGISTRY_ADDRESS, REGISTRY_ABI, getProvider())
  const allIds: string[] = await registry.getAllAgentIds()

  if (allIds.length === 0) return ctx.reply('No agents registered yet.')

  const PAGE_SIZE = 10
  const page = 0
  const pageIds = allIds.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const lines: string[] = [`*Registered Agents* (${allIds.length} total)\n`]
  for (const id of pageIds) {
    try {
      const agent = await registry.getAgent(id)
      if (!agent.isActive) continue
      const rep = await getReputation(id)
      const tier = TIER_NAMES[Number(rep.tier)]
      const acc = (Number(rep.accuracyBps) / 100).toFixed(1)
      lines.push(`*${agent.name}*\nType: ${agent.agentType} · ${tier}\nAccuracy: ${acc}% · ${rep.totalDecisions} decisions\n`)
    } catch { /* skip bad agent */ }
  }

  const keyboard = allIds.length > PAGE_SIZE
    ? new InlineKeyboard().text('Next →', `agents:page:1`)
    : undefined

  await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown', reply_markup: keyboard })
})

// Pagination callback for /agents
bot.callbackQuery(/^agents:page:(\d+)$/, async (ctx) => {
  if (!AGENT_REGISTRY_ADDRESS) return ctx.answerCallbackQuery('Registry not configured')
  const page = parseInt(ctx.match[1])
  const registry = new ethers.Contract(AGENT_REGISTRY_ADDRESS, REGISTRY_ABI, getProvider())
  const allIds: string[] = await registry.getAllAgentIds()
  const PAGE_SIZE = 10
  const pageIds = allIds.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const lines: string[] = [`*Agents — Page ${page + 1}*\n`]
  for (const id of pageIds) {
    try {
      const agent = await registry.getAgent(id)
      if (!agent.isActive) continue
      const rep = await getReputation(id)
      const tier = TIER_NAMES[Number(rep.tier)]
      const acc = (Number(rep.accuracyBps) / 100).toFixed(1)
      lines.push(`*${agent.name}*\nType: ${agent.agentType} · ${tier}\nAccuracy: ${acc}% · ${rep.totalDecisions} decisions\n`)
    } catch { /* skip */ }
  }

  const keyboard = new InlineKeyboard()
  if (page > 0) keyboard.text('← Prev', `agents:page:${page - 1}`)
  if ((page + 1) * PAGE_SIZE < allIds.length) keyboard.text('Next →', `agents:page:${page + 1}`)

  await ctx.editMessageText(lines.join('\n'), { parse_mode: 'Markdown', reply_markup: keyboard })
  await ctx.answerCallbackQuery()
})

// ── /reputation ────────────────────────────────────────────────────────────────
bot.command('reputation', async (ctx) => {
  if (!REPUTATION_LEDGER_ADDRESS) return ctx.reply('❌ MISSING_VALUE: REPUTATION_LEDGER_ADDRESS')

  const rawId = ctx.message?.text?.replace('/reputation', '').trim()
  if (!rawId) return ctx.reply('Usage: /reputation <agentId>\nExample: /reputation research-001')

  const agentIdHash = ethers.id(rawId)
  const rep = await getReputation(agentIdHash)
  const tier = TIER_NAMES[Number(rep.tier)]
  const acc = (Number(rep.accuracyBps) / 100).toFixed(2)
  const lastUpdated = Number(rep.lastUpdated) > 0
    ? new Date(Number(rep.lastUpdated) * 1000).toUTCString()
    : 'Never'

  await ctx.reply(
    `🏆 *Reputation: ${rawId}*\n\n` +
    `Tier: ${tier}\n` +
    `Accuracy: ${acc}%\n` +
    `Total Decisions: ${rep.totalDecisions}\n` +
    `Correct Decisions: ${rep.correctDecisions}\n` +
    `Last Updated: ${lastUpdated}\n\n` +
    `[View ReputationLedger on BaseScan](https://sepolia.basescan.org/address/${REPUTATION_LEDGER_ADDRESS})`,
    { parse_mode: 'Markdown' }
  )
})

// ── /history ───────────────────────────────────────────────────────────────────
bot.command('history', async (ctx) => {
  const userId = ctx.from?.id
  if (!userId) return ctx.reply('Could not identify your Telegram user ID.')

  const stored = await read0GKV(`telegram:history:${userId}`) as any
  const trades: any[] = stored?.trades ?? []

  if (trades.length === 0) return ctx.reply('No trade history yet. Use /trade to execute your first trade.')

  const last5 = trades.slice(0, 5)
  const lines = last5.map((t: any, i: number) => {
    const date = new Date(t.timestamp).toUTCString()
    const txLine = t.txHash ? `[Tx ↗](https://sepolia.basescan.org/tx/${t.txHash})` : 'No tx (pipeline rejected)'
    return `*${i + 1}. ${t.outcome.toUpperCase()}* · ${date}\nStrategy: _${t.strategy}_\n${txLine}`
  })

  await ctx.reply(`📜 *Last ${last5.length} Trades*\n\n${lines.join('\n\n')}`, { parse_mode: 'Markdown' })
})

// ── /balance ───────────────────────────────────────────────────────────────────
bot.command('balance', async (ctx) => {
  const userId = ctx.from?.id
  if (!userId) return ctx.reply('Could not identify your Telegram user ID.')

  const walletEntry = await read0GKV(`telegram:wallet:${userId}`) as any
  if (!walletEntry?.walletAddress) return ctx.reply('❌ No wallet registered. Use /wallet 0xYourAddress first.')

  const address = walletEntry.walletAddress
  const provider = getProvider()
  const usdcAddress = process.env.USDC_CONTRACT_ADDRESS

  if (!usdcAddress) return ctx.reply('❌ MISSING_VALUE: USDC_CONTRACT_ADDRESS')

  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, provider)
  const [ethWei, usdcRaw, decimals] = await Promise.all([
    provider.getBalance(address),
    usdc.balanceOf(address),
    usdc.decimals(),
  ])

  await ctx.reply(
    `💰 *Wallet Balances*\n\n` +
    `Address: \`${address}\`\n\n` +
    `ETH: \`${parseFloat(ethers.formatEther(ethWei)).toFixed(4)}\`\n` +
    `USDC: \`${parseFloat(ethers.formatUnits(usdcRaw, decimals)).toFixed(4)}\`\n\n` +
    `[View on BaseScan](https://sepolia.basescan.org/address/${address})`,
    { parse_mode: 'Markdown' }
  )
})

// ── /verify ────────────────────────────────────────────────────────────────────
bot.command('verify', async (ctx) => {
  if (!REPUTATION_LEDGER_ADDRESS) return ctx.reply('❌ MISSING_VALUE: REPUTATION_LEDGER_ADDRESS')

  const txHash = ctx.message?.text?.replace('/verify', '').trim()
  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return ctx.reply('Usage: /verify 0x<64-char-tx-hash>')
  }

  await ctx.reply('⏳ Fetching receipt from Base Sepolia…')

  const provider = getProvider()
  const receipt = await provider.getTransactionReceipt(txHash)
  if (!receipt) return ctx.reply(`❌ Transaction ${txHash} not found on Base Sepolia.`)

  const iface = new ethers.Interface([
    'event DecisionRecorded(bytes32 indexed agentId, bytes32 indexed decisionHash, uint8 confidence)',
    'event OutcomeRecorded(bytes32 indexed decisionHash, bool wasCorrect, int256 pnlDeltaBps)',
    'event ReputationUpdated(bytes32 indexed agentId, uint256 accuracyBps, uint8 tier)',
  ])

  const eventLines: string[] = []
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
      if (parsed) {
        eventLines.push(`*${parsed.name}*: ${JSON.stringify(parsed.args.toObject ? parsed.args.toObject() : [...parsed.args])}`)
      }
    } catch { /* log from different contract, skip */ }
  }

  await ctx.reply(
    `🔍 *Transaction Verified*\n\n` +
    `Hash: \`${txHash.slice(0, 12)}…\`\n` +
    `Block: ${receipt.blockNumber}\n` +
    `Gas Used: ${receipt.gasUsed.toString()}\n` +
    `Status: ${receipt.status === 1 ? '✅ Success' : '❌ Reverted'}\n\n` +
    (eventLines.length > 0 ? `*Decoded Events:*\n${eventLines.join('\n')}` : '_No ReputationLedger events found_') +
    `\n\n[View on BaseScan](https://sepolia.basescan.org/tx/${txHash})`,
    { parse_mode: 'Markdown' }
  )
})
