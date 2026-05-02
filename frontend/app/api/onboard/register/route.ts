import { NextRequest } from 'next/server'
import { ethers } from 'ethers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AGENT_REGISTRY_ABI = [
  "function registerAgent(bytes32 agentId, address agentAddress, string calldata name, string calldata agentType, string[] calldata specializations) external",
  "function getAgent(bytes32 agentId) external view returns (tuple(address agentAddress, string name, string agentType, string[] specializations, address registeredBy, uint256 registeredAt, bool isActive))",
]

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, agentType, specializations, derivedAddress } = body

  if (!name || !agentType || !derivedAddress) {
    return new Response(JSON.stringify({ error: 'Missing required fields: name, agentType, derivedAddress' }), { status: 400 })
  }
  if (!['research', 'risk-guard', 'executor', 'orchestrator'].includes(agentType)) {
    return new Response(JSON.stringify({ error: 'Invalid agentType' }), { status: 400 })
  }
  if (!ethers.isAddress(derivedAddress)) {
    return new Response(JSON.stringify({ error: 'Invalid derivedAddress' }), { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const rpcUrl = process.env.RPC_URL
        const deployerKey = process.env.DEPLOYER_PRIVATE_KEY
        const registryAddress = process.env.AGENT_REGISTRY_ADDRESS

        if (!rpcUrl) throw new Error('MISSING_VALUE: RPC_URL')
        if (!deployerKey) throw new Error('MISSING_VALUE: DEPLOYER_PRIVATE_KEY')
        if (!registryAddress) throw new Error('MISSING_VALUE: AGENT_REGISTRY_ADDRESS')

        const provider = new ethers.JsonRpcProvider(rpcUrl)
        const deployer = new ethers.Wallet(deployerKey, provider)
        const registry = new ethers.Contract(registryAddress, AGENT_REGISTRY_ABI, deployer)

        // Deterministic agentId: keccak256 of role:address:name
        const agentId = ethers.id(`${agentType}:${derivedAddress}:${name}`)

        send({ event: 'submitted', message: `Submitting registerAgent(...) to Base Sepolia...` })

        const tx = await registry.registerAgent(
          agentId,
          derivedAddress,
          name,
          agentType,
          specializations ?? [],
          { gasLimit: 300_000 }
        )

        send({
          event: 'confirming',
          message: `Transaction ${tx.hash} submitted. Awaiting block confirmation...`,
          txHash: tx.hash,
        })

        const receipt = await tx.wait(1)
        if (!receipt) throw new Error('Transaction receipt was null — network issue')

        send({
          event: 'confirmed',
          message: `Confirmed in block ${receipt.blockNumber} (gas used: ${receipt.gasUsed.toString()})`,
          blockNumber: receipt.blockNumber,
          txHash: tx.hash,
        })

        // Verify getAgent returns isActive: true
        const profile = await registry.getAgent(agentId)
        if (!profile.isActive) {
          throw new Error('On-chain verification failed: getAgent returned isActive=false')
        }

        send({
          event: 'verified',
          message: `Agent verified active on-chain. Registration complete.`,
          agentId,
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          address: derivedAddress,
          isActive: true,
        })
      } catch (err: any) {
        console.error('[/api/onboard/register]', err)
        send({ event: 'error', message: err.message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
