import { Platform } from 'react-native';

export function getPlatform(): string {
  return Platform.OS;
}
