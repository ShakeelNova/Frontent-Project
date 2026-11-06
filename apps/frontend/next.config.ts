import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    // npm workspaces hoist node_modules (incl. `next`) to the repo root;
    // Turbopack must resolve from there, not from apps/frontend alone.
    root: path.resolve(configDir, "../.."),
  },
  // Baseline hardening. Intentionally no X-Frame-Options/CSP frame-ancestors:
  // the app is designed to be embedded by the hosting/preview proxy.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
  // Frontend-only: no API route handlers / server actions duplicate backend
  // business APIs. All persisted operations go through the backend REST API
  // at NEXT_PUBLIC_API_BASE_URL.
};

export default nextConfig;
