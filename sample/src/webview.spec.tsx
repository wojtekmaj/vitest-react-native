import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { NativeBrowser } from './webview.js';

describe('<NativeBrowser /> component', () => {
  it('should deliver a message from the native view to the application callback', async () => {
    const onMessage = vi.fn();

    await render(<NativeBrowser onMessage={onMessage} />);

    await fireEvent(screen.getByTestId('browser'), 'message', { nativeEvent: { data: 'ready' } });

    expect(onMessage).toHaveBeenCalledWith({ nativeEvent: { data: 'ready' } });
  });
});
