import { describe, expect, expectTypeOf, it } from 'vitest';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import './testing-library.js';

describe('Testing Library integration', () => {
  it('should provide native component assertions', async () => {
    await render(<Text>Hello, native</Text>);

    const text = screen.getByText('Hello, native');

    expect(text).toHaveTextContent('Hello, native');
    expectTypeOf(expect(text).toHaveTextContent).returns.toEqualTypeOf<void>();
  });

  it('should provide native assertions for resolved promises', async () => {
    await render(<Text>Hello, native</Text>);

    const text = Promise.resolve(screen.getByText('Hello, native'));

    await expect(text).resolves.toHaveTextContent('Hello, native');
    expectTypeOf(expect(text).resolves.toHaveTextContent).returns.toEqualTypeOf<Promise<void>>();
  });

  it('should provide asymmetric native assertions', async () => {
    await render(<Text>Hello, native</Text>);

    expect({ text: screen.getByText('Hello, native') }).toEqual({
      text: expect.toHaveTextContent('Hello, native'),
    });
  });
});
