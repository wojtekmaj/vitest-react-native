import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

type PackageManifest = {
  name: string;
  main?: string;
  exports?: unknown;
  'react-native'?: string | Record<string, string | false>;
  peerDependencies?: Record<string, string>;
  dependencies?: Record<string, string>;
};

export function readPackageManifest(directory: string): PackageManifest {
  return JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) as PackageManifest;
}

/**
 * Tries platform, native and generic files within each of Metro's default extensions.
 * Keep JavaScript before TypeScript, even when only TypeScript has a platform variant.
 */
export function getExtensions(platform: string): string[] {
  return ['.js', '.jsx', '.json', '.ts', '.tsx']
    .flatMap((extension) =>
      [platform, 'native', ''].map((suffix) => (suffix ? `.${suffix}${extension}` : extension)),
    )
    .concat(['.mjs', '.cjs']);
}

/**
 * Locates a package independently of its main file, including unbuilt linked packages.
 * Use the caller's dependencies first, then the consuming application's dependencies.
 */
export function resolvePackageDirectory(
  request: string,
  parent: string,
  require: NodeJS.Require,
): string | undefined {
  const name = request.match(/^(?:@[^/]+\/)?[^/:]+/)?.[0];

  if (!name || request.startsWith('.') || request.startsWith('/') || request.includes(':')) {
    return;
  }

  const owner = findPackageDirectory(parent);

  if (owner) {
    const manifest = readPackageManifest(owner);

    if (manifest.name === name && manifest.exports != null) {
      return owner;
    }
  }

  const directories = new Set([
    ...(createRequire(parent).resolve.paths(name) ?? []),
    ...(require.resolve.paths(name) ?? []),
  ]);

  for (const directory of directories) {
    const candidate = join(directory, name);

    if (existsSync(join(candidate, 'package.json'))) {
      return realpathSync(candidate);
    }
  }
}

/**
 * Resolves a file or directory using the selected native platform.
 */
export function resolveFile(filename: string, extensions: string[]): string | undefined {
  const candidates = [
    filename,
    ...extensions.map((extension) => `${filename}${extension}`),
    ...extensions.map((extension) => `${filename}/index${extension}`),
  ];

  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

/**
 * Finds the owning package, including dependencies linked outside node_modules.
 */
export function findPackageDirectory(filename: string): string | undefined {
  let directory = dirname(filename);

  while (directory !== dirname(directory)) {
    const manifest = join(directory, 'package.json');

    if (existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).name) {
      return directory;
    }

    directory = dirname(directory);
  }

  return undefined;
}
