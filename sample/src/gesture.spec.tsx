import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react-native';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { DraggableCard } from './gesture.js';

describe('<DraggableCard /> component', () => {
  it('should update a native view from a pan gesture', async () => {
    await render(<DraggableCard />);

    await act(async () => {
      fireGestureHandler(getByGestureTestId('drag'), [
        { state: State.BEGAN, translationX: 0 },
        { state: State.ACTIVE, translationX: 0 },
        { state: State.ACTIVE, translationX: 75 },
        { state: State.END, translationX: 75 },
      ]);
    });

    expect(screen.getByText('Offset: 75')).toBeOnTheScreen();
  });
});
