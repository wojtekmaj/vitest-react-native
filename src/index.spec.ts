import { describe, expect, it } from 'vitest';
import { resolveConfig } from 'vite';

import reactNative from './index.js';

import type { ResolvedConfig } from 'vite';
import type { ViteUserConfig } from 'vitest/config';
import type { ReactNativeOptions } from './types.js';

async function resolveNativeConfig(
  options: ReactNativeOptions = {},
  test: ViteUserConfig['test'] = {},
): Promise<ResolvedConfig & Pick<ViteUserConfig, 'test'>> {
  const config: ViteUserConfig = {
    plugins: [reactNative(options)],
    test,
  };

  return resolveConfig({ ...config, configFile: false }, 'serve');
}

describe('reactNative()', () => {
  it('should configure native resolution and the Node test environment by default', async () => {
    const config = await resolveNativeConfig();

    expect(config.resolve.conditions).toContain('react-native');
    expect(config.resolve.mainFields).toEqual(['react-native', 'main']);
    expect(config.resolve.extensions.slice(0, 3)).toEqual(['.ios.js', '.native.js', '.js']);
    expect(config.resolve.dedupe).toContain('react');
    expect(config.resolve.dedupe).toContain('react-native');
    expect(config.test).toMatchObject({ environment: 'node', pool: 'forks' });
  });

  it('should pass explicit platform and integration options to the worker', async () => {
    const options: ReactNativeOptions = {
      platform: 'android',
      babelPlugins: ['react-native-worklets/plugin'],
      nativeResolver: 'react-native-reanimated/jest/resolver',
      nativeSetupFiles: ['./native.setup.ts'],
      transformPackages: ['uncompiled-package'],
    };
    const config = await resolveNativeConfig(options);
    const serialized = config.test?.env?.VITEST_REACT_NATIVE_OPTIONS;

    expect(config.resolve.extensions[0]).toBe('.android.js');
    expect(JSON.parse(serialized ?? '')).toMatchObject(options);
    expect(config.test?.env?.VITEST_REACT_NATIVE_ROOT).toBe(config.root);
  });

  it('should preserve application setup files and environment variables', async () => {
    const config = await resolveNativeConfig(
      {},
      {
        setupFiles: ['./first.setup.ts', './second.setup.ts'],
        env: { APP_TEST_VALUE: 'test value' },
      },
    );

    expect(config.test?.setupFiles).toEqual([
      expect.stringMatching(/\/setup\.js$/),
      './first.setup.ts',
      './second.setup.ts',
    ]);
    expect(config.test?.env?.APP_TEST_VALUE).toBe('test value');
  });

  it('should run native setup first with sequential setup files', async () => {
    const config = await resolveNativeConfig(
      {},
      {
        setupFiles: './application.setup.ts',
        sequence: { setupFiles: 'parallel' },
      },
    );

    expect(config.test?.setupFiles).toEqual([
      expect.stringMatching(/\/setup\.js$/),
      './application.setup.ts',
    ]);
    expect(config.test?.sequence?.setupFiles).toBe('list');
  });
});
