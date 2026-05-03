import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
if (!process.env.AGENT_MASTER_SEED) {
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
}

const MASTER_SEED = process.env.AGENT_MASTER_SEED;

// BIP-44 base path index per role for the MVP singleton agents (indices 0-3).
// New agents of the same role use: base + (existingCount * ROLE_STRIDE).
// ROLE_STRIDE=4 ensures no index collision across roles.
const ROLE_BASE_INDEX: Record<string, number> = {
  "orchestrator": 0,
  "research":     1,
  "risk-guard":   2,
  "executor":     3,
};
const ROLE_STRIDE = 4;

const AGENT_REGISTRY_ABI = [
  "function getAllAgentIds() external view returns (bytes32[] memory)",
  "function getAgent(bytes32 agentId) external view returns (tuple(address agentAddress, string name, string agentType, string[] specializations, address registeredBy, uint256 registeredAt, bool isActive))",
];

function derivePath(index: number): string {
  return `m/44'/60'/0'/0/${index}`;
}

function walletFromSeed(seed: string, derivationPath: string): ethers.HDNodeWallet {
  if (seed.startsWith("0x") || seed.length === 64) {
    const seedBuffer = Buffer.from(seed.replace("0x", ""), "hex");
    const mnemonic = ethers.Mnemonic.fromEntropy(seedBuffer);
    return ethers.HDNodeWallet.fromMnemonic(mnemonic, derivationPath);
  }
  return ethers.HDNodeWallet.fromPhrase(seed, derivationPath);
}

// Legacy function: derives the fixed MVP singleton wallet for a known role string like "orchestrator-001"
export function deriveWallet(seed: string, role: string): ethers.HDNodeWallet {
  const index = getLegacyRoleIndex(role);
  return walletFromSeed(seed, derivePath(index));
}

function getLegacyRoleIndex(role: string): number {
  const roles = ["orchestrator-001", "research-001", "risk-guard-001", "executor-001"];
  const index = roles.indexOf(role);
  return index === -1 ? 0 : index;
}

/**
 * Derives the next available BIP-44 wallet for a given role type.
 * Queries AgentRegistry.sol live to count existing active agents of that role,
 * then returns the next unused deterministic path index.
 *
 * BIP-44 slot = ROLE_BASE_INDEX[role] + (existingCount * ROLE_STRIDE)
 * e.g. research-002 = 1 + 1*4 = 5, research-003 = 1 + 2*4 = 9
 */
export async function deriveNextAvailable(
  role: string,
  provider: ethers.Provider
): Promise<{ address: string; privateKey: string; path: string; index: number }> {
  const registryAddress = process.env.AGENT_REGISTRY_ADDRESS;
  if (!registryAddress) throw new Error("MISSING_VALUE: AGENT_REGISTRY_ADDRESS is not set");

  const masterSeed = process.env.AGENT_MASTER_SEED;
  if (!masterSeed) throw new Error("MISSING_VALUE: AGENT_MASTER_SEED is not set");

  const registry = new ethers.Contract(registryAddress, AGENT_REGISTRY_ABI, provider);

  // Count active on-chain agents matching this role
  const allIds: string[] = await registry.getAllAgentIds();
  let countForRole = 0;
  for (const id of allIds) {
    const agent = await registry.getAgent(id);
    if (agent.agentType.toLowerCase() === role.toLowerCase() && agent.isActive) {
      countForRole++;
    }
  }

  const base = ROLE_BASE_INDEX[role.toLowerCase()] ?? 0;
  const nextIndex = base + countForRole * ROLE_STRIDE;
  const derivationPath = derivePath(nextIndex);

  const wallet = walletFromSeed(masterSeed, derivationPath);

  return {
    address:    wallet.address,
    privateKey: wallet.privateKey,
    path:       derivationPath,
    index:      nextIndex,
  };
}

if (require.main === module) {
  if (!MASTER_SEED) {
    console.error("MISSING_VALUE: AGENT_MASTER_SEED");
    process.exit(1);
  }
  const roles = ["orchestrator-001", "research-001", "risk-guard-001", "executor-001"];
  roles.forEach(role => {
    const w = deriveWallet(MASTER_SEED, role);
    console.log(`${role}: ${w.address}`);
  });
}
