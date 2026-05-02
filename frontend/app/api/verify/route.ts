import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

const LEDGER_ABI = [
  'event DecisionRecorded(bytes32 indexed agentId, bytes32 indexed decisionHash, uint8 confidence)',
  'event OutcomeRecorded(bytes32 indexed decisionHash, bool wasCorrect, int256 pnlDeltaBps)',
  'event ReputationUpdated(bytes32 indexed agentId, uint256 accuracyBps, uint8 tier)',
]

export async function GET(req: NextRequest) {
  const txHash = req.nextUrl.searchParams.get('txHash')
  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return NextResponse.json({ error: 'Invalid tx hash' }, { status: 400 })
  }

  const rpc = process.env.RPC_URL
  if (!rpc) return NextResponse.json({ error: 'RPC_URL not set' }, { status: 500 })

  try {
    const provider = new ethers.JsonRpcProvider(rpc)
    const receipt  = await provider.getTransactionReceipt(txHash)

    if (!receipt) {
      return NextResponse.json({ error: 'Transaction not found on Base Sepolia' }, { status: 404 })
    }

    const iface = new ethers.Interface(LEDGER_ABI)
    const events: { name: string; args: string }[] = []

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data })
        if (parsed) {
          events.push({
            name: parsed.name,
            args: JSON.stringify(
              parsed.args.toObject ? parsed.args.toObject() : [...parsed.args],
              (_, v) => typeof v === 'bigint' ? v.toString() : v,
              2
            ),
          })
        }
      } catch { /* different contract */ }
    }

    return NextResponse.json({
      hash:        receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed:     receipt.gasUsed.toString(),
      status:      receipt.status,
      events,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
