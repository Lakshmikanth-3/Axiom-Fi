import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

import { write0GKV, read0GKV, write0GLog } from "../shared/zero-g-client";
import { Wallet, JsonRpcProvider } from "ethers";

async function testInfra() {
    console.log("--- Testing 0G Infrastructure ---");
    const provider = new JsonRpcProvider(process.env.RPC_URL!);
    const wallet = new Wallet(process.env.RESEARCH_PRIVATE_KEY!, provider);

    const testKey = `test:key:${Date.now()}`;
    const testValue = { hello: "world", ts: Date.now() };

    try {
        console.log(`[1/3] Testing 0G KV Write (Key: ${testKey})...`);
        await write0GKV({ key: testKey, value: testValue, signer: wallet });
        console.log("✅ KV Write Success");

        console.log(`[2/3] Testing 0G KV Read...`);
        const result = await read0GKV(testKey);
        console.log("Result:", result);
        if (result && (result as any).hello === "world") {
            console.log("✅ KV Read Success");
        } else {
            console.log("❌ KV Read Mismatch or Timeout");
        }

        console.log(`[3/3] Testing 0G Log Store (Blob Upload)...`);
        await write0GLog({
            agentId: "test-agent",
            event: "test_event",
            data: { foo: "bar" },
            signer: wallet
        });
        console.log("✅ Log Store Success");

    } catch (e: any) {
        console.error("❌ Infrastructure Test Failed:", e.message);
    }
}

testInfra();
