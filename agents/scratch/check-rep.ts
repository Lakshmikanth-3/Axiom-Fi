import dotenv from "dotenv";
import { ethers } from "ethers";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const REPUTATION_LEDGER_ABI = [
  "function getReputation(bytes32 agentId) external view returns (tuple(uint256 totalDecisions, uint256 correctDecisions, uint256 accuracyBps, uint8 tier, uint256 lastUpdated))",
  "function getFeeCoefficient(bytes32 agentId) external view returns (uint256)",
  "function updateReputation(bytes32 agentId, uint256 total, uint256 correct) external"
];

async function checkAndRegister() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
  const ledger = new ethers.Contract(process.env.REPUTATION_LEDGER_ADDRESS!, REPUTATION_LEDGER_ABI, wallet);

  const agentIds = ['research-001', 'risk-guard-001', 'executor-001'];

  for (const id of agentIds) {
    const idHash = ethers.id(id);
    try {
      const rep = await ledger.getReputation(idHash);
      console.log(`Agent ${id} reputation:`, rep);
      if (rep.totalDecisions === 0n) {
        console.log(`Seeding initial reputation for ${id}...`);
        const tx = await ledger.updateReputation(idHash, 100, 85);
        await tx.wait();
        console.log(`Seed successful for ${id}`);
      }
    } catch (e) {
      console.error(`Error checking agent ${id}:`, e);
    }
  }
}

checkAndRegister();
