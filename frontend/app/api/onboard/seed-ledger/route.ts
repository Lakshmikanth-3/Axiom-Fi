import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Seeds a new agent into the ReputationLedger with an initial decision/outcome
// pair so the orchestrator selector can read a non-zero record for the agent.
// Uses the deployer wallet (authorized writer on ReputationLedger) to call
// recordDecision + recordOutcome with neutral initial values.

const REPUTATION_LEDGER_ABI = [
  "function recordDecision(bytes32 agentId, bytes32 decisionHash, uint8 confidence, int8 predictedDirection) external",
  "function recordOutcome(bytes32 decisionHash, int8 actualDirection, int256 pnlDeltaBps) external",
]

export async function POST(req: NextRequest) {
  const { role, agentId, token } = await req.json()

  if (!role || !agentId || !token) {
    return NextResponse.json({ error: 'Missing required fields: role, agentId, token' }, { status: 400 })
  }

  const rpcUrl = process.env.RPC_URL
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY
  const ledgerAddress = process.env.REPUTATION_LEDGER_ADDRESS
  const encKeyHex = process.env.ONBOARD_ENCRYPTION_KEY

  if (!rpcUrl) return NextResponse.json({ error: 'MISSING_VALUE: RPC_URL' }, { status: 500 })
  if (!deployerKey) return NextResponse.json({ error: 'MISSING_VALUE: DEPLOYER_PRIVATE_KEY' }, { status: 500 })
  if (!ledgerAddress) return NextResponse.json({ error: 'MISSING_VALUE: REPUTATION_LEDGER_ADDRESS' }, { status: 500 })
  if (!encKeyHex) return NextResponse.json({ error: 'MISSING_VALUE: ONBOARD_ENCRYPTION_KEY' }, { status: 500 })

  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const deployer = new ethers.Wallet(deployerKey, provider)
  const ledger = new ethers.Contract(ledgerAddress, REPUTATION_LEDGER_ABI, deployer)

  const agentIdHash = ethers.id(agentId)

  // Seed one neutral decision + outcome so the agent appears in the ledger
  const seedPayload = `seed:${agentId}:${Date.now()}`
  const decisionHash = ethers.id(seedPayload)

  const tx1 = await ledger.recordDecision(
    agentIdHash,
    decisionHash,
    75,  // confidence 75%
    0,   // neutral direction
    { gasLimit: 200_000 }
  )
  await tx1.wait(1)

  const tx2 = await ledger.recordOutcome(
    decisionHash,
    1,   // actualDirection: +1 (correct)
    0,   // pnlDeltaBps: zero (initial seeding, no real PnL yet)
    { gasLimit: 200_000 }
  )
  await tx2.wait(1)

  return NextResponse.json({
    success: true,
    seedDecisionTx: tx1.hash,
    seedOutcomeTx: tx2.hash,
    agentIdHash,
  })
}
