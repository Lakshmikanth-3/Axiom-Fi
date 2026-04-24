const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy AgentRegistry
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("AgentRegistry deployed to:", registryAddress);

  // 2. Deploy ReputationLedger
  const ReputationLedger = await ethers.getContractFactory("ReputationLedger");
  const ledger = await ReputationLedger.deploy();
  await ledger.waitForDeployment();
  const ledgerAddress = await ledger.getAddress();
  console.log("ReputationLedger deployed to:", ledgerAddress);

  // 3. Register standard agents
  const agents = [
    { id: "research-001", addr: process.env.RESEARCH_WALLET || deployer.address, type: "research", name: "Research-001" },
    { id: "risk-guard-001", addr: process.env.RISK_WALLET || deployer.address, type: "risk-guard", name: "RiskGuard-001" },
    { id: "executor-001", addr: process.env.EXECUTOR_WALLET || deployer.address, type: "executor", name: "Executor-001" }
  ];

  for (const a of agents) {
    const idHash = ethers.id(a.id);
    const tx = await registry.registerAgent(idHash, a.addr, a.name, a.type, ["General"]);
    await tx.wait();
    console.log(`Registered agent: ${a.name} (${a.id})`);
  }

  // 4. Seed reputation data (simulating 30 historical decisions)
  console.log("Seeding historical reputation data...");
  const agentIds = agents.map(a => ethers.id(a.id));
  
  for (let i = 0; i < 30; i++) {
    const agentId = agentIds[i % agentIds.length];
    const decisionHash = ethers.id(`seed-decision-${i}`);
    
    // Record decision
    const tx1 = await ledger.recordDecision(agentId, decisionHash, 70 + (i % 30), 1);
    await tx1.wait();

    // Record outcome (70% correct for demo)
    const wasCorrect = (i % 10 < 7); 
    const tx2 = await ledger.recordOutcome(decisionHash, wasCorrect ? 1 : -1, wasCorrect ? 50 : -20);
    await tx2.wait();
  }
  console.log("Seeding complete.");

  console.log("\n--- DEPLOYMENT SUMMARY ---");
  console.log("AGENT_REGISTRY_ADDRESS=" + registryAddress);
  console.log("REPUTATION_LEDGER_ADDRESS=" + ledgerAddress);
  console.log("--------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
