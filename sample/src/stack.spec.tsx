import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { NativeStack } from './stack.js';

describe('<NativeStack /> component', () => {
  it('should navigate using real screens and the native stack router', async () => {
    await render(<NativeStack />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Open details' }));

    expect(await screen.findByText('Stack details')).toBeOnTheScreen();
  });
});
