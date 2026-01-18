import type { NextConfig } from "next";

// For GitHub Pages we need basePath, for Vercel we don't
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const basePath = isGitHubPages ? '/interview-practice-platform' : '';

const nextConfig: NextConfig = {
  // Static export only for GitHub Pages, Vercel handles SSR natively
  ...(isGitHubPages ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },
  ...(basePath ? { basePath, assetPrefix: `${basePath}/` } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
