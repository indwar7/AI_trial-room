import type { NextConfig } from "next";

/** `npm run build:app` makes the plain files the phone apps carry inside them. */
const forApp = process.env.APP_BUILD === "1";

const nextConfig: NextConfig = {
  // Keeps the build rooted in this folder even when a parent folder has its
  // own lockfile.
  outputFileTracingRoot: __dirname,
  ...(forApp && {
    output: "export" as const,
    // The API routes (route.ts) stay on the website. Only .tsx pages go in the app.
    pageExtensions: ["tsx", "jsx", "js"],
  }),
};

export default nextConfig;
