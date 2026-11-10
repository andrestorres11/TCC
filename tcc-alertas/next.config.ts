import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App con sesión/RLS: render dinámico estándar (sin cacheComponents).
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
