// Selects the best available agent for a given role by reading live on-chain data.
// Rules: NO hardcoded agent IDs, NO mocks, NO fallbacks.
// Agent candidates are discovered from the deployed AgentRegistry contract (getAllAgentIds + getAgent).
// Best agent = highest accuracyBps on the ReputationLedger.

import { ethers } from "ethers";

const AGENT_REGISTRY_ABI = [
  "function getAllAgentIds() external view returns (bytes32[])",
  "function getAgent(bytes32 agentId) external view returns (tuple(address agentAddress, string name, string agentType, string[] specializations, address registeredBy, uint256 registeredAt, bool isActive))",
];

const REPUTATION_LEDGER_ABI = [
  "function getReputation(bytes32 agentId) external view returns (tuple(uint256 totalDecisions, uint256 correctDecisions, uint256 accuracyBps, uint8 tier, uint256 lastUpdated))",
];

export async function selectBestAgent(params: {
  role: string;
  provider: ethers.Provider;
}): Promise<string> {
  const registryAddress = process.env.AGENT_REGISTRY_ADDRESS;
  const ledgerAddress   = process.env.REPUTATION_LEDGER_ADDRESS;

  if (!registryAddress) throw new Error("MISSING_VALUE: AGENT_REGISTRY_ADDRESS");
  if (!ledgerAddress)   throw new Error("MISSING_VALUE: REPUTATION_LEDGER_ADDRESS");

  const registry = new ethers.Contract(registryAddress, AGENT_REGISTRY_ABI, params.provider);
  const ledger   = new ethers.Contract(ledgerAddress,   REPUTATION_LEDGER_ABI, params.provider);

  // 1. Fetch ALL registered agent IDs from the on-chain registry
  const allIds: string[] = await registry.getAllAgentIds();

  if (!allIds || allIds.length === 0) {
    throw new Error(
      `AGENT_REGISTRY_ERROR: No agents registered at ${registryAddress}. ` +
      `Complete agent onboarding before running the pipeline.`
    );
  }

  // 2. Filter to only active agents matching the requested role
  const roleMatches: string[] = [];
  for (const agentId of allIds) {
    try {
      const profile = await registry.getAgent(agentId);
      if (profile.isActive && profile.agentType.toLowerCase() === params.role.toLowerCase()) {
        roleMatches.push(agentId);
      }
    } catch (e: any) {
      console.warn(`[Selector] Could not fetch agent profile for id ${agentId}: ${e.message}`);
    }
  }

  if (roleMatches.length === 0) {
    throw new Error(
      `AGENT_REGISTRY_ERROR: No active agents for role "${params.role}" in registry ${registryAddress}. ` +
      `Register an agent of this type before running the pipeline.`
    );
  }

  // 3. Score each matching agent by live on-chain accuracyBps — pick the highest
  let bestAgentId: string | null = null;
  let highestAccuracy = -1;

  for (const agentId of roleMatches) {
    try {
      const rep = await ledger.getReputation(agentId);
      const accuracy = Number(rep.accuracyBps);
      if (accuracy > highestAccuracy) {
        highestAccuracy = accuracy;
        bestAgentId = agentId;
      }
    } catch (e: any) {
      console.warn(`[Selector] Reputation lookup failed for agent ${agentId}: ${e.message}`);
    }
  }

  if (!bestAgentId) {
    throw new Error(
      `AGENT_SELECTOR_ERROR: All ${roleMatches.length} agents for role "${params.role}" failed reputation lookup. ` +
      `Check REPUTATION_LEDGER_ADDRESS and on-chain state.`
    );
  }

  console.log(`[Selector] Best agent for "${params.role}": ${bestAgentId} (accuracyBps=${highestAccuracy})`);
  return bestAgentId;
}
