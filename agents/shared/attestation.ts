import { ethers } from "ethers";

const REPUTATION_LEDGER_ABI = [
  "function recordDecision(bytes32 agentId, bytes32 decisionHash, uint8 confidence, int8 predictedDirection) external",
  "function recordOutcome(bytes32 decisionHash, int8 actualDirection, int256 pnlDeltaBps) external"
];

export async function recordDecision(params: {
  agentId: string;
  payload: string;
  confidence: number;
  predictedDirection?: number;
  signer: ethers.Signer;
}) {
  const ledgerAddress = process.env.REPUTATION_LEDGER_ADDRESS;
  if (!ledgerAddress) throw new Error("MISSING_VALUE: REPUTATION_LEDGER_ADDRESS");

  const ledger = new ethers.Contract(ledgerAddress, REPUTATION_LEDGER_ABI, params.signer);
  
  const agentIdHash = ethers.id(params.agentId);
  const decisionHash = ethers.id(params.payload + Date.now());
  
  const nonce = await params.signer.getNonce("pending");
  console.log(`[Attestation] Recording decision on-chain...`);
  const tx = await ledger.recordDecision(
    agentIdHash,
    decisionHash,
    params.confidence,
    params.predictedDirection ?? 0,
    { gasLimit: 200000, nonce }
  );
  console.log(`[Attestation ✓] Transaction submitted: ${tx.hash}`);
  console.log(`[Attestation] Waiting for confirmation on Base Sepolia...`);
  await tx.wait(1);
  console.log(`[Attestation ✓] Decision confirmed!`);
  
  return { decisionHash, txHash: tx.hash };
}

export async function recordOutcome(params: {
  decisionHash: string;
  txHash: string;
  success: boolean;
  gasUsed: string;
  signer: ethers.Signer;
}) {
  const ledgerAddress = process.env.REPUTATION_LEDGER_ADDRESS;
  if (!ledgerAddress) throw new Error("MISSING_VALUE: REPUTATION_LEDGER_ADDRESS");

  const ledger = new ethers.Contract(ledgerAddress, REPUTATION_LEDGER_ABI, params.signer);
  
  const actualDirection = params.success ? 1 : -1;
  // PnL in basis points: +100bps on success (1%), -100bps on failure
  const pnlDeltaBps = params.success ? 100 : -100;

  console.log(`[Attestation] Recording outcome on-chain...`);
  const tx = await ledger.recordOutcome(
    params.decisionHash,
    actualDirection,
    pnlDeltaBps,
    { gasLimit: 200000 }
  );
  console.log(`[Attestation ✓] Outcome transaction submitted: ${tx.hash}`);
  await tx.wait(1);
  console.log(`[Attestation ✓] Outcome confirmed!`);
}
