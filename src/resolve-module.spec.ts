import { cpSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { actualPrefix, mockSuffix } from './preset.js';
import { getExtensions } from './resolve.js';
import { createResolveHook } from './resolve-module.js';

import type { NativeRuntime } from './runtime-types.js';

describe('createResolveHook()', () => {
  let directory: string;
  let require: NodeJS.Require;
  let hooks: ReturnType<typeof registerHooks>;
  let loadedFiles: Set<string>;
  let factories: Map<string, () => unknown>;

  beforeEach(() => {
    directory = realpathSync(mkdtempSync(join(tmpdir(), 'native-package-resolution-')));
    const root = join(directory, 'app');

    require = createRequire(join(root, 'package.json'));
    loadedFiles = new Set();
    factories = new Map();

    for (const name of ['legacy', 'exports', 'unbuilt']) {
      cpSync(
        new URL(`../test/fixtures/${name}`, import.meta.url),
        join(root, 'node_modules/@vitest-native-fixture', name),
        { recursive: true },
      );
    }

    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'application' }));
    cpSync(
      new URL('../test/fixtures/linked-consumer', import.meta.url),
      join(directory, 'linked'),
      { recursive: true },
    );

    const runtime: NativeRuntime = {
      root,
      options: {},
      require,
      sharedModules: new Map(),
      nativeRoot: '',
      extensions: getExtensions(process.env.NATIVE_PLATFORM ?? 'ios'),
      compilerDirectories: [],
      nativeSetupFiles: [],
      factories,
      loadedFiles,
    };

    hooks = registerHooks({ resolve: createResolveHook(runtime) });
  });

  afterEach(() => {
    hooks?.deregister();

    for (const filename of Object.keys(require.cache)) {
      if (filename.startsWith(directory)) {
        delete require.cache[filename];
      }
    }

    rmSync(directory, { recursive: true, force: true });
  });

  it('should resolve an ordinary package main', () => {
    expect(require('@vitest-native-fixture/legacy')).toBe('legacy main');
  });

  it('should resolve built-in modules from compiled CommonJS dependencies', () => {
    const filename = require.resolve('@vitest-native-fixture/legacy/builtins');

    loadedFiles.add(filename);

    expect(require(filename)).toBe(require('node:module'));
  });

  it('should prefer native exports over the legacy native field', () => {
    expect(require('@vitest-native-fixture/exports')).toBe('native export');
  });

  it('should preserve an exact export when platform siblings exist', () => {
    expect(require('@vitest-native-fixture/exports/exact')).toBe('exact export');
  });

  it("should prefer a linked consumer's own dependency over the application peer", () => {
    const dependencyDirectory = join(
      directory,
      'linked/node_modules/@vitest-native-fixture/exports',
    );

    cpSync(new URL('../test/fixtures/exports', import.meta.url), dependencyDirectory, {
      recursive: true,
    });
    writeFileSync(join(dependencyDirectory, 'exported.js'), "module.exports = 'linked export';");

    const linkedRequire: NodeJS.Require = require(join(directory, 'linked/index.js'));

    expect(linkedRequire('@vitest-native-fixture/exports')).toBe('linked export');
  });

  it.each`
    request                                        | expected
    ${'@vitest-native-fixture/exports'}            | ${'native export'}
    ${'@vitest-native-fixture/exports/exact'}      | ${'exact export'}
    ${'@vitest-native-fixture/exports/unexported'} | ${'legacy subpath'}
  `(
    'should resolve $request from the application for a linked consumer',
    ({ request, expected }) => {
      const linkedRequire: NodeJS.Require = require(join(directory, 'linked/index.js'));

      expect(linkedRequire(request)).toBe(expected);
    },
  );

  it('should resolve an unbuilt package through its native entry', () => {
    expect(require('@vitest-native-fixture/unbuilt')).toBe('unbuilt native');
  });

  it('should resolve peer mocks and bypass them for actual imports from a linked consumer', () => {
    const filename = join(directory, 'app/node_modules/@vitest-native-fixture/exports/exported.js');
    const linkedRequire: NodeJS.Require = require(join(directory, 'linked/index.js'));

    factories.set(filename, () => 'mocked peer');

    expect(linkedRequire.resolve('@vitest-native-fixture/exports')).toBe(filename + mockSuffix);
    expect(linkedRequire.resolve(`${actualPrefix}@vitest-native-fixture/exports`)).toBe(filename);
    expect(linkedRequire(`${actualPrefix}@vitest-native-fixture/exports`)).toBe('native export');
  });

  it('should use legacy resolution for a subpath outside the export map', () => {
    expect(require('@vitest-native-fixture/exports/unexported')).toBe('legacy subpath');
  });
});
