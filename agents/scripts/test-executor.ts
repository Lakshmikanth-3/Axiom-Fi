import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

import { getQuote, checkApproval } from "../shared/uniswap-client";
import { Wallet, JsonRpcProvider, ethers } from "ethers";

async function testExecutor() {
    console.log("--- Testing Executor (Uniswap Trading API) ---");
    
    // We test on Base Mainnet addresses because Uniswap API only supports mainnets
    const WETH = "0x4200000000000000000000000000000000000006";
    const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const amountIn = ethers.parseEther("0.001").toString();
    const chainId = 8453; // Base Mainnet

    const provider = new JsonRpcProvider(process.env.RPC_URL!);
    const wallet = new Wallet(process.env.EXECUTOR_PRIVATE_KEY!, provider);

    try {
        console.log(`[1/2] Checking Approval for WETH on Base...`);
        const approval = await checkApproval({
            walletAddress: wallet.address,
            chainId,
            token: WETH,
            amount: amountIn
        });
        console.log("Approval Status:", approval.approval ? "Required" : "Not Required");

        console.log(`[2/2] Fetching Uniswap Quote (WETH -> USDC)...`);
        const quote = await getQuote({
            type: "EXACT_INPUT",
            amount: amountIn,
            tokenInChainId: chainId,
            tokenOutChainId: chainId,
            tokenIn: WETH,
            tokenOut: USDC,
            swapper: wallet.address,
            routingPreference: "BEST_PRICE",
            protocols: ["V2", "V3", "V4"]
        });

        console.log("\n--- Quote Results ---");
        console.log("Routing:", quote.routing);
        console.log("Request ID:", quote.requestId);
        
        if (quote.requestId) {
            console.log("\n✅ Executor/Uniswap API Success");
        }
    } catch (e: any) {
        console.error("❌ Executor Test Failed:", e.message);
    }
}

testExecutor();
