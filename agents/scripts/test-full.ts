import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

import { main } from "../orchestrator/index";

async function testFull() {
    console.log("--- Testing Full Orchestrator Pipeline ---");
    const strategy = process.argv[2] || "Analyze ETH price and buy 0.01 ETH of USDC if the market is stable";
    
    try {
        console.log(`Executing strategy: "${strategy}"`);
        await main(strategy);
        console.log("\n✅ Full Pipeline Execution Finished");
    } catch (e: any) {
        console.error("\n❌ Pipeline Failed:", e.message);
        process.exit(1);
    }
}

testFull();
