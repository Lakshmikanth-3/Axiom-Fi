import { createX402Client } from "x402";

export async function getX402Client(wallet: any, facilitatorUrl: string) {
  return createX402Client({
    wallet,
    facilitatorUrl,
  });
}
