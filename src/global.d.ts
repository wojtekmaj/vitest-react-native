import type { PresetApi } from './preset.js';

declare global {
  var __vitestReactNative: {
    createPresetApi: (filename: string) => PresetApi;
    getMock: (filename: string) => unknown;
  };
}
