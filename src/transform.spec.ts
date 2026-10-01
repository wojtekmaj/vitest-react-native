import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { SourceMap } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const transformer = new URL('../dist/transform.js', import.meta.url).href;

describe('createNativeTransformer()', () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'native-transform-'));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  /**
   * A fresh process has no compiler modules in memory, making cache hits observable.
   * Its temporary directory also keeps this test independent of previous test runs.
   */
  function transformInProcess(
    code: string,
    extension = 'tsx',
    rejectCompiler = false,
  ): {
    code: string;
    exports: { default?: string; value?: string };
  } {
    const filename = join(
      root,
      'test/fixtures/native-entry',
      `${basename(directory)}.${extension}`,
    );
    const script = `
      import { createRequire, registerHooks } from 'node:module';

      if (${rejectCompiler}) {
        registerHooks({
          load(url, context, nextLoad) {
            if (url.includes('/@babel/')) {
              throw new Error('Babel must not load on a cache hit');
            }

            return nextLoad(url, context);
          },
        });
      }

      const { createNativeTransformer } = await import(${JSON.stringify(transformer)});

      const transform = createNativeTransformer(${JSON.stringify(root)});

      const code = transform(${JSON.stringify(code)}, ${JSON.stringify(filename)});

      const module = { exports: {} };

      new Function('module', 'exports', 'require', '__filename', code)(
        module, module.exports, createRequire(${JSON.stringify(filename)}), ${JSON.stringify(filename)}
      );

      process.stdout.write(JSON.stringify({ code, exports: module.exports }));
    `;
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
      env: { ...process.env, TMPDIR: directory, TMP: directory, TEMP: directory },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    return JSON.parse(output);
  }

  it('should preserve default and named exports', () => {
    const result = transformInProcess(
      "export const value = 'named'; export default 'default';",
      'js',
    );

    expect(result.exports).toEqual({ default: 'default', value: 'named' });
  });

  it.each`
    language        | extension
    ${'Flow'}       | ${'js'}
    ${'TypeScript'} | ${'tsx'}
  `('should compile $language exports into executable CommonJS', ({ extension }) => {
    const result = transformInProcess("export const value: string = 'native value';", extension);

    expect(result.exports.value).toBe('native value');
  });

  it('should compile JSX in JavaScript through the native preset', () => {
    const result = transformInProcess(
      `function Label() { return null; }

      const element = <Label>native value</Label>;

      export const value = element.props.children;`,
      'js',
    );

    expect(result.exports.value).toBe('native value');
  });

  it.each`
    language        | extension | declaration
    ${'JavaScript'} | ${'js'}   | ${"const value = 'native value';"}
    ${'TypeScript'} | ${'tsx'}  | ${"const value: string = 'native value';"}
  `('should map $language errors back to the original source', ({ extension, declaration }) => {
    const code = `${declaration}

export function fail() {
  throw new Error(value);
}`;
    const result = transformInProcess(code, extension);
    const encodedMap = result.code.split('base64,')[1] ?? '';
    const map = new SourceMap(JSON.parse(Buffer.from(encodedMap, 'base64').toString('utf8')));
    const throwOffset = result.code.indexOf('throw new Error');

    expect(throwOffset).toBeGreaterThanOrEqual(0);

    const linesBeforeThrow = result.code.slice(0, throwOffset).split('\n');
    const generatedLine = linesBeforeThrow.length - 1;
    const generatedColumn = linesBeforeThrow.at(-1)?.length ?? 0;

    expect(map.findEntry(generatedLine, generatedColumn)).toMatchObject({
      originalSource: `${basename(directory)}.${extension}`,
      originalLine: 3,
      originalColumn: 2,
    });
  });

  it('should reuse compiled sources without loading Babel in a fresh process', () => {
    const code = "export const value: string = 'native value';";
    const first = transformInProcess(code);

    const cached = transformInProcess(code, 'tsx', true);

    expect(cached).toEqual(first);
  });

  it('should recompile a changed source at the same filename', () => {
    transformInProcess("export const value: string = 'before';");

    const changed = transformInProcess("export const value: string = 'after';");

    expect(changed.exports.value).toBe('after');
  });
});
