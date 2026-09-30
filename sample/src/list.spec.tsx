import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react-native';

import { ProductList } from './list.js';

const products = [
  {
    id: 'coffee',
    name: 'Coffee',
  },
  {
    id: 'tea',
    name: 'Tea',
  },
];

describe('<ProductList /> component', () => {
  it('should render list items after layout and updates its data', async () => {
    const { rerender } = await render(<ProductList products={products} />);

    expect(await screen.findByText('Coffee')).toBeOnTheScreen();

    await rerender(
      <ProductList
        products={[
          ...products,
          {
            id: 'juice',
            name: 'Juice',
          },
        ]}
      />,
    );

    expect(await screen.findByText('Juice')).toBeOnTheScreen();
  });
});
