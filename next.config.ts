import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['recharts', 'lucide-react'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
