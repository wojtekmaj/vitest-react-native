import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import reactNative from '@wojtekmaj/vitest-react-native/testing-library';

export default defineConfig({
  plugins: [
    reactNative({
      transformPackages: ['@vitest-native-fixture/uncompiled'],
      babelPlugins: ['react-native-worklets/plugin'],
      nativeResolver: 'react-native-reanimated/jest/resolver',
      nativeSetupFiles: ['./native.setup.ts', 'react-native-gesture-handler/jestSetup.js'],
      platform: process.env.NATIVE_PLATFORM === 'android' ? 'android' : 'ios',
    }),
    react(),
  ],
  test: {
    include: ['src/**/*.spec.{ts,tsx}'],
    setupFiles: ['vitest.setup.ts'],
    maxWorkers: 2,
    watch: false,
  },
});
