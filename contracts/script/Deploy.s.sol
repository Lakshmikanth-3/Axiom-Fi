// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";
import "../src/ReputationLedger.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        AgentRegistry registry = new AgentRegistry();
        ReputationLedger ledger = new ReputationLedger();

        console.log("AgentRegistry:", address(registry));
        console.log("ReputationLedger:", address(ledger));

        // Register the 4 core Axiom agents
        // Agent IDs are keccak256 of their role string
        bytes32 orchestratorId = keccak256("orchestrator-001");
        bytes32 researchId = keccak256("research-001");
        bytes32 riskId = keccak256("risk-guard-001");
        bytes32 executorId = keccak256("executor-001");

        string[] memory orchestratorSpecs = new string[](1);
        orchestratorSpecs[0] = "multi-agent-coordination";

        string[] memory researchSpecs = new string[](2);
        researchSpecs[0] = "DeFi-alpha";
        researchSpecs[1] = "on-chain-data";

        string[] memory riskSpecs = new string[](1);
        riskSpecs[0] = "risk-management";

        string[] memory execSpecs = new string[](2);
        execSpecs[0] = "uniswap-v3";
        execSpecs[1] = "keeperhub-execution";

        // NOTE: agent wallet addresses come from identity.ts derivation output
        // Fill these after running: npx ts-node agents/shared/identity.ts
        registry.registerAgent(
            orchestratorId,
            vm.envAddress("ORCHESTRATOR_WALLET"),
            "Axiom Orchestrator",
            "orchestrator",
            orchestratorSpecs
        );
        registry.registerAgent(
            researchId,
            vm.envAddress("RESEARCH_WALLET"),
            "Axiom Research Agent",
            "research",
            researchSpecs
        );
        registry.registerAgent(
            riskId,
            vm.envAddress("RISK_WALLET"),
            "Axiom Risk Guard",
            "risk-guard",
            riskSpecs
        );
        registry.registerAgent(
            executorId,
            vm.envAddress("EXECUTOR_WALLET"),
            "Axiom Executor",
            "executor",
            execSpecs
        );

        // Authorize agent wallets to write to ReputationLedger
        ledger.addWriter(vm.envAddress("RESEARCH_WALLET"));
        ledger.addWriter(vm.envAddress("RISK_WALLET"));
        ledger.addWriter(vm.envAddress("EXECUTOR_WALLET"));

        vm.stopBroadcast();
    }
}
