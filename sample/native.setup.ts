import { createRequire } from 'node:module';
import { mockNativeModule } from '@wojtekmaj/vitest-react-native/native-mocks';

const require = createRequire(__filename);

mockNativeModule(import('react-native-worklets'), () => require('react-native-worklets/src/mock'));

mockNativeModule('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject() {
      throw new Error('A native hybrid object was requested in a unit test');
    },
  },
}));
