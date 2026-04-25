import { NextResponse } from 'next/server'
import { ethers } from 'ethers'

const REPUTATION_LEDGER_ABI = [
  "function getReputation(bytes32 agentId) external view returns (tuple(uint256 totalDecisions, uint256 correctDecisions, uint256 accuracyBps, uint8 tier, uint256 lastUpdated))",
  "function getFeeCoefficient(bytes32 agentId) external view returns (uint256)"
]

const TIERS: any[] = ['unranked', 'bronze', 'silver', 'gold', 'axiom']

export async function GET() {
  console.log("[API/Agents] GET request received");
  const rpcUrl = process.env.RPC_URL
  const ledgerAddress = process.env.REPUTATION_LEDGER_ADDRESS

  if (!rpcUrl || !ledgerAddress || ledgerAddress === 'MISSING_VALUE') {
    return NextResponse.json({ error: 'Blockchain configuration missing in .env' }, { status: 500 })
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const ledger = new ethers.Contract(ledgerAddress, REPUTATION_LEDGER_ABI, provider)

    const agentIds = ['research-001', 'risk-guard-001', 'executor-001']
    const agents = await Promise.all(agentIds.map(async (id) => {
      const idHash = ethers.id(id)
      const rep = await ledger.getReputation(idHash)
      const feeCoeff = await ledger.getFeeCoefficient(idHash)
      
      return {
        id,
        name: id === 'research-001' ? 'Research-001' : id === 'risk-guard-001' ? 'RiskGuard-001' : 'Executor-001',
        type: id.includes('research') ? 'research' : id.includes('risk') ? 'risk-guard' : 'executor',
        tier: TIERS[Number(rep[3])],
        accuracy: Number(rep[2]) / 100,
        totalDecisions: Number(rep[0]),
        fee: `$${(Number(feeCoeff) / 1000).toFixed(3)}`, // base fee $0.001 * coeff/100
        status: 'idle'
      }
    }))

    return NextResponse.json(agents)
  } catch (err: any) {
    console.error(`[API/Agents] Real Call Failed:`, err)
    return NextResponse.json({ error: `On-chain data fetch failed: ${err.message}` }, { status: 500 })
  }
}
