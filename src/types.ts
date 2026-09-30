/**
 * Controls native module resolution and explicitly selected vendor test integrations.
 */
export type ReactNativeOptions = {
  /**
   * Additional Babel plugins applied to native dependencies and application sources.
   */
  babelPlugins?: string[];

  /**
   * Platform files to prefer. Defaults to iOS.
   */
  platform?: 'android' | 'ios';

  /**
   * A library's synchronous test resolver, such as Reanimated's Jest resolver.
   */
  nativeResolver?: string;

  /**
   * Vendor setup files evaluated with the native preset's CommonJS mock API.
   */
  nativeSetupFiles?: string[];

  /**
   * Additional packages whose uncompiled JavaScript needs the native Babel preset.
   */
  transformPackages?: string[];
};

/**
 * Worker configuration, enriched with the string aliases resolved by Vite.
 */
export interface RuntimeOptions extends ReactNativeOptions {
  aliases?: { find: string; replacement: string }[];
  tsconfigPaths?: boolean;
}
