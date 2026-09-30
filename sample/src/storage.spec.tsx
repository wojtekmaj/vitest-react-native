import { describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { Counter, StoredName, storage, useCounter } from './storage.js';

describe('AsyncStorage', () => {
  it('should write and reads AsyncStorage using the vendor memory adapter', async () => {
    await AsyncStorage.setItem('language', 'pl');

    expect(await AsyncStorage.getItem('language')).toBe('pl');
  });
});

describe('<StoredName /> component', () => {
  it('should update a native component subscribed to MMKV', async () => {
    await render(<StoredName />);

    await fireEvent.press(screen.getByText('Set name'));

    expect(screen.getByText('Ada')).toBeOnTheScreen();
    expect(storage.getString('name')).toBe('Ada');
  });
});

describe('<Counter /> component', () => {
  it('should share Zustand state between a native view and the store', async () => {
    await render(<Counter />);

    await fireEvent.press(screen.getByText('Count: 0'));

    expect(screen.getByText('Count: 1')).toBeOnTheScreen();
    expect(useCounter.getState().count).toBe(1);
  });
});
