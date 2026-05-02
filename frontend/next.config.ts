import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  env: {
    NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS:   process.env.AGENT_REGISTRY_ADDRESS ?? '',
    NEXT_PUBLIC_REPUTATION_LEDGER_ADDRESS: process.env.REPUTATION_LEDGER_ADDRESS ?? '',
    NEXT_PUBLIC_RPC_URL:                  process.env.RPC_URL ?? '',
  },
};

export default nextConfig;
