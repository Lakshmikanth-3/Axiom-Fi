// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ReputationLedger {
    struct Decision {
        bytes32 agentId;
        bytes32 decisionHash;
        uint8 confidence;           // 0–100
        int8 predictedDirection;    // +1 long, -1 short, 0 neutral
        uint256 timestamp;
        bool outcomeRecorded;
        bool wasCorrect;
        int256 pnlDeltaBps;
    }

    struct ReputationScore {
        uint256 totalDecisions;
        uint256 correctDecisions;
        uint256 accuracyBps;        // e.g. 7100 = 71.00%
        uint8 tier;                 // 0=Unranked 1=Bronze 2=Silver 3=Gold 4=Axiom
        uint256 lastUpdated;
    }

    mapping(bytes32 => Decision) public decisions;
    mapping(bytes32 => bytes32[]) public agentDecisions;
    mapping(bytes32 => ReputationScore) public reputations;

    // Only registered agents (or deployer) can write
    address public owner;
    mapping(address => bool) public authorizedWriters;

    event DecisionRecorded(bytes32 indexed agentId, bytes32 indexed decisionHash, uint8 confidence);
    event OutcomeRecorded(bytes32 indexed decisionHash, bool wasCorrect, int256 pnlDeltaBps);
    event ReputationUpdated(bytes32 indexed agentId, uint256 accuracyBps, uint8 tier);

    constructor() {
        owner = msg.sender;
        authorizedWriters[msg.sender] = true;
    }

    modifier onlyWriter() {
        require(authorizedWriters[msg.sender], "Not authorized");
        _;
    }

    function addWriter(address writer) external {
        require(msg.sender == owner, "Not owner");
        authorizedWriters[writer] = true;
    }

    function recordDecision(
        bytes32 agentId,
        bytes32 decisionHash,
        uint8 confidence,
        int8 predictedDirection
    ) external onlyWriter {
        require(decisions[decisionHash].timestamp == 0, "Already recorded");
        decisions[decisionHash] = Decision({
            agentId: agentId,
            decisionHash: decisionHash,
            confidence: confidence,
            predictedDirection: predictedDirection,
            timestamp: block.timestamp,
            outcomeRecorded: false,
            wasCorrect: false,
            pnlDeltaBps: 0
        });
        agentDecisions[agentId].push(decisionHash);
        emit DecisionRecorded(agentId, decisionHash, confidence);
    }

    function recordOutcome(
        bytes32 decisionHash,
        int8 actualDirection,
        int256 pnlDeltaBps
    ) external onlyWriter {
        Decision storage d = decisions[decisionHash];
        require(d.timestamp != 0, "Decision not found");
        require(!d.outcomeRecorded, "Outcome already recorded");

        d.outcomeRecorded = true;
        d.wasCorrect = (d.predictedDirection == actualDirection);
        d.pnlDeltaBps = pnlDeltaBps;

        ReputationScore storage rep = reputations[d.agentId];
        rep.totalDecisions += 1;
        if (d.wasCorrect) rep.correctDecisions += 1;

        rep.accuracyBps = rep.totalDecisions == 0
            ? 0
            : (rep.correctDecisions * 10000) / rep.totalDecisions;

        rep.tier = _getTier(rep.accuracyBps, rep.totalDecisions);
        rep.lastUpdated = block.timestamp;

        emit OutcomeRecorded(decisionHash, d.wasCorrect, pnlDeltaBps);
        emit ReputationUpdated(d.agentId, rep.accuracyBps, rep.tier);
    }

    function _getTier(uint256 accuracyBps, uint256 total) internal pure returns (uint8) {
        if (total < 5) return 0;       // Unranked — need at least 5 decisions
        if (accuracyBps >= 7500) return 4; // Axiom
        if (accuracyBps >= 6000) return 3; // Gold
        if (accuracyBps >= 4000) return 2; // Silver
        return 1;                          // Bronze
    }

    function getReputation(bytes32 agentId) external view returns (ReputationScore memory) {
        return reputations[agentId];
    }

    // Fee coefficient: base_fee × (this / 100) = actual fee
    // Unranked=100 Bronze=150 Silver=250 Gold=500 Axiom=800
    function getFeeCoefficient(bytes32 agentId) external view returns (uint256) {
        uint8 tier = reputations[agentId].tier;
        if (tier == 4) return 800;
        if (tier == 3) return 500;
        if (tier == 2) return 250;
        if (tier == 1) return 150;
        return 100;
    }

    function getDecision(bytes32 decisionHash) external view returns (Decision memory) {
        return decisions[decisionHash];
    }

    function getAgentHistory(bytes32 agentId) external view returns (bytes32[] memory) {
        return agentDecisions[agentId];
    }
}
