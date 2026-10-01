import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { mockNativeModule } from '@wojtekmaj/vitest-react-native/native-mocks';

describe('mockNativeModule()', () => {
  it('should provide a typed mock without evaluating the imported dependency', () => {
    const require = createRequire(import.meta.url);

    mockNativeModule(import('../test/fixtures/native-mock.js'), () => ({
      readValue: () => 'typed mock',
    }));

    const dependency: typeof import('../test/fixtures/native-mock.js') = require('../test/fixtures/native-mock.js');

    expect(dependency.readValue()).toBe('typed mock');
  });

  it('should provide the registered mock to a CommonJS consumer', () => {
    const directory = mkdtempSync(join(tmpdir(), 'native-mock-'));
    const filename = join(directory, 'dependency.cjs');
    const require = createRequire(import.meta.url);

    try {
      writeFileSync(filename, "module.exports = { readValue: () => 'native value' };");

      mockNativeModule(filename, () => ({ readValue: () => 'test value' }));

      const dependency: { readValue: () => string } = require(filename);
      const value = dependency.readValue();

      expect(value).toBe('test value');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it.each`
    importStatement                              | registerMock
    ${'import { mockNativeModule as register }'} | ${'register'}
    ${'import * as nativeMocks'}                 | ${'nativeMocks.mockNativeModule'}
  `(
    'should register typed mocks in CommonJS setup using $importStatement',
    ({ importStatement, registerMock }) => {
      const directory = mkdtempSync(join(tmpdir(), 'native-mock-setup-'));
      const setup = join(directory, 'setup.ts');
      const dependency = join(directory, 'dependency.cjs');
      const require = createRequire(import.meta.url);

      try {
        writeFileSync(dependency, "throw new Error('The native implementation must not load');");

        writeFileSync(
          setup,
          `${importStatement} from '@wojtekmaj/vitest-react-native/native-mocks';
        ${registerMock}(import('./dependency.cjs'), () => ({ readValue: () => 'setup mock' }));`,
        );

        require(setup);

        const nativeModule: { readValue: () => string } = require(dependency);

        expect(nativeModule.readValue()).toBe('setup mock');
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  );

  it('should check factory exports against the imported module types', () => {
    expectTypeOf(() => {
      // @ts-expect-error The native module's readValue export returns a string
      mockNativeModule(import('../test/fixtures/native-mock.js'), () => ({ readValue: () => 123 }));
    }).returns.toEqualTypeOf<void>();
  });
});
