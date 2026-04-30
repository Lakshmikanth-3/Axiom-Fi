import { runDecentralizedInference } from "./compute-inference";
import { write0GKV, write0GLog } from "../shared/zero-g-client";
import { Wallet, JsonRpcProvider } from "ethers";

export async function runResearch(params: {
  strategy: string;
  sessionId: string;
}) {
  const provider = new JsonRpcProvider(process.env.RPC_URL!);
  const wallet = new Wallet(process.env.RESEARCH_PRIVATE_KEY!, provider);

  console.log(`[Research] Fetching live market data from CoinGecko + DeFiLlama...`);

  // ── 1. Fetch real DeFi data ──────────────────────────────────────────────────
  let ethPrice = 0;
  let ethChange24h = 0;
  let uniswapTvl = 0;

  try {
    const priceRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (priceRes.ok) {
      const d = await priceRes.json();
      ethPrice = d.ethereum?.usd ?? 0;
      ethChange24h = d.ethereum?.usd_24h_change ?? 0;
      console.log(`[Research ✓] ETH price = $${ethPrice} (${ethChange24h.toFixed(2)}% 24h)`);
    }
  } catch (e: any) {
    console.warn(`[Research WARN] CoinGecko failed: ${e.message}`);
  }

  try {
    const tvlRes = await fetch(`https://api.llama.fi/protocol/uniswap-v3`, {
      signal: AbortSignal.timeout(8000)
    });
    if (tvlRes.ok) {
      const tvlData = await tvlRes.json();
      const latest = tvlData.tvl?.[tvlData.tvl.length - 1];
      uniswapTvl = latest?.totalLiquidityUSD ?? 0;
      console.log(`[Research ✓] Uniswap V3 TVL = $${(uniswapTvl / 1e9).toFixed(2)}B`);
    }
  } catch (e: any) {
    console.warn(`[Research WARN] DeFiLlama failed: ${e.message}`);
  }

  // ── 2. Run LLM inference via 0G Compute ──────────────────────────────────────
  const prompt = `You are a DeFi trading analyst. Analyze this strategy: "${params.strategy}"
Market Data:
- ETH Price: $${ethPrice} (${ethChange24h.toFixed(2)}% 24h change)
- Uniswap V3 TVL: $${(uniswapTvl / 1e9).toFixed(2)}B

Should we execute this strategy now? Reply with exactly:
RECOMMENDATION: <YES or NO>
REASON: <one sentence>
CONFIDENCE: <0-100>`;

  console.log(`[Research] Sending prompt to 0G Compute Network...`);
  const inference = await runDecentralizedInference({ prompt, signer: wallet });
  const recommendation = inference.response;
  const inferenceModel = inference.model;
  const inferenceProvider = inference.providerAddress;
  console.log(`[Research ✓] 0G inference complete. Model=${inferenceModel} Provider=${inferenceProvider}`);

  // ── 3. Write state to 0G KV (non-blocking, graceful degradation) ─────────────
  const kvResult = await write0GKV({
    key: `research:latest:${params.sessionId}`,
    value: {
      recommendation,
      signals: { ethPrice, ethChange24h, uniswapTvl },
      model: inferenceModel,
      provider: inferenceProvider,
      ts: Date.now(),
    },
    signer: wallet,
  });
  console.log(`[Research ✓] KV state written → txHash=${kvResult.txHash}${kvResult.fallback ? ' (stdout fallback)' : ' (on-chain)'}`);

  // ── 4. Log to 0G Log Store ────────────────────────────────────────────────────
  const logResult = await write0GLog({
    agentId: "research-001",
    event: "recommendation_generated",
    data: {
      recommendation,
      signals: { ethPrice, ethChange24h, uniswapTvl },
      model: inferenceModel,
      provider: inferenceProvider,
    },
    signer: wallet,
  });
  console.log(`[Research ✓] Audit log written → txHash=${logResult.txHash}${logResult.fallback ? ' (stdout fallback)' : ' (0G Storage)'}`);

  return {
    recommendation,
    confidence: parseInt(recommendation.match(/CONFIDENCE:\s*(\d+)/)?.[1] ?? "70"),
    signals: { ethPrice, ethChange24h, uniswapTvl },
  };
}
