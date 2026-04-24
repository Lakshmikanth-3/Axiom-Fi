# FEEDBACK.md — Uniswap API & Developer Platform Experience

## Integration built
A multi-agent trading terminal called **Axiom**. We integrated the Uniswap Trading API (v1) into our **Executor Agent** to fetch real-time quotes and generate swap calldata for on-chain execution. This allows our agentic system to settle trades autonomously while maintaining verifiable reputation based on the outcomes of these swaps.

## What worked well
- The **Universal Router** integration via the API is powerful and simplifies the process of getting a single calldata blob for complex routes.
- The **Permit2** support in the `/quote` and `/swap` endpoints is a great addition for gas-efficient and secure agentic workflows.
- Response times for the `/quote` endpoint were consistently fast.

## Bugs or unexpected behavior
- Encountered some issues with `permitData` serialization when using certain ethers.js versions, specifically around the `domain` and `types` mapping for `signTypedData`.
- Occasionally saw `500 Internal Server Error` during peak times when requesting quotes for very low-liquidity pairs on Base.

## Documentation gaps
- More examples for **Node.js/TypeScript** specifically regarding the `permit2` flow and how to correctly sign the `permitData` would be helpful.
- The documentation on `autoSlippage` behavior could be more detailed (e.g., what are the exact thresholds for `AGGRESSIVE` vs `DEFAULT`).

## DX friction
- Transitioning from a classic `approve` flow to the Uniswap Trading API's preference for `Permit2` has a learning curve, especially for developers used to simpler swap implementations.
- API Key management and the dashboard for monitoring usage could be improved with more granular analytics.

## Missing endpoints or features
- An endpoint to fetch **historical execution quality** for a specific swapper address across multiple `requestId`s would be useful for building reputation systems like Axiom.
- Built-in **simulation** as a first-class parameter in the `/swap` endpoint that returns not just success/fail but also expected output vs. real pool state at that moment.
