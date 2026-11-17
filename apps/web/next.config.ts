import type { NextConfig } from 'next';
import { resolve } from 'node:path';

const config: NextConfig = {
  transpilePackages: ['@aether-dom/schema'],
  poweredByHeader: false,
  outputFileTracingRoot: resolve(__dirname, '../..'),
  outputFileTracingIncludes: {
    '/welcome': ['../../landing-page/index.html'],
    '/welcome-assets/*': [
      '../../landing-page/styles.css', '../../landing-page/app.js', '../../landing-page/cdom-section.js',
      '../../landing-page/assets/mark.svg', '../../landing-page/assets/fonts/manrope.woff2',
      '../../landing-page/assets/afterlight-world.png', '../../landing-page/assets/folio-world.png',
    ],
  },
};
export default config;
