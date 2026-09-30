import { describe, expect, it, vi } from 'vitest';
import { Platform } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { getNativeEntries, NativeDependencies } from './resolution.js';

vi.mock(import('./resolution.js'), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    getNativeEntries: vi.fn(actual.getNativeEntries),
  };
});

describe('getNativeEntries()', () => {
  it('should use the native package entry for both imports and CommonJS dependencies', () => {
    const entries = getNativeEntries();

    expect(entries).toEqual({
      commonJs: 'native',
      esm: 'native',
    });
    expect(getNativeEntries).toHaveBeenCalledOnce();
  });
});

describe('<NativeDependencies /> component', () => {
  it('should resolve platform files from an installed native dependency', async () => {
    await render(<NativeDependencies />);

    const expected = Platform.OS === 'ios' ? 'iOS' : 'Android';

    expect(screen.getByText(expected)).toBeOnTheScreen();
  });

  it('should compile an explicitly configured JSX dependency', async () => {
    await render(<NativeDependencies />);

    expect(screen.getByText('Uncompiled JSX')).toBeOnTheScreen();
  });
});
