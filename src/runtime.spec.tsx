import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { Animated, Platform, Pressable, Text, TextInput, useAnimatedValue } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <Pressable accessibilityRole="button" onPress={() => setCount(count + 1)}>
      <Text>{count}</Text>
    </Pressable>
  );
}

function Field() {
  const [value, setValue] = useState('');

  return <TextInput accessibilityLabel="Name" onChangeText={setValue} value={value} />;
}

function DelayedText() {
  const [visible, setVisible] = useState(false);

  return (
    <Pressable onPress={() => setTimeout(() => setVisible(true), 100)}>
      <Text>{visible ? 'Ready' : 'Waiting'}</Text>
    </Pressable>
  );
}

function AnimatedBalance() {
  const value = useAnimatedValue(0);
  const [balance, setBalance] = useState(0);

  return (
    <Pressable
      onPress={() => {
        value.addListener(({ value: nextValue }) => setBalance(nextValue));
        Animated.spring(value, { toValue: 123, useNativeDriver: false }).start();
      }}
    >
      <Text>{balance}</Text>
    </Pressable>
  );
}

describe('installRuntime()', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render native components', async () => {
    await render(<Text>Hello, native</Text>);

    expect(screen.getByText('Hello, native')).toBeOnTheScreen();
  });

  it('should update a native component after user interaction', async () => {
    await render(<Counter />);

    await fireEvent.press(screen.getByRole('button'));

    expect(screen.getByText('1')).toBeOnTheScreen();
  });

  it('should update a native text input', async () => {
    await render(<Field />);

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Ada');

    expect(screen.getByDisplayValue('Ada')).toBeOnTheScreen();
  });

  it('should advance fake timers while waiting for native state', async () => {
    vi.useFakeTimers();

    await render(<DelayedText />);

    await fireEvent.press(screen.getByText('Waiting'));

    await waitFor(() => expect(screen.getByText('Ready')).toBeOnTheScreen());
  });

  it('should finish native animations synchronously in the test environment', async () => {
    await render(<AnimatedBalance />);

    await fireEvent.press(screen.getByText('0'));

    expect(screen.getByText('123')).toBeOnTheScreen();
    expect(Platform.isTesting).toBe(true);
  });

  it('should start each test with an empty native screen', () => {
    expect(screen.isDetached).toBe(true);
  });

  it('should report an unresolved dependency without recursive resolution', () => {
    const require = createRequire(import.meta.url);

    expect(() => require('vitest-native-missing-dependency')).toThrow(
      /Cannot find (?:module|package)/,
    );
  });
});
