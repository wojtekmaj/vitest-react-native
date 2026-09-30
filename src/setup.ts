import { createRequire } from 'node:module';
import { afterAll, afterEach, expect, vi } from 'vitest';

import { installRuntime } from './runtime.js';

import type { RuntimeOptions } from './types.js';

const options: RuntimeOptions = JSON.parse(process.env.VITEST_REACT_NATIVE_OPTIONS ?? '{}');

const root = process.env.VITEST_REACT_NATIVE_ROOT ?? process.cwd();

const require = createRequire(`${root}/package.json`);

Object.assign(globalThis, { expect, jest: vi });

const dispose = installRuntime(root, options);

/**
 * RNTL is an optional integration. Register its cleanup only when the app uses it.
 * Keep resolution separate from loading so failures inside RNTL are not swallowed.
 */
let testingLibrary: string | undefined;

try {
  testingLibrary = require.resolve('@testing-library/react-native/pure');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') {
    throw error;
  }
}

if (testingLibrary) {
  const { cleanup } = require(testingLibrary) as Pick<
    typeof import('@testing-library/react-native'),
    'cleanup'
  >;

  afterEach(async () => {
    await cleanup();
  });
}

afterAll(dispose);
