import { configDefaults, defineConfig } from 'vitest/config';

import reactNative from './dist/testing-library.js';

import type { ViteUserConfig } from 'vitest/config';

const config: ViteUserConfig = defineConfig({
  plugins: [
    reactNative({ platform: process.env.NATIVE_PLATFORM === 'android' ? 'android' : 'ios' }),
  ],
  test: {
    exclude: [...configDefaults.exclude, 'sample/**', 'test/fixtures/**'],
    watch: false,
  },
});

export default config;
