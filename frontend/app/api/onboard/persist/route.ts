import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { write0GKV } from '@/agents/shared/zero-g-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { agentId, name, agentType, specializations, address, txHash } = await req.json()

  if (!agentId || !name || !agentType || !address || !txHash) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const rpcUrl = process.env.RPC_URL
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY
  if (!rpcUrl) return NextResponse.json({ error: 'MISSING_VALUE: RPC_URL' }, { status: 500 })
  if (!deployerKey) return NextResponse.json({ error: 'MISSING_VALUE: DEPLOYER_PRIVATE_KEY' }, { status: 500 })

  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const signer = new ethers.Wallet(deployerKey, provider)

  const { txHash: kvTxHash, nodeUrl } = await write0GKV({
    key: `agent:profile:${agentId}`,
    value: {
      name,
      agentType,
      specializations: specializations ?? [],
      address,
      registeredAt: Date.now(),
      txHash,
      agentId,
    },
    signer: signer as any,
  })

  return NextResponse.json({ success: true, kvTxHash, nodeUrl })
}
