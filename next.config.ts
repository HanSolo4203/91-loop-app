import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Turbopack uses this project as the root when multiple lockfiles exist
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
