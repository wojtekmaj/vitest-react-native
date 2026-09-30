import { createRequire } from 'node:module';
import { vi } from 'vitest';
import { NativeModules } from 'react-native';

const require = createRequire(import.meta.url);

vi.mock(import('@react-native-async-storage/async-storage'), () =>
  require('@react-native-async-storage/async-storage/jest'),
);

require('react-native-reanimated').setUpTests();

vi.mock(
  import('react-native-safe-area-context'),
  () => require('react-native-safe-area-context/jest/mock').default,
);

vi.mock(import('@react-native-community/netinfo'), () => {
  const netInfo = require('@react-native-community/netinfo/jest/netinfo-mock');

  return { ...netInfo, default: netInfo };
});

NativeModules.RNCWebViewModule = {
  shouldStartLoadWithLockIdentifier: vi.fn(),
  isFileUploadSupported: vi.fn(async () => true),
};
