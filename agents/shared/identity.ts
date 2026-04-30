import { ethers } from "ethers";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
if (!process.env.AGENT_MASTER_SEED) {
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
}

const MASTER_SEED = process.env.AGENT_MASTER_SEED;

export function deriveWallet(seed: string, role: string) {
  const index = getRoleIndex(role);
  const path = `m/44'/60'/0'/0/${index}`;
  
  if (seed.startsWith("0x") || seed.length === 64) {
    const seedBuffer = Buffer.from(seed.replace("0x", ""), "hex");
    const mnemonic = ethers.Mnemonic.fromEntropy(seedBuffer);
    return ethers.HDNodeWallet.fromMnemonic(mnemonic, path);
  } else {
    return ethers.Wallet.fromPhrase(seed).connect(null as any); // fallback if not phrase, but we use phrase for derivation usually
  }
}

function getRoleIndex(role: string): number {
  const roles = ["orchestrator-001", "research-001", "risk-guard-001", "executor-001"];
  const index = roles.indexOf(role);
  return index === -1 ? 0 : index;
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
