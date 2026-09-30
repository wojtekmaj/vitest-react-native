import { Text } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

export function NetworkStatus() {
  const { isConnected } = useNetInfo();

  return <Text>{isConnected ? 'Online' : 'Offline'}</Text>;
}
