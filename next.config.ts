import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/interview-practice-platform',
  assetPrefix: '/interview-practice-platform/',
};

export default nextConfig;
