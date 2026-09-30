import { describe, expect, it } from 'vitest';
import NetInfo from '@react-native-community/netinfo';
import { render, screen } from '@testing-library/react-native';

import { NetworkStatus } from './network.js';

describe('<NetworkStatus /> component', () => {
  it('should show connection state supplied by the native boundary mock', async () => {
    await render(<NetworkStatus />);

    expect(screen.getByText('Online')).toBeOnTheScreen();
    expect(await NetInfo.fetch()).toMatchObject({ isConnected: true });
  });
});
