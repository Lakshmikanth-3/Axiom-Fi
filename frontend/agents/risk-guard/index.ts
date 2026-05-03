import { write0GKV, read0GKV } from "../shared/zero-g-client";
import { Wallet, JsonRpcProvider } from "ethers";

export async function runRiskCheck(params: {
  sessionId: string;
  recommendation: string;
  confidence: number;
}): Promise<{ approved: boolean; maxSize: string; flags: string[] }> {
  const provider = new JsonRpcProvider(process.env.RPC_URL!);
  const wallet = new Wallet(process.env.RISK_PRIVATE_KEY!, provider);

  // 1. Read existing portfolio state from 0G KV
  // null = first-ever trade (no prior state) — this is valid, not an error.
  console.log(`[RiskGuard] Reading portfolio state from 0G KV...`);
  const portfolioState = await read0GKV(`portfolio:state`) as any;
  const currentExposurePct: number = portfolioState?.exposurePct ?? 0;
  console.log(`[RiskGuard] Portfolio state: ${portfolioState ? JSON.stringify(portfolioState) : "none (first trade)"}`);

  // 2. Real risk evaluation logic based on recommendation + portfolio state
  const flags: string[] = [];

  // Rule A: Reject if recommendation is explicitly NO
  const rec = params.recommendation.toLowerCase();
  const isExplicitNo = /recommendation:\s*no\b/.test(rec);
  const isBullish =
    !isExplicitNo &&
    (
      rec.includes("recommendation: yes") ||
      rec.includes("buy") ||
      rec.includes("long") ||
      rec.includes("execute")
    );

  if (isExplicitNo) {
    flags.push("RECOMMENDATION_NO");
  } else if (!isBullish) {
    flags.push("RECOMMENDATION_NOT_BULLISH");
  }

  // Rule B: Reject if confidence is too low
  if (params.confidence < 70) {
    flags.push("LOW_CONFIDENCE");
  }

  // Rule C: Reject if portfolio is already over-exposed (>50% in a single asset)
  if (currentExposurePct > 50) {
    flags.push("OVER_EXPOSED");
  }

  // Rule D: Max position size based on current exposure
  const maxSize = currentExposurePct > 20 ? "0.05" : "0.1"; // ETH — tighter limit if already exposed

  // Approved only if no blocking flags
  const approved = flags.length === 0;
  const newExposurePct = currentExposurePct + (approved ? 10 : 0);

  console.log(`[RiskGuard] Flags: ${flags.length === 0 ? "none" : flags.join(", ")}`);
  console.log(`[RiskGuard] Decision: ${approved ? "APPROVED" : "REJECTED"} | MaxSize: ${maxSize} ETH`);

  // 3. Write assessment to 0G KV — MANDATORY per rules.md (fail hard, no silent bypass)
  await write0GKV({
    key: `risk:assessment:${params.sessionId}`,
    value: {
      approved,
      maxSize,
      exposurePct: newExposurePct,
      flags,
      recommendation: params.recommendation.substring(0, 200),
      ts: Date.now()
    },
    signer: wallet,
  });

  return { approved, maxSize, flags };
}
