import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

import type { PluginPass, Visitor } from '@babel/core';

const nativeMocksEntry = '@wojtekmaj/vitest-react-native/native-mocks';

const require = createRequire(import.meta.url);

/**
 * Replaces typed mock imports with paths before JavaScript can load the dependency.
 * Inspect import bindings so aliases work and unrelated functions stay unchanged.
 */
export function createNativeMocksPlugin(api: { version: string }): {
  manipulateOptions: (
    options: unknown,
    parserOptions: { plugins?: (string | [string, object])[] },
  ) => void;
  visitor: Visitor<PluginPass>;
} {
  return {
    manipulateOptions(_options, parserOptions) {
      if (!api.version.startsWith('7.')) {
        return;
      }

      // Babel 7.0 requires the dynamic import syntax flag
      parserOptions.plugins ??= [];
      parserOptions.plugins.push('dynamicImport');
    },
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

        if (!argument) {
          return;
        }

        const source = argument.isImportExpression?.()
          ? argument.get('source')
          : argument.isCallExpression() && argument.get('callee').isImport()
            ? argument.get('arguments')[0]
            : undefined;

        if (!source) {
          return;
        }

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
