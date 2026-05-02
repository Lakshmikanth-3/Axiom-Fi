import { NextResponse } from 'next/server'
import { ethers } from 'ethers'

const BASESCAN = 'https://sepolia.basescan.org'

const LEDGER_ABI = [
  'function getReputation(bytes32 agentId) external view returns (tuple(uint256 totalDecisions, uint256 correctDecisions, uint256 accuracyBps, uint8 tier, uint256 lastUpdated))',
]
const REGISTRY_ABI = [
  'function getAllAgentIds() external view returns (bytes32[] memory)',
  'function getAgent(bytes32 agentId) external view returns (tuple(address agentAddress, string name, string agentType, string[] specializations, address registeredBy, uint256 registeredAt, bool isActive))',
]

export async function GET() {
  const rpc = process.env.RPC_URL
  const registryAddr = process.env.AGENT_REGISTRY_ADDRESS
  const ledgerAddr   = process.env.REPUTATION_LEDGER_ADDRESS

  if (!rpc || !registryAddr || !ledgerAddr) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 })
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpc)
    const registry = new ethers.Contract(registryAddr, REGISTRY_ABI, provider)
    const ledger   = new ethers.Contract(ledgerAddr, LEDGER_ABI, provider)

    const allIds: string[] = await registry.getAllAgentIds()

    const agents = await Promise.all(
      allIds.map(async (id: string) => {
        try {
          const agent = await registry.getAgent(id)
          const rep   = await ledger.getReputation(id).catch(() => null)
          return {
            id,
            name:            agent.name,
            agentType:       agent.agentType,
            specializations: agent.specializations,
            address:         agent.agentAddress,
            isActive:        agent.isActive,
            registeredAt:    Number(agent.registeredAt),
            tier:            rep ? Number(rep.tier) : 0,
            accuracyBps:     rep ? Number(rep.accuracyBps) : 0,
            totalDecisions:  rep ? Number(rep.totalDecisions) : 0,
          }
        } catch {
          return null
        }
      })
    )

    return NextResponse.json({ agents: agents.filter(Boolean) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
