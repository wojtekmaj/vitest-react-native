# Vitest React Native sample

A small React Native application with unit and component tests. `src/App.tsx` combines an animated counter, persistent storage, SVG, safe area context, gestures and real bottom tab navigation. Native host projects come from the official React Native 0.87 template.

## Directory structure

- `src/App.tsx` is the runnable demo. Other source modules demonstrate individual libraries and have sibling tests.
- `ios/` and `android/` are native host projects from the React Native template.
- `vitest.config.ts`, `vitest.setup.ts` and `native.setup.ts` configure JavaScript tests and vendor mocks.
- `../test/fixtures/` contains private consumer and dependency fixtures. `unit-only` verifies a copied distribution without RNTL or a renderer, including a relative Vite root; `native-entry` exercises native entry points, platform files and shared contexts; `uncompiled` ships raw JSX; `exports`, `legacy` and `unbuilt` cover package entry resolution.

The fixtures are test inputs, not additional applications or published packages.

## Run the unit tests

From the plugin root, build the local package. Then install and test this application:

```sh
yarn build
cd sample
yarn install --immutable
yarn test
NATIVE_PLATFORM=android yarn test
```

Both platforms run the same assertions. No emulator or browser is used. Each dependency is resolved from this project's lockfile; the plugin uses a local symlink and the dependency fixtures use Yarn portals.

## Run the application

```sh
yarn start
yarn android
```

For iOS, install the development pods first:

```sh
export BUNDLE_PATH=vendor/bundle
bundle install
cd ios
bundle exec pod install
cd ..
yarn ios
```

Use Xcode 26.x for React Native 0.87. If another Xcode version is selected globally, set `DEVELOPER_DIR` to the Xcode 26.x developer directory when installing pods and running the app.

Android device and emulator execution requires a Java runtime and Android SDK.

Ruby and CocoaPods lockfiles, the shared Xcode workspace, and CocoaPods' project and privacy manifest updates are committed. Dependencies, build outputs and machine-specific Xcode settings are ignored, so installing pods and running the app should leave Git clean.

## What the suite exercises

| Library | Behavior under test |
| --- | --- |
| React Navigation, bottom tabs | Navigate after persisting an animated screen's counter |
| React Navigation native stack, Screens | Navigate using the real stack and screen components |
| Reanimated, Worklets | Compile worklets and advance a real JS test animation with Vitest timers |
| Gesture Handler | Dispatch pan gesture events and update a native view |
| Safe Area Context, SVG | Render the composite application with safe area contexts and native SVG components |
| FlashList | Render and update list data |
| AsyncStorage | Persist and read values with the vendor memory implementation |
| MMKV | Update a subscribed native component using the library's own test storage |
| Zustand | Share state between a native view and the store |
| NetInfo | Render the connection state from the vendor native boundary mock |
| WebView | Deliver a native message event to the application callback |
| styled-components | Share a theme across ESM application and CommonJS linked dependency |
| React Router Native | Share navigation context across the same module boundary |

`src/resolution.spec.tsx` also checks `react-native` entry points, CommonJS consumers, platform files, portals and a dependency that ships uncompiled JSX. The application uses the React Vite plugin alongside native dependency compilation.

## Native boundary setup

The suite runs real library JavaScript. The setup explicitly names the native boundaries that need mocks:

- The plugin loads React Native's official test preset.
- `native.setup.ts` registers Worklets' official mock and a minimal Nitro bridge through `mockNativeModule`. Its `createHybridObject` throws if a test accidentally enters the native implementation; MMKV itself supplies its normal test storage.
- Gesture Handler uses its official setup file. Reanimated uses its official resolver and `setUpTests`, with the real animation implementation rather than its whole-library mock.
- Safe Area Context, AsyncStorage and NetInfo use their vendor mocks.
- WebView's TurboModule bridge has the concrete methods used by this suite; the React component and its event handling run normally.

These mocks do not validate C++, Java, Swift, real WebView content, device network state or physical gesture recognition. They exercise the JavaScript boundary expected in native unit tests.
