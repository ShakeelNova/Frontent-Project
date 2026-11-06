import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    // npm workspaces hoist node_modules (incl. `next`) to the repo root;
    // Turbopack must resolve from there, not from apps/frontend alone.
    root: path.resolve(configDir, "../.."),
  },
  // Frontend-only: no API route handlers / server actions duplicate backend
  // business APIs. All persisted operations go through the backend REST API
  // at NEXT_PUBLIC_API_BASE_URL.
};

export default nextConfig;
