import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const transformer = new URL('../dist/transform-native-mocks.js', import.meta.url).href;

describe('createNativeMocksPlugin()', () => {
  it.each`
    importStyle             | importStatement                              | registerMock                      | createImportExpressions
    ${'a named import'}     | ${'import { mockNativeModule }'}             | ${'mockNativeModule'}             | ${true}
    ${'an aliased import'}  | ${'import { mockNativeModule as register }'} | ${'register'}                     | ${false}
    ${'a namespace import'} | ${'import * as nativeMocks'}                 | ${'nativeMocks.mockNativeModule'} | ${false}
  `(
    'should replace typed mock imports through $importStyle',
    ({ importStatement, registerMock, createImportExpressions }) => {
      const code = `${importStatement} from '@wojtekmaj/vitest-react-native/native-mocks';
        ${registerMock}(import('native-package'), () => ({}));`;

      /**
       * Run the compiler outside native loader hooks so its dependencies use Node resolution.
       */
      const script = `
        import { createRequire } from 'node:module';

        const require = createRequire(${JSON.stringify(import.meta.url)});
        const compiler = require('@babel/core');
        const { createNativeMocksPlugin } = await import(${JSON.stringify(transformer)});
        const result = compiler.transformSync(${JSON.stringify(code)}, {
          babelrc: false,
          configFile: false,
          filename: '/tmp/native-setup.js',
          parserOpts: { createImportExpressions: ${createImportExpressions} },
          plugins: [createNativeMocksPlugin],
        });

        process.stdout.write(result.code);
      `;
      const result = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      expect(result).toContain(`${registerMock}('native-package',`);
    },
  );
});
