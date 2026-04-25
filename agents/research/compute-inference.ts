// File: agents/research/compute-inference.ts
// Uses 0G Compute Network for verifiable LLM inference
// Documentation: https://github.com/0gfoundation/0g-serving-broker

import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { ethers } from "ethers";

export async function runDecentralizedInference(params: {
  prompt: string;
  signer: ethers.Signer;
}): Promise<{ response: string; providerAddress: string; model: string }> {
  // 1. Initialize the broker
  const broker = await createZGComputeNetworkBroker(params.signer as any);

  // 2. List available inference services
  const services = await broker.inference.listService();
  const chatServices = services.filter(s => s.serviceType === "chatbot");

  if (chatServices.length === 0) {
    throw new Error("No 0G Compute providers available");
  }

  // 3. Select the first available provider
  const service = chatServices[0];
  const providerAddress = service.provider;

  // 4. Get metadata (endpoint and model name)
  const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);

  // 5. Get billing headers for the request
  // This automatically handles account creation/top-up if funds are available in the ledger
  const headers = await broker.inference.getRequestHeaders(providerAddress, params.prompt);

  // 6. Execute request using standard fetch (OpenAI compatible)
  const response = await fetch(`${endpoint}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers as any),
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: "user", content: params.prompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`0G Inference Request Failed: ${response.statusText} - ${errorBody}`);
  }

  const result = await response.json();
  const content = result.choices[0].message.content;

  // 7. Process response (caches fees and verifies signature if the service is verifiable)
  const chatID = response.headers.get("ZG-Res-Key") || result.id;
  await broker.inference.processResponse(providerAddress, chatID, JSON.stringify(result.usage));

  return {
    response: content,
    providerAddress,
    model,
  };
}
