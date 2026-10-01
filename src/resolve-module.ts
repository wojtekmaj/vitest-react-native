import { createRequire, isBuiltin } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { actualPrefix, mockSuffix, presetApiPrefix } from './preset.js';
import { resolveFile } from './resolve.js';

import type { ResolveHookContext, ResolveHookSync } from 'node:module';
import type { PackageResolver } from './resolve.js';
import type { NativeRuntime } from './runtime-types.js';

/**
 * Selects Metro's legacy entry fields and file variants without relying on Node's main.
 * Export-map resolution happens first in resolvePackageRequest.
 */
function resolveLegacyPackage(
  request: string,
  directory: string | undefined,
  extensions: string[],
  packageResolver: PackageResolver,
): string | undefined {
  if (!directory) {
    return;
  }

  const name = request.match(/^(?:@[^/]+\/)?[^/]+/)?.[0];
  const subpath = request.slice(name?.length ?? 0);

  if (subpath) {
    return resolveFile(resolve(directory, `.${subpath}`), extensions);
  }

  const manifest = packageResolver.readPackageManifest(directory);
  const entry =
    typeof manifest['react-native'] === 'string'
      ? manifest['react-native']
      : (manifest.main ?? 'index');
  const filename = resolve(directory, entry);

  return (
    resolveFile(filename.replace(/\.[jt]sx?$/, ''), extensions) ?? resolveFile(filename, extensions)
  );
}

/**
 * Resolves Node imports using Metro's platform rules and the worker's native mocks.
 */
export function createResolveHook(runtime: NativeRuntime): ResolveHookSync {
  const {
    root,
    options,
    require,
    sharedModules,
    nativeRoot,
    packageResolver,
    extensions,
    nativeResolver,
    matchTsconfigPaths,
    factories,
    loadedFiles,
  } = runtime;
  const resolvingFallbacks = new Set<string>();

  /**
   * Export maps select exact files. Only legacy resolution applies native main
   * fields and platform extensions, including when Node's main entry is absent.
   */
  function resolvePackageRequest(
    request: string,
    parent: string,
    context: ResolveHookContext,
    nextResolve: Parameters<ResolveHookSync>[2],
  ): ReturnType<ResolveHookSync> {
    const directory = packageResolver.resolvePackageDirectory(request, parent);
    const manifest = directory ? packageResolver.readPackageManifest(directory) : undefined;
    const nativeContext = {
      ...context,
      conditions: [
        'react-native',
        ...(loadedFiles.has(parent)
          ? ['require', ...[...context.conditions].filter((condition) => condition !== 'import')]
          : context.conditions),
      ],
    };
    let result: ReturnType<typeof nextResolve> | undefined;

    try {
      result = nextResolve(request, nativeContext);

      if (!result.url.startsWith('file:') || manifest?.exports != null) {
        return result;
      }
    } catch (error) {
      const fallbackKey = `${parent}:${request}`;

      if (
        request.startsWith('.') ||
        request.startsWith('/') ||
        resolvingFallbacks.has(fallbackKey)
      ) {
        throw error;
      }

      resolvingFallbacks.add(fallbackKey);

      try {
        /**
         * Synchronous CommonJS resolution keeps its original parent in nextResolve.
         * Re-enter from the selected package to resolve a linked caller's peer exports.
         * Resolve actual files here; the outer hook applies any mock afterwards.
         */
        if (directory && manifest?.exports != null) {
          try {
            const resolved = createRequire(resolve(directory, 'package.json')).resolve(
              actualPrefix + request,
            );

            return { url: pathToFileURL(resolved).href, shortCircuit: true };
          } catch {
            // Metro permits legacy resolution when no export target can be resolved
          }
        }

        const filename = resolveLegacyPackage(request, directory, extensions, packageResolver);

        if (filename) {
          return { url: pathToFileURL(filename).href, shortCircuit: true };
        }

        let resolved: string;

        try {
          resolved = createRequire(parent).resolve(actualPrefix + request);
        } catch {
          resolved = require.resolve(actualPrefix + request);
        }

        return { url: pathToFileURL(resolved).href, shortCircuit: true };
      } finally {
        resolvingFallbacks.delete(fallbackKey);
      }
    }

    const filename = resolveLegacyPackage(request, directory, extensions, packageResolver);

    return filename ? { url: pathToFileURL(filename).href, shortCircuit: true } : result;
  }

  return (specifier, context, nextResolve) => {
    const actual = specifier.startsWith(actualPrefix);

    let request = actual ? specifier.slice(actualPrefix.length) : specifier;

    const alias = options.aliases?.find(
      ({ find }) => request === find || request.startsWith(`${find}/`),
    );

    if (alias) {
      request = alias.replacement + request.slice(alias.find.length);
    }

    if (isBuiltin(request)) {
      return nextResolve(request, context);
    }

    const parent = context.parentURL?.startsWith('file:')
      ? fileURLToPath(context.parentURL)
      : `${root}/package.json`;

    if (request === '@jest/globals') {
      return {
        url: `${presetApiPrefix}${encodeURIComponent(parent)}`,
        shortCircuit: true,
      };
    }

    let filename: string | undefined;

    // Vite's TypeScript path setting must also apply inside native CommonJS code
    for (const candidate of matchTsconfigPaths?.(request) ?? []) {
      filename = resolveFile(candidate, extensions);

      if (filename) {
        break;
      }
    }

    if (!filename) {
      if (sharedModules.has(request)) {
        filename = sharedModules.get(request);
      } else if (nativeResolver && request.startsWith('.')) {
        filename = nativeResolver(request, {
          basedir: dirname(parent),
          extensions,
          defaultResolver(specifier, resolverOptions) {
            const resolved = resolveFile(
              resolve(resolverOptions.basedir, specifier),
              resolverOptions.extensions,
            );

            if (!resolved) {
              throw new Error(
                `Cannot resolve native module ${specifier} from ${resolverOptions.basedir}`,
              );
            }

            return resolved;
          },
        });
      } else if (request.startsWith('react-native/')) {
        const subpath = request.slice('react-native/'.length);

        filename = resolveFile(
          resolve(nativeRoot, subpath === 'setup-env' ? 'src/setup-env' : subpath),
          extensions,
        );
      } else if (request.startsWith('.') || request.startsWith('/')) {
        filename = resolveFile(resolve(dirname(parent), request), extensions);

        if (!filename && request.endsWith('.js')) {
          filename = resolveFile(resolve(dirname(parent), request.slice(0, -3)), extensions);
        }
      }
    }

    const result = filename
      ? { url: pathToFileURL(filename).href, shortCircuit: true }
      : resolvePackageRequest(request, parent, context, nextResolve);

    // Preset factories are lazy, and requireActual bypasses their virtual modules
    if (!actual && result.url.startsWith('file:')) {
      const resolved = fileURLToPath(result.url);

      if (factories.has(resolved)) {
        return { url: pathToFileURL(resolved + mockSuffix).href, shortCircuit: true };
      }
    }

    return result;
  };
}
