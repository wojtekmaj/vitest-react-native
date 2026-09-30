import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installPresetApi } from './preset.js';

describe('installPresetApi()', () => {
  let directory: string;
  let filename: string;
  let factories: Map<string, () => unknown>;
  let previousRuntime: typeof globalThis.__vitestReactNative;

  beforeEach(() => {
    directory = realpathSync(mkdtempSync(join(tmpdir(), 'native-preset-')));
    filename = join(directory, 'dependency.cjs');

    writeFileSync(filename, "module.exports = { value: 'native value' };");

    previousRuntime = globalThis.__vitestReactNative;
    factories = installPresetApi();
  });

  afterEach(() => {
    globalThis.__vitestReactNative = previousRuntime;

    const require = createRequire(import.meta.url);

    delete require.cache[filename];
    rmSync(directory, { recursive: true, force: true });
  });

  it.each`
    method
    ${'mock'}
    ${'doMock'}
  `(
    'should register a vendor $method relative to its setup file',
    ({ method }: { method: 'mock' | 'doMock' }) => {
      const preset = globalThis.__vitestReactNative.createPresetApi(join(directory, 'setup.cjs'));
      const factory = () => ({ readValue: () => 'mock value' });

      preset[method]('./dependency.cjs', factory);

      expect(factories.get(filename)).toBe(factory);
      expect(globalThis.__vitestReactNative.getMock(filename)).toEqual({
        readValue: expect.any(Function),
      });
    },
  );

  it('should reuse the vendor mock instance', () => {
    const preset = globalThis.__vitestReactNative.createPresetApi(join(directory, 'setup.cjs'));
    const factory = vi.fn(() => ({ value: 'mock value' }));

    preset.mock('./dependency.cjs', factory);

    const first = globalThis.__vitestReactNative.getMock(filename);
    const second = globalThis.__vitestReactNative.getMock(filename);

    expect(first).toBe(second);
    expect(factory).toHaveBeenCalledOnce();
  });

  it('should load the actual dependency when requested by a vendor', () => {
    const preset = globalThis.__vitestReactNative.createPresetApi(join(directory, 'setup.cjs'));

    preset.mock('./dependency.cjs', () => ({ readValue: () => 'mock value' }));

    expect(preset.requireActual('./dependency.cjs')).toEqual({ value: 'native value' });
  });
});
