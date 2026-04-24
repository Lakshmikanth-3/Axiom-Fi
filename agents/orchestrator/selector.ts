import { ethers } from "ethers";

const REPUTATION_LEDGER_ABI = [
  "function getReputation(bytes32 agentId) external view returns (tuple(uint256 totalDecisions, uint256 correctDecisions, uint256 accuracyBps, uint8 tier, uint256 lastUpdated))",
  "function getFeeCoefficient(bytes32 agentId) external view returns (uint256)"
];

export async function selectBestAgent(params: {
  role: string;
  provider: ethers.Provider;
}) {
  const ledgerAddress = process.env.REPUTATION_LEDGER_ADDRESS;
  if (!ledgerAddress) throw new Error("MISSING_VALUE: REPUTATION_LEDGER_ADDRESS");

  const ledger = new ethers.Contract(ledgerAddress, REPUTATION_LEDGER_ABI, params.provider);
  
  // For MVP, we have hardcoded IDs from the PRD
  const agents = {
    research: ["research-001"],
    "risk-guard": ["risk-guard-001"],
    executor: ["executor-001"]
  };

  const candidates = agents[params.role as keyof typeof agents] || [];
  let bestAgent = candidates[0];
  let highestAccuracy = 0;

  for (const id of candidates) {
    const idHash = ethers.id(id);
    const rep = await ledger.getReputation(idHash);
    if (Number(rep.accuracyBps) > highestAccuracy) {
      highestAccuracy = Number(rep.accuracyBps);
      bestAgent = id;
    }
  }

  return bestAgent;
}
