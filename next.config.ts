import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keeps the build rooted in this folder even when a parent folder has its
  // own lockfile.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
