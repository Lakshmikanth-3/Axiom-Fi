import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";

// Load env from root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function seedReputation() {
    if (!process.env.RPC_URL || !process.env.DEPLOYER_PRIVATE_KEY || !process.env.REPUTATION_LEDGER_ADDRESS) {
        throw new Error("MISSING_VALUE: Check your .env file for RPC_URL, DEPLOYER_PRIVATE_KEY, and REPUTATION_LEDGER_ADDRESS");
    }

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
    
    const ledger = new ethers.Contract(
        process.env.REPUTATION_LEDGER_ADDRESS!,
        [
            "function recordDecision(bytes32 agentId, bytes32 decisionHash, uint8 confidence, int8 predictedDirection) external",
            "function recordOutcome(bytes32 decisionHash, int8 actualDirection, int256 pnlDeltaBps) external"
        ],
        wallet
    );

    console.log(`\n💎 AXIOM REPUTATION SEEDER`);
    console.log(`Network: Base Sepolia (84532)`);
    console.log(`Ledger:  ${process.env.REPUTATION_LEDGER_ADDRESS}`);
    console.log(`Wallet:  ${wallet.address}\n`);

    // We'll seed 5 trades per agent for speed in the demo, but enough to set the tiers
    const agents = [
        { id: "research-001",   targetWins: 4 }, // 80% accuracy -> Axiom/Gold
        { id: "risk-guard-001", targetWins: 3 }, // 60% accuracy -> Silver
        { id: "executor-001",   targetWins: 5 }  // 100% accuracy -> Axiom
    ];

    for (const agent of agents) {
        console.log(`[SEEDING] ${agent.id}...`);
        const idHash = ethers.id(agent.id);

        for (let i = 0; i < 5; i++) {
            const decisionHash = ethers.id(`${agent.id}-decision-${i}-${Date.now()}`);
            
            try {
                // 1. Record Decision
                const tx1 = await ledger.recordDecision(idHash, decisionHash, 85, 1);
                console.log(`  - ${agent.id} Decision recorded: ${tx1.hash}`);
                await tx1.wait();

                // 2. Record Outcome
                const isWin = i < agent.targetWins;
                const tx2 = await ledger.recordOutcome(decisionHash, isWin ? 1 : -1, isWin ? 150 : -80);
                console.log(`  - ${agent.id} Outcome recorded:  ${tx2.hash}`);
                await tx2.wait();
            } catch (e: any) {
                console.error(`  - Error seeding trade ${i} for ${agent.id}: ${e.message}`);
            }
        }
        console.log(`✅ ${agent.id} history complete.\n`);
    }

    console.log("🌟 ALL AGENTS SEEDED SUCCESSFULLY.");
}

seedReputation().catch(console.error);
