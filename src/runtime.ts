import { createRequire, registerHooks } from 'node:module';
import { dirname } from 'node:path';
import { createPathsMatcher, getTsconfig } from 'get-tsconfig';

import { createLoadHook } from './load-module.js';
import { configureNativePreset, installPresetApi } from './preset.js';
import { createPackageResolver, getExtensions } from './resolve.js';
import { createResolveHook } from './resolve-module.js';

import type { NativeResolver, NativeRuntime } from './runtime-types.js';
import type { RuntimeOptions } from './types.js';

/**
 * Creates worker-local hooks, native mocks and module instances.
 * Hooks must be active before evaluating the official preset or any vendor setup.
 * The returned disposer unregisters hooks and releases compiled modules after the test file.
 */
export function installRuntime(root: string, options: RuntimeOptions): () => void {
  const require = createRequire(`${root}/package.json`);
  const nativeResolver: NativeResolver | undefined = options.nativeResolver
    ? require(options.nativeResolver)
    : undefined;
  const sharedModules = new Map(
    ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-native'].map((specifier) => [
      specifier,
      require.resolve(specifier),
    ]),
  );

  /**
   * Optional renderers share the app's module instances when installed.
   * Utility tests only need React and React Native itself.
   */
  for (const specifier of [
    '@testing-library/react-native',
    '@testing-library/react-native/pure',
    'test-renderer',
  ]) {
    try {
      sharedModules.set(specifier, require.resolve(specifier));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') {
        throw error;
      }
    }
  }

  const tsconfig = options.tsconfigPaths ? getTsconfig(root) : undefined;
  const matchTsconfigPaths = tsconfig ? (createPathsMatcher(tsconfig) ?? undefined) : undefined;

  const nativeRoot = dirname(require.resolve('react-native/package.json'));
  const extensions = getExtensions(options.platform ?? 'ios');
  const compilerDirectories = (options.babelPlugins ?? []).map((name) =>
    dirname(require.resolve(name)),
  );
  const nativeSetupFiles = (options.nativeSetupFiles ?? []).map((file) => require.resolve(file));
  const factories = installPresetApi();
  const loadedFiles = new Set<string>();

  const runtime: NativeRuntime = {
    root,
    options,
    require,
    sharedModules,
    nativeRoot,
    packageResolver: createPackageResolver(require),
    extensions,
    nativeResolver,
    matchTsconfigPaths,
    compilerDirectories,
    nativeSetupFiles,
    factories,
    loadedFiles,
  };

  // Synchronous hooks also cover require calls made by the native preset itself
  const hooks = registerHooks({
    resolve: createResolveHook(runtime),
    load: createLoadHook(runtime),
  });

  configureNativePreset(require);

  for (const setupFile of nativeSetupFiles) {
    require(setupFile);
  }

  return () => {
    hooks.deregister();

    for (const filename of loadedFiles) {
      delete require.cache[filename];
    }
  };
}
