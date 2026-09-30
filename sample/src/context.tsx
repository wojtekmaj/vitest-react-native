import { createRequire } from 'node:module';
import { Text } from 'react-native';
import { MemoryRouter, Route, Routes } from 'react-router-native';
import { ThemeProvider } from 'styled-components/native';

const require = createRequire(import.meta.url);

const { NativeLink, StyledMessage } = require('@vitest-native-fixture/native-entry');

export function ThemedMessage() {
  return (
    <ThemeProvider theme={{ accent: 'purple' }}>
      <StyledMessage>Themed message</StyledMessage>
    </ThemeProvider>
  );
}

export function NativeRouter() {
  return (
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<NativeLink />} />
        <Route path="/done" element={<Text>Destination</Text>} />
      </Routes>
    </MemoryRouter>
  );
}
