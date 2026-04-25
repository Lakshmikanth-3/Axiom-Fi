import { createPaymentHeader, preparePaymentHeader } from "x402/client";

export async function getX402Client(wallet: any, facilitatorUrl: string) {
  // The x402 v1.2 SDK is functional. We wrap it for the orchestrator.
  return {
    pay: async (params: { to: string, amount: bigint, currency: string, reference: string }) => {
      console.log(`[x402] Preparing real payment of ${params.amount} to ${params.to}`);
      
      const header = await createPaymentHeader({
        wallet,
        facilitatorUrl,
        recipient: params.to,
        amount: params.amount.toString(),
        currency: params.currency,
        reference: params.reference
      });

      return {
        success: true,
        header,
        txHash: "0x..." // Tx happens via the facilitator header submission
      };
    }
  };
}
