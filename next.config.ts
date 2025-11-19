import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Turbopack uses this project as the root when multiple lockfiles exist
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bwuslachnnapmtenbdgq.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
