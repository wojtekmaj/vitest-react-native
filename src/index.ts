import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getExtensions } from './resolve.js';
import { transformApplication } from './transform.js';
import { transformNativeMocks } from './transform-native-mocks.js';

import type { Plugin, ResolvedConfig } from 'vite';
import type { ViteUserConfig } from 'vitest/config';
import type { ReactNativeOptions } from './types.js';

export type { ReactNativeOptions } from './types.js';

/**
 * Configures Vitest to run native component tests without an emulator or a DOM.
 */
export default function reactNative(options: ReactNativeOptions = {}): Plugin {
  let root = process.cwd();

  const setupFile = fileURLToPath(new URL('./setup.js', import.meta.url));

  return {
    name: '@wojtekmaj/vitest-react-native',
    enforce: 'pre',
    /**
     * Vite handles application imports; Node hooks handle external native packages.
     * Keep those packages external so their CommonJS preset mocks remain effective.
     */
    config(config): ViteUserConfig {
      return {
        resolve: {
          conditions: ['react-native'],
          dedupe: ['react', 'react-native', '@testing-library/react-native', 'test-renderer'],
          mainFields: ['react-native', 'main'],
          extensions: getExtensions(options.platform ?? 'ios'),
        },
        ssr: {
          resolve: { conditions: ['react-native'], mainFields: ['react-native', 'main'] },
        },
        test: {
          environment: 'node',
          pool: 'forks',
          setupFiles: [setupFile],
          server: {
            deps: {
              external: [
                /node_modules[\\/](?:@react-native(?:-[^/]+)?[\\/]|@react-navigation[\\/]|(?:@[^/]+[\\/])?[^/]*react-native[^/]*[\\/])/,
                ...(options.transformPackages ?? []).map(
                  (name) =>
                    new RegExp(`/node_modules/${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`),
                ),
              ],
            },
          },
          env: {
            VITEST_REACT_NATIVE_OPTIONS: JSON.stringify(options),
            VITEST_REACT_NATIVE_ROOT: config.root ?? process.cwd(),
          },
        },
      };
    },
    /**
     * Pass final resolution settings to each isolated worker, and run native setup
     * before application setup even when the user supplied additional setup files.
     */
    configResolved(config: ResolvedConfig & Pick<ViteUserConfig, 'test'>) {
      root = config.root;

      const test = config.test;

      if (test) {
        const setupFiles = [test.setupFiles ?? []].flat();

        test.env = {
          ...test.env,
          VITEST_REACT_NATIVE_ROOT: root,
          VITEST_REACT_NATIVE_OPTIONS: JSON.stringify({
            ...options,
            aliases: config.resolve.alias.filter((alias) => typeof alias.find === 'string'),
            tsconfigPaths:
              'tsconfigPaths' in config.resolve && config.resolve.tsconfigPaths === true,
          }),
        };
        test.setupFiles = [setupFile, ...setupFiles.filter((file) => file !== setupFile)];
        test.sequence = { ...test.sequence, setupFiles: 'list' };
      }
    },
    // Application transforms retain ESM so Vitest can hoist vi.mock calls
    transform(code, id) {
      if (options.babelPlugins?.length && !id.includes('/node_modules/') && /\.[jt]sx?$/.test(id)) {
        return transformApplication(code, id, root, options.babelPlugins);
      }

      if (!id.includes('/node_modules/') && /\.[jt]sx?$/.test(id)) {
        return transformNativeMocks(code, id);
      }
    },
    async resolveId(source, importer) {
      if (/\.(?:svg|png|jpe?g|gif|webp|avif|mp3|mp4|ttf|otf|woff2?)$/.test(source)) {
        return `\0vitest-react-native:asset:${source}`;
      }

      if (
        importer &&
        !importer.startsWith(`${root}/`) &&
        /^(?:@[^/]+\/)?[^./][^:]*$/.test(source)
      ) {
        // Linked packages should use their own dependencies before the app's peers
        const resolved = await this.resolve(source, importer, { skipSelf: true });

        return resolved ?? this.resolve(source, resolve(root, 'package.json'), { skipSelf: true });
      }
    },
    load(id) {
      if (id.startsWith('\0vitest-react-native:asset:')) {
        return id.endsWith('.svg')
          ? "export { View as default } from 'react-native';"
          : 'export default 1;';
      }
    },
  };
}
