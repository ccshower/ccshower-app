import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      /** Fotos da visita (ate 8 MB cada) — evita Failed to fetch no upload */
      bodySizeLimit: "32mb",
    },
  },
};

export default nextConfig;
