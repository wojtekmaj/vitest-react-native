import type { PackageResolver } from './resolve.js';
import type { RuntimeOptions } from './types.js';

export type NativeResolverOptions = {
  basedir: string;
  extensions: string[];
  defaultResolver: (request: string, options: NativeResolverOptions) => string;
};

export type NativeResolver = (request: string, options: NativeResolverOptions) => string;

/**
 * Worker-owned resources shared by the native resolution and source-loading hooks.
 */
export type NativeRuntime = {
  root: string;
  options: RuntimeOptions;
  require: NodeJS.Require;
  sharedModules: Map<string, string>;
  nativeRoot: string;
  packageResolver: PackageResolver;
  extensions: string[];
  nativeResolver?: NativeResolver;
  matchTsconfigPaths?: (specifier: string) => string[];
  compilerDirectories: string[];
  nativeSetupFiles: string[];
  factories: Map<string, () => unknown>;
  loadedFiles: Set<string>;
};
