import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getExtensions, resolveFile } from './resolve.js';

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'native-resolution-'));
});

afterEach(() => {
  rmSync(directory, { force: true, recursive: true });
});

describe('resolveFile()', () => {
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
