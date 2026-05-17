import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Opt out of bundling for pdf-parse to prevent native module crashes
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
