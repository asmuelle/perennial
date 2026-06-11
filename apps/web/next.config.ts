import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@perennial/core', '@perennial/pipeline', '@perennial/fixtures'],
};

export default nextConfig;
