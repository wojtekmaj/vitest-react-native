import { Pressable, Text } from 'react-native';
import { createMMKV, useMMKVString } from 'react-native-mmkv';
import { create } from 'zustand';

export const storage = createMMKV({ id: 'kitchen-sink' });

export function StoredName() {
  const [name, setName] = useMMKVString('name', storage);

  return (
    <Pressable onPress={() => setName('Ada')}>
      <Text>{name ?? 'Set name'}</Text>
    </Pressable>
  );
}

export const useCounter = create<{ count: number; increment: () => void }>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

export function Counter() {
  const { count, increment } = useCounter();

  return (
    <Pressable onPress={increment}>
      <Text>Count: {count}</Text>
    </Pressable>
  );
}
