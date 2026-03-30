import { test, expect, describe } from 'vitest';

/**
 * Issue #13: ReactNativeFeatureFlags.enableNativeCSSParsing is not a function
 *
 * Verifies that the feature flags mock handles any current or future flag
 * via a Proxy, so new flags don't require manual updates to setup.ts.
 */
describe('ReactNativeFeatureFlags (issue #13)', () => {
  test('known flags are callable', () => {
    const flags = require('react-native/src/private/featureflags/ReactNativeFeatureFlags');
    expect(typeof flags.enableNativeCSSParsing).toBe('function');
    expect(flags.enableNativeCSSParsing()).toBe(false);
  });

  test('isLayoutAnimationEnabled defaults to true', () => {
    const flags = require('react-native/src/private/featureflags/ReactNativeFeatureFlags');
    expect(flags.isLayoutAnimationEnabled()).toBe(true);
  });

  test('unknown/future flags return () => false automatically', () => {
    const flags = require('react-native/src/private/featureflags/ReactNativeFeatureFlags');
    // Any arbitrary flag name should work without hardcoding
    expect(typeof flags.someFutureFlag).toBe('function');
    expect(flags.someFutureFlag()).toBe(false);
    expect(typeof flags.anotherNewFeature).toBe('function');
    expect(flags.anotherNewFeature()).toBe(false);
  });

  test('turbo module proxy also handles unknown flags', () => {
    const proxy = (globalThis as Record<string, unknown>).__turboModuleProxy as (
      name: string,
    ) => Record<string, unknown> | null;
    const flagModule = proxy('NativeReactNativeFeatureFlagsCxx');
    expect(flagModule).toBeDefined();
    expect(typeof (flagModule as Record<string, unknown>).enableNativeCSSParsing).toBe('function');
    expect(typeof (flagModule as Record<string, unknown>).anyFutureFlag).toBe('function');
  });
});
