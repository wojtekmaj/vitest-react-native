import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { NativeRouter, ThemedMessage } from './context.js';

describe('<ThemedMessage /> component', () => {
  it('should share the styled-components theme with a linked native dependency', async () => {
    await render(<ThemedMessage />);

    expect(screen.getByText('Themed message').props.style).toMatchObject({ color: 'purple' });
  });
});

describe('<NativeRouter /> component', () => {
  it('should share the router with a native dependency calling useNavigate', async () => {
    await render(<NativeRouter />);

    await fireEvent.press(screen.getByText('Navigate from dependency'));

    expect(screen.getByText('Destination')).toBeOnTheScreen();
  });
});
