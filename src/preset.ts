import { createRequire } from 'node:module';
import { vi } from 'vitest';

export type PresetApi = Omit<typeof vi, 'mock' | 'doMock'> & {
  mock: (specifier: string, factory?: () => unknown) => void;
  doMock: (specifier: string, factory?: () => unknown) => void;
  now: () => number;
  requireActual: (specifier: string) => unknown;
};

export const actualPrefix = 'vitest-react-native:actual:';

export const mockSuffix = '.vitest-react-native-mock.cjs';

export const presetApiPrefix = 'vitest-react-native:preset-api:';

/**
 * Adapts vendor test presets to Vitest and records their CommonJS module mocks.
 */
export function installPresetApi(): Map<string, () => unknown> {
  const factories = new Map<string, () => unknown>();
  const mocks = new Map<string, unknown>();

  function createPresetApi(filename: string): PresetApi {
    const localRequire = createRequire(filename);

    function registerMock(specifier: string, factory?: () => unknown): void {
      const resolved = localRequire.resolve(actualPrefix + specifier);

      factories.set(
        resolved,
        factory ?? (() => vi.mockObject(localRequire(actualPrefix + specifier))),
      );
    }

    // Only vendor setup uses this adapter; application mocks stay in Vitest
    return {
      ...vi,
      now: () => Date.now(),
      requireActual: (specifier) => localRequire(actualPrefix + specifier),
      mock: registerMock,
      doMock: registerMock,
    };
  }

  globalThis.__vitestReactNative = {
    createPresetApi,
    getMock(filename) {
      if (!mocks.has(filename)) {
        const factory = factories.get(filename);

        if (!factory) {
          throw new Error(`Missing native mock factory: ${filename}`);
        }

        mocks.set(filename, factory());
      }

      return mocks.get(filename);
    },
  };

  return factories;
}

/**
 * Installs React Native's own mocks and its missing test environment constants.
 */
export function configureNativePreset(require: NodeJS.Require): void {
  require('@react-native/jest-preset/jest/setup.js');

  const { default: nativeModules } =
    require('react-native/Libraries/BatchedBridge/NativeModules') as {
      default: Record<string, unknown> & {
        PlatformConstants: { getConstants: () => Record<string, unknown> };
      };
    };

  // Make native animation completion deterministic in the JavaScript test preset
  const getPlatformConstants = nativeModules.PlatformConstants.getConstants;

  nativeModules.PlatformConstants.getConstants = () => ({
    ...getPlatformConstants(),
    isDisableAnimations: true,
    isTesting: true,
  });

  nativeModules.SettingsManager = {
    getConstants: () => ({ settings: {} }),
    setValues: vi.fn(),
    deleteValues: vi.fn(),
  };
}
