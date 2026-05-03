// File: agents/research/compute-inference.ts
// Uses 0G Compute Network for verifiable LLM inference
// Documentation: https://github.com/0gfoundation/0g-serving-broker

import { createZGComputeNetworkBroker } from "@0gfoundation/0g-compute-ts-sdk";
import { ethers } from "ethers";

export async function runDecentralizedInference(params: {
  prompt: string;
  signer: ethers.Signer;
}): Promise<{ response: string; providerAddress: string; model: string }> {
  // 0. Intercept the 0G broker's internal cachedFee fallback — if the broker
  //    cannot fetch the real unsettled fee it logs a [DEBUG] warning and silently
  //    continues with stale data. We enforce strict no-fallback: throw instead.
  const _origError = console.error.bind(console)
  const _origDebug = console.debug?.bind(console)
  const feeInterceptor = (method: (...args: any[]) => void) => (...args: any[]) => {
    const msg = args.join(' ')
    if (msg.includes('cachedFee fallback') || msg.includes('Failed to fetch unsettled fee')) {
      method(...args) // still log so it's visible
      throw new Error('0G_REAL_FEE_REQUIRED: 0G broker could not fetch live unsettled fee. No fallback allowed.')
    }
    method(...args)
  }
  console.error = feeInterceptor(_origError) as any
  if (console.debug) console.debug = feeInterceptor(_origDebug!) as any
  // Also intercept console.log — 0G broker logs cachedFee warning via log too
  const _origLog = console.log.bind(console)
  console.log = feeInterceptor(_origLog) as any

  try {
  // 1. Initialize the broker connected to 0G EVM
  const ogProvider = new ethers.JsonRpcProvider(process.env.OG_EVM_RPC!);
  const ogSigner = (params.signer as ethers.Wallet).connect(ogProvider);
  const broker = await createZGComputeNetworkBroker(ogSigner as any);

  // 2. List available inference services
  const services = await broker.inference.listService();
  const chatServices = services
    .filter((s: any) => s.serviceType.toLowerCase().includes("chat") || s.serviceType === "")
    .sort(() => Math.random() - 0.5); // Shuffle to avoid bad nodes

  console.log(`[0G Compute] Found ${chatServices.length} potential providers in network.`);

  if (chatServices.length === 0) {
    throw new Error("0G_NETWORK_ERROR: No active LLM providers found in the 0G Compute registry.");
  }

  // 3. Initialize Ledger — only on first-ever run.
  //    OG_LEDGER_INITIALIZED=true in .env skips addLedger to prevent
  //    on-chain 'out of gas' reverts when ledger already exists.
  _origLog(`[0G Compute] Checking Ledger status...`);
  if (process.env.OG_LEDGER_INITIALIZED !== 'true') {
    try {
      await broker.ledger.addLedger(1);
      await broker.ledger.depositFund(1);
      _origLog(`[0G Compute] Ledger created and funded.`);
    } catch (e: any) {
      // Ledger likely already exists — this is expected on 2nd+ run
      // Set OG_LEDGER_INITIALIZED=true in .env to skip this permanently
      _origLog(`[0G Compute] Ledger init skipped (already exists): ${e.message?.slice(0, 60)}`);
    }
  } else {
    _origLog(`[0G Compute] Ledger already initialized — skipping addLedger.`);
  }

  // 4. Try more providers to increase success rate (up to 10)
  for (const service of chatServices.slice(0, 10)) { 
    const providerAddress = service.provider;
    try {
      console.log(`[0G Compute] Attempting provider: ${providerAddress}...`);
      
      const { endpoint, model: metaModel } = await broker.inference.getServiceMetadata(providerAddress);
      
      // Some providers have bad metadata; try the metadata model first, then common aliases
      const modelsToTry = [metaModel, "llama3", "gpt-3.5-turbo", "mistral"];
      
      for (const model of modelsToTry) {
        if (!model) continue;
        try {
          const headers = await broker.inference.getRequestHeaders(providerAddress, params.prompt);
          const body = JSON.stringify({
            model: model,
            messages: [{ role: "user", content: params.prompt }],
          });

          // Normalize endpoint: ensure it ends with /v1/chat/completions correctly
          const baseUrl = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
          const targetPath = baseUrl.includes("/v1") ? "/chat/completions" : "/v1/chat/completions";
          const fullUrl = `${baseUrl}${targetPath}`;

          console.log(`[0G Debug] Sending to ${fullUrl}`);
          console.log(`[0G Debug] Headers:`, JSON.stringify(headers));
          console.log(`[0G Debug] Body:`, body);

          const response = await fetch(fullUrl, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json", 
              "Accept": "application/json",
              ...(headers as any) 
            },
            body: body,
            signal: AbortSignal.timeout(10000)
          });

          if (response.ok) {
            const result = await response.json();
            const content = result.choices[0].message.content;
            const chatID = response.headers.get("ZG-Res-Key") || result.id;
            broker.inference.processResponse(providerAddress, chatID, JSON.stringify(result.usage)).catch(() => {});
            return { response: content, providerAddress, model };
          } else {
            const errBody = await response.text();
            console.warn(`[0G Compute] Provider ${providerAddress} (Model: ${model}) → HTTP ${response.status}: ${errBody.slice(0, 200)}`);
            // If flagged for looping content, skip remaining models for this provider
            if (errBody.includes('looping content')) {
              console.warn(`[0G Compute] Provider ${providerAddress} flagged for looping — skipping remaining models.`);
              break;
            }
          }
        } catch (innerE: any) {
          console.warn(`[0G Compute] Model ${model} failed: ${innerE.message}`);
          continue; 
        }
      } // end models loop
    } catch (e: any) {
      console.warn(`[0G Compute] Provider skip: ${e.message}`);
    }
  } // end providers loop

  // Final Error if all providers fail
  throw new Error("0G_NETWORK_UNAVAILABLE: All discovered 0G Compute providers failed or returned unsupported endpoints.");

  } finally {
    // Always restore original console methods
    console.error = _origError as any
    console.log   = _origLog   as any
    if (_origDebug) console.debug = _origDebug as any
  }
}
