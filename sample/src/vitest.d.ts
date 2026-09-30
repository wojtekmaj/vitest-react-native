import 'vitest';

declare module 'vitest' {
  interface Assertion<R, T> {
    toHaveAnimatedStyle(style: Record<string, unknown>): R;
  }
}
