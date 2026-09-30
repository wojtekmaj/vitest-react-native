import { describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';

import App from './App.js';

describe('<App /> component', () => {
  it('should save state through an animated screen and navigates to another tab', async () => {
    await render(<App />);

    await fireEvent.press(screen.getByRole('button', { name: 'Save counter' }));

    expect(await screen.findByText('Saved: 1')).toBeOnTheScreen();
    expect(await AsyncStorage.getItem('count')).toBe('1');

    await fireEvent.press(screen.getByText('Details', { exact: true }));

    expect(await screen.findByText('Details screen')).toBeOnTheScreen();
  });
});
