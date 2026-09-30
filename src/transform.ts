import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync, version } from '@babel/core';

import { createNativeMocksPlugin } from './transform-native-mocks.js';

import type { PluginObject } from '@babel/core';

const packageRequire = createRequire(import.meta.url);

const commonJsPlugin = packageRequire.resolve('@babel/plugin-transform-modules-commonjs');

const commonJsManifest = readFileSync(
  packageRequire.resolve('@babel/plugin-transform-modules-commonjs/package.json'),
  'utf8',
);

const transformerSource = readFileSync(fileURLToPath(import.meta.url), 'utf8');

const nativeMocksTransformerSource = createNativeMocksPlugin.toString();

const cacheDirectory = join(tmpdir(), 'wojtekmaj-vitest-react-native');

/**
 * React Native's code generator supplies the compiler used by its preset. Keep
 * that native transform independent from this package's CommonJS compiler.
 */
function getNativeCompiler(
  root: string,
): Pick<typeof import('@babel/core'), 'transformSync' | 'version'> {
  const require = createRequire(`${root}/package.json`);
  const nativeRequire = createRequire(require.resolve('react-native/package.json'));
  const codegenRequire = createRequire(nativeRequire.resolve('@react-native/codegen/package.json'));

  return codegenRequire('@babel/core');
}

/**
 * Compiles Metro's Flow, TypeScript and JSX sources without reading the app's Babel config.
 */
export function transformNative(
  code: string,
  filename: string,
  root: string,
  babelPlugins: string[] = [],
): string {
  const require = createRequire(`${root}/package.json`);
  const nativeCompiler = getNativeCompiler(root);
  const presetManifest = readFileSync(
    require.resolve('@react-native/babel-preset/package.json'),
    'utf8',
  );
  const cacheKey = createHash('sha256')
    .update(
      JSON.stringify([
        code,
        filename,
        version,
        nativeCompiler.version,
        commonJsManifest,
        presetManifest,
        transformerSource,
        nativeMocksTransformerSource,
        babelPlugins.map((name) => readFileSync(require.resolve(name), 'utf8')),
      ]),
    )
    .digest('hex');
  const cacheFile = join(cacheDirectory, `${cacheKey}.cjs`);

  if (existsSync(cacheFile)) {
    return readFileSync(cacheFile, 'utf8');
  }

  // Vendor helpers refer to jest without importing it; bind them to this file's adapter
  let usesPresetApi = false;

  function createPresetApiPlugin(): PluginObject {
    return {
      visitor: {
        ReferencedIdentifier(path) {
          if (path.node.name === 'jest' && !path.scope.hasBinding('jest')) {
            usesPresetApi = true;
            path.node.name = '__nativePresetApi';
          }
        },
      },
    };
  }

  const result = nativeCompiler.transformSync(code, {
    babelrc: false,
    configFile: false,
    filename,
    parserOpts: { createImportExpressions: true },
    plugins: [
      createNativeMocksPlugin,
      createPresetApiPlugin,
      ...babelPlugins.map((name) => require.resolve(name)),
    ],
    presets: [
      [require.resolve('@react-native/babel-preset'), { disableImportExportTransform: true }],
    ],
    sourceMaps: 'inline',
  });

  if (result?.code === undefined || result.code === null) {
    throw new Error(`Unable to transform React Native module: ${filename}`);
  }

  // A separate pass preserves the native preset's transforms before converting imports
  const commonJs = transformSync(result.code, {
    babelrc: false,
    configFile: false,
    filename,
    plugins: [commonJsPlugin],
    sourceMaps: true,
  });

  if (commonJs?.code === undefined || commonJs.code === null) {
    throw new Error(`Unable to compile native CommonJS module: ${filename}`);
  }

  const preamble = usesPresetApi
    ? `const __nativePresetApi = globalThis.__vitestReactNative.createPresetApi(__filename);\n`
    : '';

  /**
   * Vitest can wrap external requires. Node's own require keeps transformed native
   * dependencies in one module graph, with shared React instances and native mocks.
   */
  const prefix = `'use strict';\nrequire = require('node:module').createRequire(__filename);\n${preamble}`;
  const sourceMap = commonJs.map
    ? {
        ...commonJs.map,
        mappings: ';'.repeat(prefix.split('\n').length - 1) + commonJs.map.mappings,
      }
    : undefined;
  const mapComment = sourceMap
    ? `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${Buffer.from(JSON.stringify(sourceMap)).toString('base64')}`
    : '';
  const transformed = `${prefix}${commonJs.code}${mapComment}`;
  const temporaryFile = `${cacheFile}.${randomUUID()}.tmp`;

  // Atomic renames let parallel workers share compiled output safely
  mkdirSync(cacheDirectory, { recursive: true });
  writeFileSync(temporaryFile, transformed);
  renameSync(temporaryFile, cacheFile);

  return transformed;
}

/**
 * Transforms application sources while retaining ES modules for Vitest's mock hoisting.
 */
export function transformApplication(
  code: string,
  filename: string,
  root: string,
  babelPlugins: string[],
): { code: string; map: string | null } {
  const require = createRequire(`${root}/package.json`);
  const nativeCompiler = getNativeCompiler(root);
  const result = nativeCompiler.transformSync(code, {
    babelrc: false,
    configFile: false,
    filename,
    parserOpts: { createImportExpressions: true },
    plugins: [createNativeMocksPlugin, ...babelPlugins.map((name) => require.resolve(name))],
    presets: [
      [
        require.resolve('@react-native/babel-preset'),
        {
          disableImportExportTransform: true,
          /**
           * Local helper functions remain available to hoisted mock factories.
           * Imported helpers would be accessed before their imports initialize.
           */
          enableBabelRuntime: false,
        },
      ],
    ],
    sourceMaps: true,
  });

  if (result?.code === undefined || result.code === null) {
    throw new Error(`Unable to transform native application source: ${filename}`);
  }

  return { code: result.code, map: result.map ? JSON.stringify(result.map) : null };
}
