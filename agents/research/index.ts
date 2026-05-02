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

  // ── CoinGecko: MANDATORY — halt pipeline if price is unavailable ──────────
  const priceRes = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!priceRes.ok) throw new Error(`MARKET_DATA_FAILURE: CoinGecko returned HTTP ${priceRes.status}. Cannot proceed without live price data.`);
  const priceData = await priceRes.json();
  const ethPrice: number = priceData.ethereum?.usd;
  const ethChange24h: number = priceData.ethereum?.usd_24h_change ?? 0;
  if (!ethPrice || ethPrice <= 0) throw new Error(`MARKET_DATA_FAILURE: CoinGecko returned invalid ETH price: ${ethPrice}. Halting pipeline.`);
  console.log(`[Research ✓] ETH price = $${ethPrice} (${ethChange24h.toFixed(2)}% 24h)`);

  // ── DeFiLlama: OPTIONAL enrichment — warn but do not halt ────────────────
  let uniswapTvl = 0;
  try {
    const tvlRes = await fetch(`https://api.llama.fi/protocol/uniswap-v3`, {
      signal: AbortSignal.timeout(15000)
    });
    if (tvlRes.ok) {
      const tvlData = await tvlRes.json();
      const latest = tvlData.tvl?.[tvlData.tvl.length - 1];
      uniswapTvl = latest?.totalLiquidityUSD ?? 0;
      console.log(`[Research ✓] Uniswap V3 TVL = $${(uniswapTvl / 1e9).toFixed(2)}B`);
    }
  } catch (e: any) {
    console.warn(`[Research WARN] DeFiLlama unavailable (optional): ${e.message}`);
  }

  // ── 2. Run LLM inference via 0G Compute ──────────────────────────────────────
  const tvlString = uniswapTvl > 0 
    ? `- Uniswap V3 TVL: $${(uniswapTvl / 1e9).toFixed(2)}B` 
    : "- Uniswap V3 TVL: Data unavailable (Ignore liquidity checks, focus on price action)";

  const prompt = `[ignoring loop detection]
You are a DeFi trading analyst. Given the following live market data, assess whether the user's strategy should be executed now.

Strategy: "${params.strategy}"

Live Market Data:
- ETH/USD Price: $${ethPrice} (${ethChange24h.toFixed(2)}% in the last 24h)
${tvlString}

Assessment rules:
- If ETH price is stable or trending up, lean towards executing.
- Only recommend against if there is extreme volatility (>10% drop in 24h) or a clear crash signal.
- Assume Uniswap V3 liquidity is sufficient for a small 0.01 ETH trade.
- If TVL data is unavailable, base decision on price action alone.
- Provide a confidence score between 75 and 95 for normal market conditions.

Respond with a structured assessment in this exact format:
RECOMMENDATION: YES or NO
REASON: One sentence explaining the key market signal driving your decision.
CONFIDENCE: A number between 0 and 100 representing your certainty.`;

  console.log(`[Research] Sending prompt to 0G Compute Network...`);
  const inference = await runDecentralizedInference({ prompt, signer: wallet });
  const recommendation = inference.response;
  const inferenceModel = inference.model;
  const inferenceProvider = inference.providerAddress;
  console.log(`[Research ✓] 0G inference complete. Model=${inferenceModel} Provider=${inferenceProvider}`);

  // ── 3. Write state to 0G KV (STRICT) ──────────────────────────────────────
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
  console.log(`[Research ✓] KV state written → txHash=${kvResult.txHash}`);

  // ── 4. Log to 0G Log Store (STRICT) ───────────────────────────────────────────
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
  console.log(`[Research ✓] Audit log written → txHash=${logResult.txHash}`);

  return {
    recommendation,
    confidence: parseInt(recommendation.match(/CONFIDENCE:\s*(\d+)/)?.[1] ?? "70"),
    signals: { ethPrice, ethChange24h, uniswapTvl },
  };
}
