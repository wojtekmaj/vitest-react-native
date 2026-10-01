import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createPackageResolver, getExtensions, resolveFile } from './resolve.js';

describe('createPackageResolver()', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'native-package-resolution-'));
  });

  afterEach(() => {
    rmSync(directory, { force: true, recursive: true });
  });

  it('should find the package owning a nested source file', () => {
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: 'application' }));

    mkdirSync(join(directory, 'src/components'), { recursive: true });

    const resolver = createPackageResolver(createRequire(join(directory, 'package.json')));

    const owner = resolver.findPackageDirectory(join(directory, 'src/components/button.tsx'));

    expect(owner).toBe(directory);
    expect(resolver.readPackageManifest(directory)).toEqual({ name: 'application' });
  });

  it('should keep nested packages separate from their parent package', () => {
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: 'application' }));

    mkdirSync(join(directory, 'nested/src'), { recursive: true });

    writeFileSync(join(directory, 'nested/package.json'), JSON.stringify({ name: 'nested' }));

    const resolver = createPackageResolver(createRequire(join(directory, 'package.json')));

    const parent = resolver.findPackageDirectory(join(directory, 'index.js'));
    const nested = resolver.findPackageDirectory(join(directory, 'nested/src/index.js'));

    expect(parent).toBe(directory);
    expect(nested).toBe(join(directory, 'nested'));
  });

  it('should refresh package metadata for a new runtime', () => {
    const manifest = join(directory, 'package.json');
    const require = createRequire(manifest);

    writeFileSync(manifest, JSON.stringify({ name: 'application', main: 'before.js' }));

    const first = createPackageResolver(require);
    const before = first.readPackageManifest(directory);

    writeFileSync(manifest, JSON.stringify({ name: 'application', main: 'after.js' }));

    const second = createPackageResolver(require);

    expect(first.readPackageManifest(directory)).toBe(before);
    expect(second.readPackageManifest(directory).main).toBe('after.js');
  });
});

describe('resolveFile()', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'native-resolution-'));
  });

  afterEach(() => {
    rmSync(directory, { force: true, recursive: true });
  });

  it('should resolve an ordinary file', () => {
    writeFileSync(join(directory, 'component.js'), '');

    expect(resolveFile(join(directory, 'component'), getExtensions('ios'))).toBe(
      join(directory, 'component.js'),
    );
  });

  it.each`
    platform     | expected
    ${'ios'}     | ${'component.ios.tsx'}
    ${'android'} | ${'component.android.tsx'}
  `('should prefer $platform sources over native and generic sources', ({ platform, expected }) => {
    for (const filename of [
      'component.tsx',
      'component.native.tsx',
      'component.ios.tsx',
      'component.android.tsx',
    ]) {
      writeFileSync(join(directory, filename), '');
    }

    const result = resolveFile(join(directory, 'component'), getExtensions(platform));

    expect(result).toBe(join(directory, expected));
  });

  it('should fall back to a native file', () => {
    writeFileSync(join(directory, 'component.native.js'), '');

    writeFileSync(join(directory, 'component.js'), '');

    expect(resolveFile(join(directory, 'component'), getExtensions('ios'))).toBe(
      join(directory, 'component.native.js'),
    );
  });

  it('should fall back to a generic file from another platform', () => {
    writeFileSync(join(directory, 'component.android.js'), '');

    writeFileSync(join(directory, 'component.js'), '');

    expect(resolveFile(join(directory, 'component'), getExtensions('ios'))).toBe(
      join(directory, 'component.js'),
    );
  });

  it('should prefer JavaScript over a platform-specific TypeScript file', () => {
    writeFileSync(join(directory, 'component.js'), '');

    writeFileSync(join(directory, 'component.ios.ts'), '');

    expect(resolveFile(join(directory, 'component'), getExtensions('ios'))).toBe(
      join(directory, 'component.js'),
    );
  });

  it('should prefer native JSX over platform-specific TypeScript', () => {
    writeFileSync(join(directory, 'component.native.jsx'), '');

    writeFileSync(join(directory, 'component.ios.tsx'), '');

    expect(resolveFile(join(directory, 'component'), getExtensions('ios'))).toBe(
      join(directory, 'component.native.jsx'),
    );
  });

  it('should resolve a native directory entry', () => {
    mkdirSync(join(directory, 'component'));

    writeFileSync(join(directory, 'component/index.native.ts'), '');

    const result = resolveFile(join(directory, 'component'), getExtensions('ios'));

    expect(result).toBe(join(directory, 'component/index.native.ts'));
  });

  it('should return undefined for an unresolved file', () => {
    expect(resolveFile(join(directory, 'missing'), getExtensions('ios'))).toBeUndefined();
  });
});
