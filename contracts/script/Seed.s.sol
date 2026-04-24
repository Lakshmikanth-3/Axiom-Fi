// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/ReputationLedger.sol";

// Seeds 30 historical decisions so demo shows real scores immediately:
// Research Agent:  21/30 correct → 70% → Gold tier
// Risk Guard:      17/30 correct → 57% → Silver tier
// Executor:        28/30 correct → 93% → Axiom tier
contract Seed is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address ledgerAddr = vm.envAddress("REPUTATION_LEDGER_ADDRESS");
        vm.startBroadcast(deployerKey);

        ReputationLedger ledger = ReputationLedger(ledgerAddr);

        bytes32 researchId = keccak256("research-001");
        bytes32 riskId = keccak256("risk-guard-001");
        bytes32 executorId = keccak256("executor-001");

        // Seed 10 decisions per agent with predetermined outcomes
        // to produce the target accuracy scores for demo
        _seedAgentDecisions(ledger, researchId, 30, 21);   // 70% — Gold
        _seedAgentDecisions(ledger, riskId, 30, 17);       // 57% — Silver
        _seedAgentDecisions(ledger, executorId, 30, 28);   // 93% — Axiom

        vm.stopBroadcast();
    }

    function _seedAgentDecisions(
        ReputationLedger ledger,
        bytes32 agentId,
        uint256 total,
        uint256 correct
    ) internal {
        for (uint256 i = 0; i < total; i++) {
            bytes32 dHash = keccak256(abi.encodePacked(agentId, i, block.timestamp));
            int8 direction = 1;
            ledger.recordDecision(agentId, dHash, 75, direction);
            bool wasCorrect = (i < correct);
            int8 actual = wasCorrect ? int8(1) : int8(-1);
            int256 pnl = wasCorrect ? int256(150) : int256(-80); // in bps
            ledger.recordOutcome(dHash, actual, pnl);
        }
    }
}
