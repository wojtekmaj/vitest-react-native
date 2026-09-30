[![npm](https://img.shields.io/npm/v/@wojtekmaj/vitest-react-native.svg)](https://www.npmjs.com/package/@wojtekmaj/vitest-react-native) ![downloads](https://img.shields.io/npm/dt/@wojtekmaj/vitest-react-native.svg) [![CI](https://github.com/wojtekmaj/vitest-react-native/actions/workflows/ci.yml/badge.svg)](https://github.com/wojtekmaj/vitest-react-native/actions)

# Vitest React Native

Run React Native unit and component tests with Vitest. The plugin transforms native JavaScript with React Native's Babel preset and uses its official test mocks in Node.js.

## tl;dr

- Install by executing `npm install --save-dev @wojtekmaj/vitest-react-native vitest vite` or `yarn add --dev @wojtekmaj/vitest-react-native vitest vite`.
- Import by adding `import reactNative from '@wojtekmaj/vitest-react-native'`.
- Use it by adding `reactNative()` to the `plugins` section of your Vitest config.
- For React Native Testing Library matcher types, use the `@wojtekmaj/vitest-react-native/testing-library` import instead.

## Getting started

### Compatibility

#### React Native

The support window follows [React Native's three maintained minor series](https://reactnative.dev/releases/overview). The latest stable release is the primary support target; compatibility with the preceding two series is maintained on a best-effort basis. CI also checks the upcoming release candidate on iOS and Android.

Use `@react-native/babel-preset` and `@react-native/jest-preset` at the same version as your application's `react-native` dependency.

#### Vitest and Vite

Vitest React Native requires Vitest 4 or newer and Vite 7 or newer.

#### Node.js

Vitest React Native requires Node.js 24.15.0 or newer within the 24.x series, or Node.js 26.0.0 or newer.

#### React Native Testing Library

React Native Testing Library 13 or newer is supported and optional. Ordinary unit tests work without it. The plugin integrates its matchers and automatic cleanup with Vitest.

### Installation

Add Vitest React Native to your project by executing `npm install --save-dev @wojtekmaj/vitest-react-native vitest vite` or `yarn add --dev @wojtekmaj/vitest-react-native vitest vite`.

If your application does not already include React Native's Babel and test presets, install their matching versions. For example, for React Native 0.87.0, execute `npm install --save-dev @react-native/babel-preset@0.87.0 @react-native/jest-preset@0.87.0` or `yarn add --dev @react-native/babel-preset@0.87.0 @react-native/jest-preset@0.87.0`.

## Usage

Create `vitest.config.ts` and add the plugin:

```ts
import { defineConfig } from 'vitest/config';
import reactNative from '@wojtekmaj/vitest-react-native';

export default defineConfig({
  plugins: [reactNative()],
});
```

If your application's `package.json` does not set `"type": "module"`, name the configuration file `vitest.config.mts`.

Import test APIs such as `it` and `expect` from `vitest` in your `.spec.ts` files. Run your tests with `npx vitest run` or `yarn vitest run`.

### Component tests

Install React Native Testing Library and its renderer by executing `npm install --save-dev @testing-library/react-native test-renderer` or `yarn add --dev @testing-library/react-native test-renderer`.

For React Native Testing Library 13, use `react-test-renderer` at the same version as React instead of `test-renderer`.

In `vitest.config.ts`, use the Testing Library entry point:

```ts
import { defineConfig } from 'vitest/config';
import reactNative from '@wojtekmaj/vitest-react-native/testing-library';

export default defineConfig({
  plugins: [reactNative()],
});
```

This includes native matcher types such as `toBeOnTheScreen()` and `toHaveTextContent()`. Include your Vitest configuration file in your TypeScript project.

For example, create `Pressable.spec.tsx`:

```tsx
import { expect, it, vi } from 'vitest';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

it('should call the press handler', async () => {
  const onPress = vi.fn();

  await render(
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Text>Continue</Text>
    </Pressable>,
  );

  const button = screen.getByRole('button', { name: 'Continue' });

  expect(button).toBeOnTheScreen();

  await fireEvent.press(button);

  expect(onPress).toHaveBeenCalledOnce();
});
```

Run the test with `npx vitest run` or `yarn vitest run`.

## Options

The application must install any selected Babel plugins and vendor test helpers. Add Babel plugins through `babelPlugins`; the application's Babel config is not loaded automatically.

```ts
reactNative({
  platform: 'android',
  babelPlugins: ['react-native-worklets/plugin'],
  nativeResolver: 'react-native-reanimated/jest/resolver',
  nativeSetupFiles: ['react-native-gesture-handler/jestSetup.js'],
  transformPackages: ['a-package-with-uncompiled-javascript'],
});
```

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `platform` | `'ios' \| 'android'` | `'ios'` | Select platform files, with `.native` and generic files as fallbacks. |
| `babelPlugins` | `string[]` | `[]` | Additional Babel plugins for application sources and native dependencies, such as Worklets. |
| `nativeResolver` | `string` | None | A library's synchronous test resolver, such as Reanimated's resolver. Receives `basedir`, `extensions` and `defaultResolver`. |
| `nativeSetupFiles` | `string[]` | `[]` | Vendor setup files evaluated before application setup files. Relative paths start at the Vitest project root. |
| `transformPackages` | `string[]` | `[]` | Additional packages that ship uncompiled JavaScript. Native packages and TypeScript dependencies are recognized automatically. |

See the sample's [configuration](sample/vitest.config.ts), [native setup](sample/native.setup.ts) and [test setup](sample/vitest.setup.ts) for a complete Reanimated and Worklets example.

### Native dependency mocks

`vi.mock` handles application imports. Dependencies loaded through CommonJS require
native mocks to be registered before their first import. Create `native.setup.ts` and register those mocks with the plugin's helper:

```ts
import { mockNativeModule } from '@wojtekmaj/vitest-react-native/native-mocks';

mockNativeModule(import('a-native-package'), () => ({
  readValue: () => 'test value',
}));
```

Add the setup file to `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import reactNative from '@wojtekmaj/vitest-react-native/testing-library';

export default defineConfig({
  plugins: [reactNative({ nativeSetupFiles: ['./native.setup.ts'] })],
});
```

Prefer a library's own test setup or mock when one is available.

## How it works

Tests run in Node.js. The plugin loads React Native's official test setup first, then your application's setup files. It selects the iOS or Android version of each native module and keeps React and React Native shared between your application and linked packages.

React Native libraries often contain JavaScript that Node.js cannot run directly, such as Flow types or JSX. The plugin compiles these libraries with React Native's Babel preset and loads them through Node's `require()`. Your application keeps its ES imports, so Vitest can handle `vi.mock()` as usual.

React Native's test setup and some library helpers use Jest APIs. The plugin connects those calls to Vitest. In your own tests, use Vitest APIs such as `vi.mock(import(...), ...)`.

Libraries that call device APIs still need mocks. Prefer the library's test helpers, or register a mock with `mockNativeModule()`. SVG imports render as a native `View`; images, fonts and media receive numeric placeholders. To check native binaries, appearance or device behavior, run tests on a device or simulator.

## License

The MIT License.

## Author

<table>
  <tr>
    <td >
      <img src="https://avatars.githubusercontent.com/u/5426427?v=4&s=128" width="64" height="64" alt="Wojciech Maj">
    </td>
    <td>
      <a href="https://github.com/wojtekmaj">Wojciech Maj</a>
    </td>
  </tr>
</table>

## Thank you

Thank you to [Vladimir Sheremet](https://github.com/sheremet-va) and the [Vitest community React Native plugin](https://github.com/vitest-community/vitest-react-native), [Simon Holmes](https://github.com/srsholmes) and his [React Native plugin](https://github.com/srsholmes/vitest-react-native), and [Daniel Fry](https://github.com/danfry1) and [vitest-native](https://github.com/danfry1/vitest-native). Their work helped us solve native module loading and mocking, and their issue reports helped us choose the cases to test.
