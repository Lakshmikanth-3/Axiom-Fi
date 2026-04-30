// File: agents/research/compute-inference.ts
// Uses 0G Compute Network for verifiable LLM inference
// Documentation: https://github.com/0gfoundation/0g-serving-broker

import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import { ethers } from "ethers";

export async function runDecentralizedInference(params: {
  prompt: string;
  signer: ethers.Signer;
}): Promise<{ response: string; providerAddress: string; model: string }> {
  // 1. Initialize the broker connected to 0G EVM
  const ogProvider = new ethers.JsonRpcProvider(process.env.OG_EVM_RPC!);
  const ogSigner = (params.signer as ethers.Wallet).connect(ogProvider);
  const broker = await createZGComputeNetworkBroker(ogSigner as any);

  // 2. List available inference services
  const services = await broker.inference.listService();
  const chatServices = services.filter((s: any) => s.serviceType === "chatbot");

  if (chatServices.length === 0) throw new Error("No 0G Compute providers available");

  // 3. Select the first available provider
  const service = chatServices[0];
  const providerAddress = service.provider;

  // 4. Initialize Ledger Account and Deposit (0G Compute requires this on first run)
  try {
    console.log(`[Research] Initializing 0G Compute Ledger account...`);
    await broker.ledger.addLedger(3);
    await broker.ledger.depositFund(3);
  } catch (e: any) {
    if (!e.message.includes("already exists")) {
      console.log(`[Research] Ledger init notice: ${e.message}`);
    }
  }

  // 5. Get metadata (endpoint and model name)
  const { endpoint, model } = await broker.inference.getServiceMetadata(providerAddress);

  // 6. Get billing headers for the request
  const headers = await broker.inference.getRequestHeaders(providerAddress, params.prompt);

  // 7. Execute request using standard fetch
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

  // 8. Process response
  const chatID = response.headers.get("ZG-Res-Key") || result.id;
  await broker.inference.processResponse(providerAddress, chatID, JSON.stringify(result.usage));

  return {
    response: content,
    providerAddress,
    model,
  };
}
