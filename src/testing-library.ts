import 'vitest';

import type * as matchers from '@testing-library/react-native/matchers';

/**
 * Public matcher exports follow the installed Testing Library version and renderer.
 * Assertion methods receive the matcher arguments after the tested instance.
 */
type NativeMatchers<R> = {
  [Name in keyof typeof matchers]: (
    ...args: Parameters<(typeof matchers)[Name]> extends [unknown, ...infer Args] ? Args : never
  ) => R;
};

/**
 * Both supported Vitest versions expose this interface for asymmetric assertions.
 * Runtime registration happens in the worker, after native setup.
 */
declare module 'vitest' {
  interface AsymmetricMatchersContaining extends NativeMatchers<void> {}
}

/**
 * Chai's assertion interface is shared by Vitest 4, Vitest 5 and linked consumers.
 * Vitest derives the promise assertion return types from these synchronous methods.
 */
declare global {
  namespace Chai {
    interface Assertion extends NativeMatchers<void> {}
  }
}

export { default } from './index.js';

export type { ReactNativeOptions } from './types.js';
