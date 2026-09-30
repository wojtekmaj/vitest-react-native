import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { mockSuffix, presetApiPrefix } from './preset.js';
import { findPackageDirectory, readPackageManifest } from './resolve.js';
import { transformNative } from './transform.js';

import type { LoadHookSync } from 'node:module';
import type { NativeRuntime } from './runtime-types.js';

/**
 * Supplies virtual native mocks and Babel-compiled sources to Node's synchronous loader.
 */
export function createLoadHook(runtime: NativeRuntime): LoadHookSync {
  const { root, options, compilerDirectories, nativeSetupFiles, loadedFiles } = runtime;
  const packageCache = new Map<string, boolean>();

  return (url, context, nextLoad) => {
    if (url.startsWith(presetApiPrefix)) {
      const parent = decodeURIComponent(url.slice(presetApiPrefix.length));

      return {
        format: 'commonjs',
        shortCircuit: true,
        source: `module.exports = { jest: globalThis.__vitestReactNative.createPresetApi(${JSON.stringify(parent)}) };`,
      };
    }

    if (!url.startsWith('file:')) {
      return nextLoad(url, context);
    }

    const filename = fileURLToPath(url);

    // Compiler plugins must load normally to avoid invoking Babel recursively
    if (compilerDirectories.some((directory) => filename.startsWith(`${directory}/`))) {
      return nextLoad(url, context);
    }

    if (filename.endsWith(mockSuffix)) {
      loadedFiles.add(filename);

      return {
        format: 'commonjs',
        shortCircuit: true,
        source: `module.exports = globalThis.__vitestReactNative.getMock(${JSON.stringify(filename.slice(0, -mockSuffix.length))});`,
      };
    }

    const normalized = filename.replaceAll('\\', '/');
    const packageDirectory = findPackageDirectory(filename);
    let nativePackage = false;

    // Inspect each package once; native libraries frequently ship raw source
    if (packageDirectory) {
      if (!packageCache.has(packageDirectory)) {
        const manifest = readPackageManifest(packageDirectory);

        packageCache.set(
          packageDirectory,
          Boolean(
            options.transformPackages?.includes(manifest.name) ||
              manifest['react-native'] ||
              manifest.peerDependencies?.['react-native'] ||
              manifest.dependencies?.['react-native'] ||
              /^(?:react-native(?:-|$)|@react-navigation\/|@react-native-|@react-native\/(?:jest-preset|js-polyfills|virtualized-lists)$)/.test(
                manifest.name,
              ),
          ),
        );
      }

      nativePackage = packageCache.get(packageDirectory) ?? false;
    }

    const extraPackage = options.transformPackages?.some((name) =>
      normalized.includes(`/node_modules/${name}/`),
    );

    if (/\.(?:svg|png|jpe?g|gif|webp|avif|mp3|mp4|ttf|otf|woff2?)$/.test(filename)) {
      loadedFiles.add(filename);

      return {
        format: 'commonjs',
        shortCircuit: true,
        source: filename.endsWith('.svg')
          ? "module.exports = require('react-native').View;"
          : 'module.exports = 1;',
      };
    }

    const typescript = /\.tsx?$/.test(filename);

    if (
      (nativePackage || extraPackage || typescript || nativeSetupFiles.includes(filename)) &&
      /\.[cm]?[jt]sx?$/.test(filename)
    ) {
      loadedFiles.add(filename);

      return {
        format: 'commonjs',
        shortCircuit: true,
        source: transformNative(
          readFileSync(filename, 'utf8'),
          filename,
          root,
          options.babelPlugins,
        ),
      };
    }

    return nextLoad(url, context);
  };
}
