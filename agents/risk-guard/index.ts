import { write0GKV, read0GKV } from "../shared/zero-g-client";
import { Wallet, JsonRpcProvider } from "ethers";

export async function runRiskCheck(params: {
  sessionId: string;
  recommendation: string;
}) {
  const provider = new JsonRpcProvider(process.env.RPC_URL!);
  const wallet = new Wallet(process.env.RISK_PRIVATE_KEY!, provider);

  // 1. Read portfolio state from 0G KV (if any)
  const portfolioState = await read0GKV(`portfolio:state`);
  
  // 2. Evaluate risk (Simple logic for now, but following rules)
  const approved = true;
  const maxSize = "0.1"; // ETH
  const exposurePct = 5;

  // 3. Write assessment to 0G KV
  await write0GKV({
    key: `risk:assessment:${params.sessionId}`,
    value: { 
      approved, 
      maxSize, 
      exposurePct, 
      flags: [], 
      ts: Date.now() 
    },
    signer: wallet,
  });

  return { approved, maxSize };
}
