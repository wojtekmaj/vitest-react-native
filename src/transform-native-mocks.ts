import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import type { PluginObject } from '@babel/core';

const nativeMocksEntry = '@wojtekmaj/vitest-react-native/native-mocks';

const require = createRequire(import.meta.url);

/**
 * Replaces typed mock imports with paths before JavaScript can load the dependency.
 * Inspect import bindings so aliases work and unrelated functions stay unchanged.
 */
export function createNativeMocksPlugin(): PluginObject {
  return {
    visitor: {
      CallExpression(path, state) {
        const callee = path.get('callee');
        const namedCall = callee.isIdentifier();
        const namespaceCall =
          callee.isMemberExpression() &&
          !callee.node.computed &&
          callee.get('property').isIdentifier({ name: 'mockNativeModule' });

        if (!namedCall && !namespaceCall) {
          return;
        }

        const identifier = callee.isMemberExpression() ? callee.get('object') : callee;

        if (!identifier.isIdentifier()) {
          return;
        }

        const binding = path.scope.getBinding(identifier.node.name);

        if (!binding) {
          return;
        }

        if (namedCall && binding.path.isImportSpecifier()) {
          if (!binding.path.get('imported').isIdentifier({ name: 'mockNativeModule' })) {
            return;
          }
        } else if (!namespaceCall || !binding.path.isImportNamespaceSpecifier()) {
          return;
        }

        const declaration = binding.path.parentPath;

        if (
          !declaration?.isImportDeclaration() ||
          declaration.node.source.value !== nativeMocksEntry
        ) {
          return;
        }

        const argument = path.get('arguments')[0];

        if (!argument?.isImportExpression()) {
          return;
        }

        const source = argument.get('source');

        if (!source.isStringLiteral()) {
          throw argument.buildCodeFrameError('Pass a literal import(...) to mockNativeModule');
        }

        // Relative imports belong to the setup file, not the application's root
        if (source.node.value.startsWith('.') && state.filename) {
          source.node.value = resolve(dirname(state.filename), source.node.value);
        }

        argument.replaceWith(source.node);
      },
    },
  };
}

/**
 * Handles typed mocks in application modules without changing their ES imports.
 * Vite performs the remaining TypeScript and JSX compilation afterwards.
 */
export function transformNativeMocks(code: string, filename: string): string | undefined {
  if (!code.includes(nativeMocksEntry)) {
    return;
  }

  const compiler: typeof import('@babel/core') = require('@babel/core');

  const result = compiler.transformSync(code, {
    babelrc: false,
    configFile: false,
    filename,
    parserOpts: {
      createImportExpressions: true,
      plugins: /\.tsx?$/.test(filename) ? ['typescript', 'jsx'] : ['jsx'],
    },
    plugins: [createNativeMocksPlugin],
    sourceMaps: 'inline',
  });

  if (result?.code === undefined || result.code === null) {
    throw new Error(`Unable to transform native mock imports: ${filename}`);
  }

  return result.code;
}
