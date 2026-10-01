import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

type PackageManifest = {
  version: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const packageRoot = fileURLToPath(new URL('..', import.meta.url));

const require = createRequire(import.meta.url);

const { values } = parseArgs({
  options: {
    babel: { type: 'string' },
    'react-native': { type: 'string' },
    'testing-library': { type: 'string' },
    minimum: { type: 'boolean' },
    sample: { type: 'boolean' },
  },
});

function runYarn(args: string[]): void {
  execFileSync('corepack', ['yarn', ...args], {
    cwd: packageRoot,
    env: { ...process.env, YARN_ENABLE_IMMUTABLE_INSTALLS: 'false' },
    stdio: 'inherit',
  });
}

function readPackageManifest(name: string): PackageManifest {
  return JSON.parse(readFileSync(require.resolve(`${name}/package.json`), 'utf8'));
}

if (values.babel) {
  runYarn(['up', `@babel/core@${values.babel}`]);
}

if (values['react-native']) {
  let version = values['react-native'];

  if (version === 'previous' || version === 'oldest') {
    const latestVersion = execFileSync('npm', ['view', 'react-native@latest', 'version'], {
      encoding: 'utf8',
    }).trim();
    const [major, minor] = latestVersion.split('.');

    version = `${major}.${Number(minor) - (version === 'previous' ? 1 : 2)}`;
  }

  runYarn(['up', `react-native@${version}`]);

  const reactNative = readPackageManifest('react-native');
  const reactVersion = reactNative.peerDependencies?.react?.replace(/^[~^]/, '');

  if (!reactVersion) {
    throw new Error('React Native does not declare a React peer dependency');
  }

  const dependencies = [
    `react-native@${reactNative.version}`,
    `@react-native/babel-preset@${reactNative.version}`,
    `@react-native/jest-preset@${reactNative.version}`,
    `react@${reactVersion}`,
  ];

  runYarn(['up', ...dependencies]);

  if (values.sample) {
    runYarn([
      '--cwd',
      'sample',
      'up',
      ...dependencies,
      `@react-native/metro-config@${reactNative.version}`,
    ]);
    runYarn(['--cwd', 'sample', 'dedupe']);
  }
}

if (values['testing-library']) {
  runYarn(['up', `@testing-library/react-native@${values['testing-library']}`]);
  runYarn([
    'add',
    '--dev',
    `react-test-renderer@${readPackageManifest('react').version}`,
    '@types/react-test-renderer',
  ]);
}

if (values.minimum) {
  runYarn(['up', 'vite@7.0.0', 'vitest@4.0.0']);

  const viteRange = readPackageManifest('vitest').dependencies?.vite;

  if (!viteRange) {
    throw new Error('Vitest 4 does not declare a Vite dependency');
  }

  runYarn(['set', 'resolution', `vite@npm:${viteRange}`, 'npm:7.0.0']);
  runYarn(['install']);
}

runYarn(['dedupe']);
