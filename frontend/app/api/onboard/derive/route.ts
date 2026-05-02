import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import crypto from 'crypto'
import { deriveNextAvailable } from '@/agents/shared/identity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// In-process store: token → { encryptedKey, iv, address, role, expiresAt }
// This resets on server restart which is acceptable for a one-time download flow.
const keyStore = new Map<string, {
  encryptedKey: string
  iv: string
  address: string
  role: string
  expiresAt: number
}>()

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [token, entry] of keyStore) {
    if (entry.expiresAt < now) keyStore.delete(token)
  }
}, 10 * 60 * 1000)

export async function POST(req: NextRequest) {
  const { role } = await req.json()

  if (!role || !['research', 'risk-guard', 'executor', 'orchestrator'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role. Must be research, risk-guard, executor, or orchestrator.' }, { status: 400 })
  }

  const rpcUrl = process.env.RPC_URL
  const encKeyHex = process.env.ONBOARD_ENCRYPTION_KEY
  if (!rpcUrl) return NextResponse.json({ error: 'MISSING_VALUE: RPC_URL' }, { status: 500 })
  if (!encKeyHex) return NextResponse.json({ error: 'MISSING_VALUE: ONBOARD_ENCRYPTION_KEY' }, { status: 500 })
  if (encKeyHex.length !== 64) return NextResponse.json({ error: 'ONBOARD_ENCRYPTION_KEY must be 64 hex chars (32 bytes)' }, { status: 500 })

  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const { address, privateKey, path, index } = await deriveNextAvailable(role, provider as any)

  // Encrypt the private key with AES-256-CBC
  const encKey = Buffer.from(encKeyHex, 'hex')
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', encKey, iv)
  let encrypted = cipher.update(privateKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  // Store with 15-minute TTL; token is a random UUID
  const token = crypto.randomUUID()
  keyStore.set(token, {
    encryptedKey: encrypted,
    iv: iv.toString('hex'),
    address,
    role,
    expiresAt: Date.now() + 15 * 60 * 1000,
  })

  return NextResponse.json({ address, path, index, token })
}

// Separate GET handler for the one-time download: GET /api/onboard/derive?token=xxx
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const entry = keyStore.get(token)
  if (!entry) return NextResponse.json({ error: 'Token not found or already used' }, { status: 404 })
  if (entry.expiresAt < Date.now()) {
    keyStore.delete(token)
    return NextResponse.json({ error: 'Token expired' }, { status: 410 })
  }

  const encKeyHex = process.env.ONBOARD_ENCRYPTION_KEY!
  const encKey = Buffer.from(encKeyHex, 'hex')
  const iv = Buffer.from(entry.iv, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', encKey, iv)
  let pk = decipher.update(entry.encryptedKey, 'hex', 'utf8')
  pk += decipher.final('utf8')

  // One-time: delete immediately after use
  keyStore.delete(token)

  const content = `AXIOM-FI AGENT PRIVATE KEY\n===========================\nRole:    ${entry.role}\nAddress: ${entry.address}\nKey:     ${pk}\n\nSTORE THIS SECURELY. This file will not be shown again.\n`

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="axiom-agent-${entry.role}-${entry.address.slice(0, 8)}.txt"`,
    },
  })
}

// Export keyStore so seed-ledger route can access the same process-level Map
export { keyStore }
