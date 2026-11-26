import type { NextConfig } from "next";

/** `npm run build:app` makes the plain files the phone apps carry inside them. */
const forApp = process.env.APP_BUILD === "1";

/** Sent with every page of the website. The camera stays allowed for the site itself. */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Keeps the build rooted in this folder even when a parent folder has its
  // own lockfile.
  outputFileTracingRoot: __dirname,
  ...(forApp
    ? {
        output: "export" as const,
        // The API routes (route.ts) stay on the website. Only .tsx pages go in the app.
        pageExtensions: ["tsx", "jsx", "js"],
      }
    : {
        headers: async () => [{ source: "/:path*", headers: SECURITY_HEADERS }],
      }),
};

export default nextConfig;
