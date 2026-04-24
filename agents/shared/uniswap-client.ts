// REAL Uniswap Trading API client — no mocks, no fallbacks

const UNISWAP_BASE = "https://trade-api.gateway.uniswap.org/v1";

function uniswapHeaders(): Record<string, string> {
  if (!process.env.UNISWAP_API_KEY) {
    throw new Error("MISSING_VALUE: UNISWAP_API_KEY is not set");
  }
  return {
    "Content-Type": "application/json",
    "x-api-key": process.env.UNISWAP_API_KEY,
    "x-universal-router-version": "2.0",
  };
}

async function uniswapPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${UNISWAP_BASE}${path}`, {
    method: "POST",
    headers: uniswapHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Uniswap API ${path} failed [${res.status}]: ${err}`);
  }
  return res.json() as Promise<T>;
}

// ─── Step 1: Check token approval ────────────────────────────────────────────
export interface ApprovalCheckRequest {
  walletAddress: string;
  chainId: number;
  token: string;   // ERC-20 address; omit for native ETH swaps
  amount: string;  // in wei as string
}

export interface ApprovalCheckResponse {
  requestId: string;
  approval: {
    token: string;
    spender: string;
    amount: string;
    permit2Required: boolean;
    permit2Allowance: string;
  } | null;
  permit2: {
    eip712: { domain: object; types: object; values: object };
  } | null;
}

export async function checkApproval(
  req: ApprovalCheckRequest
): Promise<ApprovalCheckResponse> {
  return uniswapPost<ApprovalCheckResponse>("/check_approval", req);
}

// ─── Step 2: Get quote ────────────────────────────────────────────────────────
export interface QuoteRequest {
  type: "EXACT_INPUT" | "EXACT_OUTPUT";
  amount: string;            // in wei as string
  tokenInChainId: number;
  tokenOutChainId: number;
  tokenIn: string;           // 0x000...000 for native ETH
  tokenOut: string;
  swapper: string;           // executor agent wallet address
  routingPreference: "BEST_PRICE" | "FASTEST";
  autoSlippage?: "DEFAULT" | "AGGRESSIVE" | "PERMISSIVE";
  slippageTolerance?: number;
  urgency?: "urgent" | "normal" | "low";
  protocols?: Array<"V2" | "V3" | "V4">;
}

export interface QuoteResponse {
  requestId: string;
  routing: "CLASSIC" | "DUTCH_V2" | "DUTCH_V3" | "PRIORITY" | "LIMIT_ORDER";
  quote: {
    quoteId?: string;
    slippageTolerance?: number;
    classicGasUseEstimateUSD?: string;
    // UniswapX fields:
    encodedOrder?: string;
    orderId?: string;
    orderInfo?: object;
  };
  permitData?: {
    domain: object;
    types: object;
    values: object;
  };
  permitTransaction?: {
    to: string;
    from: string;
    data: string;
    value: string;
    chainId: number;
    gasLimit: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  };
}

export async function getQuote(req: QuoteRequest): Promise<QuoteResponse> {
  return uniswapPost<QuoteResponse>("/quote", req);
}

// ─── Step 3: Build swap calldata ─────────────────────────────────────────────
export interface SwapRequest {
  quote: QuoteResponse;
  swapperSignature?: string;  // EIP-712 signature if permitData was in quote
  simulate?: boolean;
  refreshGasPrice?: boolean;
}

export interface SwapResponse {
  requestId: string;
  swap: {
    to: string;
    from: string;
    data: string;
    value: string;
    chainId: number;
    gasLimit: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  } | null;
  gasFee: string;
}

export async function buildSwapTx(req: SwapRequest): Promise<SwapResponse> {
  return uniswapPost<SwapResponse>("/swap", req);
}
