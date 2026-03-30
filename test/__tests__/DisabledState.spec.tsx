import React from 'react';
import { test, expect, describe } from 'vitest';
import { render, screen } from '@testing-library/react-native';
import '@testing-library/react-native/extend-expect';
import {
  TouchableOpacity,
  TouchableHighlight,
  TouchableWithoutFeedback,
  TouchableNativeFeedback,
  Pressable,
  Button,
  Switch,
  TextInput,
  Text,
  View,
} from 'react-native';

/**
 * Issue #16: .toBeDisabled() doesn't work as expected
 *
 * RNTL's toBeDisabled()/toBeEnabled() check accessibilityState.disabled,
 * not the raw `disabled` prop. Our mocks must map disabled → accessibilityState.disabled
 * like real React Native does.
 */
describe('disabled state (issue #16)', () => {
  describe('TouchableOpacity', () => {
    test('toBeDisabled works when disabled={true}', () => {
      render(
        <TouchableOpacity accessibilityRole="button" disabled={true} onPress={() => {}}>
          <Text>Click me</Text>
        </TouchableOpacity>
      );
      const button = screen.getByRole('button', { name: /Click me/ });
      expect(button).toBeDisabled();
    });

    test('toBeEnabled works when disabled={false}', () => {
      render(
        <TouchableOpacity accessibilityRole="button" disabled={false} onPress={() => {}}>
          <Text>Click me</Text>
        </TouchableOpacity>
      );
      const button = screen.getByRole('button', { name: /Click me/ });
      expect(button).toBeEnabled();
    });

    test('toBeEnabled works when no disabled prop', () => {
      render(
        <TouchableOpacity accessibilityRole="button" onPress={() => {}}>
          <Text>Click me</Text>
        </TouchableOpacity>
      );
      const button = screen.getByRole('button', { name: /Click me/ });
      expect(button).toBeEnabled();
    });

    test('preserves existing accessibilityState props', () => {
      render(
        <TouchableOpacity
          testID="touchable"
          disabled={true}
          accessibilityState={{ busy: true }}
        >
          <Text>Click me</Text>
        </TouchableOpacity>
      );
      const el = screen.getByTestId('touchable');
      expect(el).toBeDisabled();
      expect(el).toBeBusy();
    });
  });

  describe('TouchableHighlight', () => {
    test('toBeDisabled works when disabled={true}', () => {
      render(
        <TouchableHighlight accessibilityRole="button" disabled={true} onPress={() => {}}>
          <Text>Click me</Text>
        </TouchableHighlight>
      );
      const button = screen.getByRole('button', { name: /Click me/ });
      expect(button).toBeDisabled();
    });

    test('toBeEnabled works when disabled={false}', () => {
      render(
        <TouchableHighlight accessibilityRole="button" disabled={false} onPress={() => {}}>
          <Text>Click me</Text>
        </TouchableHighlight>
      );
      const button = screen.getByRole('button', { name: /Click me/ });
      expect(button).toBeEnabled();
    });
  });

  describe('TouchableWithoutFeedback', () => {
    test('toBeDisabled works when disabled={true}', () => {
      render(
        <TouchableWithoutFeedback accessibilityRole="button" disabled={true} onPress={() => {}}>
          <Text>Click me</Text>
        </TouchableWithoutFeedback>
      );
      const button = screen.getByRole('button', { name: /Click me/ });
      expect(button).toBeDisabled();
    });
  });

  describe('TouchableNativeFeedback', () => {
    test('toBeDisabled works when disabled={true}', () => {
      render(
        <TouchableNativeFeedback accessibilityRole="button" disabled={true} onPress={() => {}}>
          <Text>Click me</Text>
        </TouchableNativeFeedback>
      );
      const button = screen.getByRole('button', { name: /Click me/ });
      expect(button).toBeDisabled();
    });
  });

  describe('Pressable', () => {
    test('toBeDisabled works when disabled={true}', () => {
      render(
        <Pressable accessibilityRole="button" disabled={true} onPress={() => {}}>
          <Text>Click me</Text>
        </Pressable>
      );
      const button = screen.getByRole('button', { name: /Click me/ });
      expect(button).toBeDisabled();
    });

    test('toBeEnabled works when disabled={false}', () => {
      render(
        <Pressable accessibilityRole="button" disabled={false} onPress={() => {}}>
          <Text>Click me</Text>
        </Pressable>
      );
      const button = screen.getByRole('button', { name: /Click me/ });
      expect(button).toBeEnabled();
    });
  });

  describe('Button', () => {
    test('toBeDisabled works when disabled={true}', () => {
      render(<Button title="Click me" disabled={true} onPress={() => {}} />);
      const button = screen.getByRole('button', { name: /Click me/ });
      expect(button).toBeDisabled();
    });

    test('toBeEnabled works when disabled={false}', () => {
      render(<Button title="Click me" disabled={false} onPress={() => {}} />);
      const button = screen.getByRole('button', { name: /Click me/ });
      expect(button).toBeEnabled();
    });
  });

  describe('Switch', () => {
    test('toBeDisabled works when disabled={true}', () => {
      render(<Switch testID="switch" disabled={true} />);
      const sw = screen.getByTestId('switch');
      expect(sw).toBeDisabled();
    });

    test('toBeEnabled works when disabled={false}', () => {
      render(<Switch testID="switch" disabled={false} />);
      const sw = screen.getByTestId('switch');
      expect(sw).toBeEnabled();
    });
  });

  describe('TextInput', () => {
    test('toBeDisabled works when editable={false}', () => {
      render(<TextInput testID="input" editable={false} />);
      const input = screen.getByTestId('input');
      expect(input).toBeDisabled();
    });

    test('toBeEnabled works when editable={true}', () => {
      render(<TextInput testID="input" editable={true} />);
      const input = screen.getByTestId('input');
      expect(input).toBeEnabled();
    });
  });

  describe('ancestor disabled propagation', () => {
    test('child is disabled when parent is disabled', () => {
      render(
        <TouchableOpacity disabled={true}>
          <View testID="child">
            <Text>Inside disabled parent</Text>
          </View>
        </TouchableOpacity>
      );
      const child = screen.getByTestId('child');
      expect(child).toBeDisabled();
    });
  });
});
