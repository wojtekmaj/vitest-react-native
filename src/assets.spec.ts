import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { View } from 'react-native';

describe('asset imports', () => {
  let directory: string;
  let require: NodeJS.Require;

  beforeEach(() => {
    directory = realpathSync(mkdtempSync(join(tmpdir(), 'native-assets-')));
    require = createRequire(join(directory, 'package.json'));

    mkdirSync(join(directory, 'nested'));
    writeFileSync(join(directory, 'image.png'), '');
    writeFileSync(join(directory, 'nested/image.png'), '');
    writeFileSync(join(directory, 'image.svg'), '');
    symlinkSync(join(directory, 'image.png'), join(directory, 'linked.png'));
  });

  afterEach(() => {
    for (const filename of Object.keys(require.cache)) {
      if (filename.startsWith(directory)) {
        delete require.cache[filename];
      }
    }

    rmSync(directory, { recursive: true, force: true });
  });

  it('should give different assets distinct numeric identities in both loaders', async () => {
    const first = await import(join(directory, 'image.png'));
    const second = await import(join(directory, 'nested/image.png'));

    expect(Number.isSafeInteger(first.default)).toBe(true);
    expect(first.default).toBeGreaterThan(0);
    expect(second.default).not.toBe(first.default);
    expect(require('./image.png')).toBe(first.default);
    expect(require('./nested/image.png')).toBe(second.default);
  });

  it('should preserve identity when the loaders encounter assets in different orders', async () => {
    const secondRequired = require('./nested/image.png');
    const firstRequired = require('./image.png');

    const first = await import(join(directory, 'image.png'));
    const second = await import(join(directory, 'nested/image.png'));

    expect(first.default).toBe(firstRequired);
    expect(second.default).toBe(secondRequired);
  });

  it('should resolve identical relative imports against their own importers', async () => {
    writeFileSync(join(directory, 'index.js'), "export { default } from './image.png';");
    writeFileSync(join(directory, 'nested/index.js'), "export { default } from './image.png';");

    const first = await import(join(directory, 'index.js'));
    const second = await import(join(directory, 'nested/index.js'));

    expect(first.default).toBe(require('./image.png'));
    expect(second.default).toBe(require('./nested/image.png'));
    expect(second.default).not.toBe(first.default);
  });

  it('should preserve identity through alternate paths and symlinks', async () => {
    writeFileSync(join(directory, 'index.js'), "export { default } from './image.png';");
    writeFileSync(join(directory, 'nested/index.js'), "export { default } from '../image.png';");

    const first = await import(join(directory, 'index.js'));
    const second = await import(join(directory, 'nested/index.js'));
    const linked = await import(join(directory, 'linked.png'));

    expect(second.default).toBe(first.default);
    expect(linked.default).toBe(first.default);
    expect(require('./nested/../image.png')).toBe(first.default);
    expect(require('./linked.png')).toBe(first.default);
  });

  it('should preserve SVG components in both loaders', async () => {
    const svg = await import(join(directory, 'image.svg'));

    expect(svg.default).toBe(View);
    expect(require('./image.svg')).toBe(View);
  });
});
