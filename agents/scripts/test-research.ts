import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

import { runResearch } from "../research/index";

async function testResearch() {
    console.log("--- Testing Research Agent (0G Compute) ---");
    const strategy = "Buy 0.01 ETH if it drops below $2000";
    const sessionId = `test-session-${Date.now()}`;

    try {
        console.log(`Running research for strategy: "${strategy}"`);
        const result = await runResearch({ strategy, sessionId });
        
        console.log("\n--- Research Results ---");
        console.log("Recommendation:", result.recommendation);
        console.log("Confidence:", result.confidence);
        console.log("Signals:", JSON.stringify(result.signals, null, 2));
        
        if (result.recommendation) {
            console.log("\n✅ Research Agent Success");
        }
    } catch (e: any) {
        console.error("❌ Research Agent Failed:", e.message);
    }
}

testResearch();
