import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createNativeMocksPlugin } from './transform-native-mocks.js';

import type { PluginPass, Visitor } from '@babel/core';

const transformerSource = readFileSync(fileURLToPath(import.meta.url), 'utf8');

const nativeMocksTransformerSource = createNativeMocksPlugin.toString();

const cacheDirectory = join(tmpdir(), 'wojtekmaj-vitest-react-native');

/**
 * React Native's code generator supplies the compiler compatible with its preset.
 */
function getNativeCompilerRequire(root: string): NodeJS.Require {
  const require = createRequire(`${root}/package.json`);
  const nativeRequire = createRequire(require.resolve('react-native/package.json'));

  return createRequire(nativeRequire.resolve('@react-native/codegen/package.json'));
}

/**
 * Prepares one runtime's compiler identity without loading Babel on cache hits.
 * Compiles Metro's Flow, TypeScript and JSX sources independently of the app's Babel config.
 * The native preset also emits CommonJS, avoiding a second compiler pass.
 */
export function createNativeTransformer(
  root: string,
  babelPlugins: string[] = [],
): (code: string, filename: string) => string {
  const require = createRequire(`${root}/package.json`);
  const nativeCompilerRequire = getNativeCompilerRequire(root);
  const nativeCompilerManifest = readFileSync(
    nativeCompilerRequire.resolve('@babel/core/package.json'),
    'utf8',
  );
  const preset = require.resolve('@react-native/babel-preset');
  const presetRequire = createRequire(preset);
  const commonJsPlugin = presetRequire.resolve('@babel/plugin-transform-modules-commonjs');
  const commonJsManifest = readFileSync(
    presetRequire.resolve('@babel/plugin-transform-modules-commonjs/package.json'),
    'utf8',
  );
  const presetManifest = readFileSync(
    require.resolve('@react-native/babel-preset/package.json'),
    'utf8',
  );
  const plugins = babelPlugins.map((name) => require.resolve(name));
  const compilerKey = createHash('sha256')
    .update(
      JSON.stringify([
        nativeCompilerManifest,
        commonJsManifest,
        presetManifest,
        transformerSource,
        nativeMocksTransformerSource,
        plugins.map((filename) => readFileSync(filename, 'utf8')),
      ]),
    )
    .digest('hex');

  let usesPresetApi = false;

  function createPresetApiPlugin(): { visitor: Visitor<PluginPass> } {
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

  const compilerPlugins = [createNativeMocksPlugin, createPresetApiPlugin, ...plugins];

  return (code, filename) => {
    const cacheKey = createHash('sha256')
      .update(JSON.stringify([code, filename, compilerKey]))
      .digest('hex');
    const cacheFile = join(cacheDirectory, `${cacheKey}.cjs`);

    if (existsSync(cacheFile)) {
      return readFileSync(cacheFile, 'utf8');
    }

    const nativeCompiler: typeof import('@babel/core') = nativeCompilerRequire('@babel/core');

    // Vendor helpers refer to jest without importing it; bind them to this file's adapter
    usesPresetApi = false;

    const transformOptions = {
      babelrc: false,
      configFile: false,
      filename,
      parserOpts: { createImportExpressions: true },
      plugins: compilerPlugins,
      sourceMaps: true,
    };
    let result: ReturnType<typeof nativeCompiler.transformSync> = null;

    /**
     * Many native packages already ship plain JavaScript, including large icon
     * barrels. Only their imports need conversion; avoid the full native preset.
     * Syntax requiring Flow or JSX falls back to React Native's own parser.
     */
    if (/\.[cm]?js$/.test(filename) && !plugins.length && !code.includes('@flow')) {
      try {
        result = nativeCompiler.transformSync(code, {
          ...transformOptions,
          plugins: [...transformOptions.plugins, commonJsPlugin],
        });
      } catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'BABEL_PARSE_ERROR') {
          throw error;
        }
      }
    }

    if (!result) {
      result = nativeCompiler.transformSync(code, {
        ...transformOptions,
        presets: [[preset, { enableBabelRuntime: false, lazyImportExportTransform: false }]],
      });
    }

    if (result?.code === undefined || result.code === null) {
      throw new Error(`Unable to transform React Native module: ${filename}`);
    }

    const preamble = usesPresetApi
      ? `const __nativePresetApi = globalThis.__vitestReactNative.createPresetApi(__filename);\n`
      : '';

    /**
     * Vitest can wrap external requires. Node's own require keeps transformed native
     * dependencies in one module graph, with shared React instances and native mocks.
     */
    const prefix = `'use strict';\nrequire = require('node:module').createRequire(__filename);\n${preamble}`;
    const sourceMap = result.map
      ? {
          ...result.map,
          mappings: ';'.repeat(prefix.split('\n').length - 1) + result.map.mappings,
        }
      : undefined;
    const mapComment = sourceMap
      ? `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${Buffer.from(JSON.stringify(sourceMap)).toString('base64')}`
      : '';
    const transformed = `${prefix}${result.code}${mapComment}`;
    const temporaryFile = `${cacheFile}.${randomUUID()}.tmp`;

    // Atomic renames let parallel workers share compiled output safely
    mkdirSync(cacheDirectory, { recursive: true });

    writeFileSync(temporaryFile, transformed);

    renameSync(temporaryFile, cacheFile);

    return transformed;
  };
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
  const nativeCompiler: typeof import('@babel/core') =
    getNativeCompilerRequire(root)('@babel/core');
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
