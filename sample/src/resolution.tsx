import { createRequire } from 'node:module';
import { Text, View } from 'react-native';
import { entry, PlatformView } from '@vitest-native-fixture/native-entry';
import Greeting from '@vitest-native-fixture/uncompiled';

const require = createRequire(import.meta.url);

export function getNativeEntries(): {
  commonJs: string;
  esm: string;
} {
  const dependency = require('@vitest-native-fixture/native-entry');

  return {
    commonJs: dependency.entry,
    esm: entry,
  };
}

export function NativeDependencies() {
  const entries = getNativeEntries();

  return (
    <View>
      <Text>
        ESM: {entries.esm}, CommonJS: {entries.commonJs}
      </Text>
      <PlatformView />
      <Greeting />
    </View>
  );
}
