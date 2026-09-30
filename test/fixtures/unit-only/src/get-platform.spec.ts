import { describe, expect, it } from 'vitest';

import { getPlatform } from './get-platform.js';

describe('getPlatform()', () => {
  it('should read the native platform without a component renderer', () => {
    const platform = getPlatform();

    expect(platform).toBe(process.env.NATIVE_PLATFORM === 'android' ? 'android' : 'ios');
  });
});
