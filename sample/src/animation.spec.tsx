import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { ExpandingCard } from './animation.js';

describe('<ExpandingCard /> component', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should advance a worklet animation with Vitest fake timers', async () => {
    vi.useFakeTimers();

    await render(<ExpandingCard />);

    expect(screen.getByTestId('card')).toHaveAnimatedStyle({ width: 0 });

    await fireEvent.press(screen.getByText('Expand'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(screen.getByTestId('card')).toHaveAnimatedStyle({
      width: 200,
    });
  });
});
