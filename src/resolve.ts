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

export type PackageResolver = {
  findPackageDirectory: (filename: string) => string | undefined;
  readPackageManifest: (directory: string) => PackageManifest;
  resolvePackageDirectory: (request: string, parent: string) => string | undefined;
};

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
 * Shares package ownership and manifest lookups between the runtime's Node hooks.
 * Caches belong to one test file so subsequent files and watch runs see fresh packages.
 */
export function createPackageResolver(require: NodeJS.Require): PackageResolver {
  const manifests = new Map<string, PackageManifest>();

  const owners = new Map<string, string | undefined>();

  const packages = new Map<string, string | undefined>();

  function readPackageManifest(directory: string): PackageManifest {
    let manifest = manifests.get(directory);

    if (!manifest) {
      manifest = JSON.parse(
        readFileSync(join(directory, 'package.json'), 'utf8'),
      ) as PackageManifest;
      manifests.set(directory, manifest);
    }

    return manifest;
  }

  function findPackageDirectory(filename: string): string | undefined {
    let directory = dirname(filename);

    let owner: string | undefined;

    const visited: string[] = [];

    while (directory !== dirname(directory)) {
      if (owners.has(directory)) {
        owner = owners.get(directory);

        break;
      }

      visited.push(directory);

      if (existsSync(join(directory, 'package.json')) && readPackageManifest(directory).name) {
        owner = directory;

        break;
      }

      directory = dirname(directory);
    }

    for (const visitedDirectory of visited) {
      owners.set(visitedDirectory, owner);
    }

    return owner;
  }

  function resolvePackageDirectory(request: string, parent: string): string | undefined {
    const name = request.match(/^(?:@[^/]+\/)?[^/:]+/)?.[0];

    if (!name || request.startsWith('.') || request.startsWith('/') || request.includes(':')) {
      return;
    }

    const key = `${dirname(parent)}\0${name}`;

    if (packages.has(key)) {
      return packages.get(key);
    }

    const owner = findPackageDirectory(parent);

    if (owner) {
      const manifest = readPackageManifest(owner);

      if (manifest.name === name && manifest.exports != null) {
        packages.set(key, owner);

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
        const resolved = realpathSync(candidate);

        packages.set(key, resolved);

        return resolved;
      }
    }

    packages.set(key, undefined);
  }

  return {
    findPackageDirectory,
    readPackageManifest,
    resolvePackageDirectory,
  };
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
