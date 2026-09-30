/**
 * Registers a native dependency mock before its CommonJS implementation loads.
 * Use this helper in nativeSetupFiles; vi.mock still handles application imports.
 */
export function mockNativeModule<Module>(
  specifier: Promise<Module>,
  factory: () => Partial<Module>,
): void;
export function mockNativeModule(specifier: string, factory: () => unknown): void;
export function mockNativeModule(
  specifier: string | Promise<unknown>,
  factory: () => unknown,
): void {
  if (typeof specifier !== 'string') {
    throw new Error('Pass a literal import(...) directly to mockNativeModule');
  }

  const runtime = globalThis.__vitestReactNative;

  if (!runtime) {
    throw new Error('Register native module mocks from a nativeSetupFiles entry');
  }

  const root = process.env.VITEST_REACT_NATIVE_ROOT ?? process.cwd();

  runtime.createPresetApi(`${root}/package.json`).mock(specifier, factory);
}
