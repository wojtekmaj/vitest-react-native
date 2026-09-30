import { defineConfig } from 'vitest/config';
import reactNative from '@wojtekmaj/vitest-react-native';

export default defineConfig({
  root: './src',
  plugins: [
    reactNative({ platform: process.env.NATIVE_PLATFORM === 'android' ? 'android' : 'ios' }),
  ],
});
