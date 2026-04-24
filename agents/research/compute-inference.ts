// File: agents/research/compute-inference.ts
// Uses 0G Compute Network for verifiable LLM inference

import { ZGServingUserBrokerBase } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";

export async function runDecentralizedInference(params: {
  prompt: string;
  signer: ethers.Signer;
}): Promise<{ response: string; providerAddress: string; model: string }> {
  if (!process.env.OG_EVM_RPC) throw new Error("MISSING_VALUE: OG_EVM_RPC");

  // List available inference providers
  const broker = await ZGServingUserBrokerBase.createZGServingUserBroker(
    params.signer,
    { endpoint: process.env.OG_EVM_RPC }
  );

  // Get list of providers — pick one with best price/availability
  const providers = await (broker as any).listServices();
  const chatProviders = providers.filter(
    (p: any) => p.serviceType === "chatbot" && p.active
  );

  if (chatProviders.length === 0) {
    throw new Error("No 0G Compute providers available — check OG_EVM_RPC");
  }

  // Select cheapest provider (input tokens)
  const provider = chatProviders.sort(
    (a: any, b: any) =>
      Number(a.inputPrice) - Number(b.inputPrice)
  )[0];

  // Create account with provider and deposit compute credits
  await (broker as any).addOrUpdateService(
    provider.provider,
    provider.name,
    { maxInputTokens: 4096, maxOutputTokens: 1024 }
  );

  // Execute inference request
  const result = await (broker as any).requestService(
    provider.provider,
    provider.name,
    {
      messages: [{ role: "user", content: params.prompt }],
    }
  );

  return {
    response: result.choices[0].message.content,
    providerAddress: provider.provider,
    model: provider.model,
  };
}
