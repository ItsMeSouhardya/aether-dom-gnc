import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@aether-dom/schema'],
  poweredByHeader: false,
};
export default config;
