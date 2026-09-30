import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

const require = createRequire(import.meta.url);

const directory = mkdtempSync(join(tmpdir(), 'vitest-react-native-unit-only-'));

/**
 * Install outside the repository so ancestor node_modules cannot provide an
 * undeclared Testing Library or renderer dependency to this consumer.
 */
function runYarn(args: string[]): void {
  const result = spawnSync('corepack', ['yarn', ...args], {
    cwd: directory,
    env: { ...process.env, YARN_ENABLE_IMMUTABLE_INSTALLS: 'false' },
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`Unit-only consumer failed: yarn ${args.join(' ')}`);
  }
}

try {
  cpSync(join(packageRoot, 'test/fixtures/unit-only'), directory, { recursive: true });

  /**
   * Copy the distributable files so this consumer installs the package's declared
   * dependencies instead of borrowing them from the development checkout.
   */
  const pluginDirectory = join(directory, 'plugin');

  cpSync(join(packageRoot, 'dist'), join(pluginDirectory, 'dist'), { recursive: true });
  cpSync(join(packageRoot, 'package.json'), join(pluginDirectory, 'package.json'));

  const dependencies = [
    '@react-native/babel-preset',
    '@react-native/jest-preset',
    '@types/node',
    '@types/react',
    'react',
    'react-native',
    'typescript',
    'vite',
    'vitest',
  ].map((name) => {
    const manifest = JSON.parse(readFileSync(require.resolve(`${name}/package.json`), 'utf8'));

    return `${name}@${manifest.version}`;
  });

  runYarn(['add', '--dev', ...dependencies, '@wojtekmaj/vitest-react-native@portal:./plugin']);

  const consumerRequire = createRequire(join(directory, 'package.json'));

  /**
   * Vitest 4 installs Vite as a dependency. Keep that copy at the version under
   * test so its configuration types agree with the consumer's Vite plugin types.
   */
  const viteRange = consumerRequire('vitest/package.json').dependencies?.vite;

  if (viteRange) {
    runYarn([
      'set',
      'resolution',
      `vite@npm:${viteRange}`,
      `npm:${require('vite/package.json').version}`,
    ]);
    runYarn(['install']);
  }

  runYarn(['dedupe']);

  for (const name of ['@testing-library/react-native', 'test-renderer']) {
    try {
      consumerRequire.resolve(name);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
        continue;
      }

      throw error;
    }

    throw new Error(`Unit-only consumer unexpectedly resolves ${name}`);
  }

  runYarn(['tsc']);
  runYarn(['unit']);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
