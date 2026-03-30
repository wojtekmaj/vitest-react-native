import { test, expect, describe } from 'vitest';

/**
 * Issue #14: NativeUIManager.getConstants is not a function
 *
 * PaperUIManager.js calls NativeUIManager.getConstants() which is loaded
 * via TurboModuleRegistry. The turbo module proxy must return a proper mock.
 */
describe('NativeUIManager (issue #14)', () => {
  test('UIManager turbo module has getConstants', () => {
    const proxy = (globalThis as Record<string, unknown>).__turboModuleProxy as (
      name: string,
    ) => Record<string, unknown> | null;
    const uiManager = proxy('UIManager');
    expect(uiManager).not.toBeNull();
    expect(typeof uiManager!.getConstants).toBe('function');
    expect((uiManager!.getConstants as () => object)()).toEqual({});
  });

  test('PaperUIManager loads without crashing', () => {
    expect(() =>
      require('react-native/Libraries/ReactNative/PaperUIManager'),
    ).not.toThrow();
  });

  test('UIManager from react-native is usable', () => {
    const { UIManager } = require('react-native');
    expect(UIManager).toBeDefined();
  });
});
