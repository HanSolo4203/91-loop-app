import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Turbopack uses this project as the root when multiple lockfiles exist
  turbopack: {
    root: __dirname,
  },
  // Reduce noisy sourcemap warnings from third-party bundles
  productionBrowserSourceMaps: false,
  images: {
    // Default in Next 16 is [75]. Explicit qualities used by <Image quality={…}>.
    qualities: [75, 85, 90],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bwuslachnnapmtenbdgq.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
