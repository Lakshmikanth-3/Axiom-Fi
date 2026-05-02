import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
]

const MIN_ETH_WEI = ethers.parseEther('0.001')

export async function GET(req: NextRequest) {
  const address = new URL(req.url).searchParams.get('address')
  if (!address || !ethers.isAddress(address)) {
    return NextResponse.json({ error: 'Invalid or missing address parameter' }, { status: 400 })
  }

  const rpcUrl = process.env.RPC_URL
  const usdcAddress = process.env.USDC_CONTRACT_ADDRESS

  if (!rpcUrl) return NextResponse.json({ error: 'MISSING_VALUE: RPC_URL' }, { status: 500 })
  if (!usdcAddress) return NextResponse.json({ error: 'MISSING_VALUE: USDC_CONTRACT_ADDRESS' }, { status: 500 })
  if (!ethers.isAddress(usdcAddress)) return NextResponse.json({ error: 'USDC_CONTRACT_ADDRESS is not a valid address' }, { status: 500 })

  const provider = new ethers.JsonRpcProvider(rpcUrl)
  const usdc = new ethers.Contract(usdcAddress, ERC20_ABI, provider)

  const [ethWei, usdcRaw, decimals] = await Promise.all([
    provider.getBalance(address),
    usdc.balanceOf(address),
    usdc.decimals(),
  ])

  return NextResponse.json({
    eth: ethers.formatEther(ethWei),
    ethWei: ethWei.toString(),
    usdc: ethers.formatUnits(usdcRaw, decimals),
    usdcRaw: usdcRaw.toString(),
    funded: ethWei >= MIN_ETH_WEI,
    minEthRequired: ethers.formatEther(MIN_ETH_WEI),
  })
}
