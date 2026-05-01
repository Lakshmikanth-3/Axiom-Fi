// Full real swap execution: approve → quote → sign → build → send

import { Wallet, JsonRpcProvider } from "ethers";
import { checkApproval, getQuote, buildSwapTx } from "../shared/uniswap-client";
import { recordDecision } from "../shared/attestation";

export async function buildAndExecuteSwap(params: {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;   // in wei
  chainId: number;
}): Promise<{
  swapCalldata: any;
  decisionHash: string;
  quoteRequestId: string;
  routing: string;
}> {
  const provider = new JsonRpcProvider(process.env.RPC_URL!);
  const wallet = new Wallet(process.env.EXECUTOR_PRIVATE_KEY!, provider);

  // Step 1: Check if token approval needed
  const approvalCheck = await checkApproval({
    walletAddress: wallet.address,
    chainId: params.chainId,
    token: params.tokenIn,
    amount: params.amountIn,
  });

  // If approval tx required, send it
  if (approvalCheck.approval !== null && approvalCheck.approval.spender) {
    if (!approvalCheck.permit2) {
      // Classic ERC-20 approve
      const spender = approvalCheck.approval.spender;
      const amount = BigInt(approvalCheck.approval.amount || "0").toString(16).padStart(64, "0");
      const approveTx = await wallet.sendTransaction({
        to: params.tokenIn,
        data:
          "0x095ea7b3" + // approve(address,uint256)
          spender.slice(2).padStart(64, "0") +
          amount,
      });
      await approveTx.wait();
    }
  }

  // Step 2: Get real Uniswap quote
  const quote = await getQuote({
    type: "EXACT_INPUT",
    amount: params.amountIn,
    tokenInChainId: params.chainId,
    tokenOutChainId: params.chainId,
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    swapper: wallet.address,
    routingPreference: "BEST_PRICE",
    autoSlippage: "DEFAULT",
    urgency: "urgent",
    protocols: ["V2", "V3", "V4"],
  });

  // Step 3: Write decision attestation BEFORE executing
  const decisionPayload = JSON.stringify({
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amountIn: params.amountIn,
    routing: quote.routing,
    quoteRequestId: quote.requestId,
    timestamp: Date.now(),
  });
  const decisionHash = await recordDecision({
    agentId: "executor-001",
    payload: decisionPayload,
    confidence: 95,
    signer: wallet,
  });

  // Step 4: Sign permit if required
  let swapperSignature: string | undefined;
  if (quote.permitData) {
    const { domain, types, values } = quote.permitData;
    swapperSignature = await wallet.signTypedData(
      domain as any,
      types as any,
      values as any
    );
  }

  // Step 5: Build real swap calldata
  const swapTx = await buildSwapTx({
    quote: quote.quote,
    requestId: quote.requestId,
    swapperSignature,
    simulate: true,
  });

  if (!swapTx?.swap) {
    throw new Error("Uniswap swap calldata null — cannot execute");
  }

  // Step 6: Return tx data to KeeperHub for guaranteed execution
  return {
    swapCalldata: swapTx.swap,
    decisionHash,
    quoteRequestId: quote.requestId,
    routing: quote.routing,
  };
}
