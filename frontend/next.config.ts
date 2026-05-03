import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  serverExternalPackages: [
    "ethers",
    "dotenv",
    "grammy",
    "@0gfoundation/0g-storage-ts-sdk",
    "@0gfoundation/0g-compute-ts-sdk",
  ],
  experimental: {},
  env: {
    NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS:   process.env.AGENT_REGISTRY_ADDRESS ?? '',
    NEXT_PUBLIC_REPUTATION_LEDGER_ADDRESS: process.env.REPUTATION_LEDGER_ADDRESS ?? '',
    NEXT_PUBLIC_RPC_URL:                  process.env.RPC_URL ?? '',
  },
};

export default nextConfig;
