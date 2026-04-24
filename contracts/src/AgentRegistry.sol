// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgentRegistry {
    struct AgentProfile {
        address agentAddress;
        string name;
        string agentType;       // "research" | "risk-guard" | "executor" | "orchestrator"
        string[] specializations;
        address registeredBy;
        uint256 registeredAt;
        bool isActive;
    }

    mapping(bytes32 => AgentProfile) public agents;
    bytes32[] public agentIds;
    mapping(address => bytes32) public addressToId;

    event AgentRegistered(bytes32 indexed agentId, address agentAddress, string agentType);
    event AgentDeactivated(bytes32 indexed agentId);

    function registerAgent(
        bytes32 agentId,
        address agentAddress,
        string calldata name,
        string calldata agentType,
        string[] calldata specializations
    ) external {
        require(agents[agentId].registeredAt == 0, "Agent already registered");
        require(agentAddress != address(0), "Zero address");
        agents[agentId] = AgentProfile(
            agentAddress, name, agentType, specializations, msg.sender, block.timestamp, true
        );
        agentIds.push(agentId);
        addressToId[agentAddress] = agentId;
        emit AgentRegistered(agentId, agentAddress, agentType);
    }

    function getAgent(bytes32 agentId) external view returns (AgentProfile memory) {
        return agents[agentId];
    }

    function getAllAgentIds() external view returns (bytes32[] memory) {
        return agentIds;
    }

    function deactivateAgent(bytes32 agentId) external {
        require(agents[agentId].registeredBy == msg.sender, "Not owner");
        agents[agentId].isActive = false;
        emit AgentDeactivated(agentId);
    }
}
