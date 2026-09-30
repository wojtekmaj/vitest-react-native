import { Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';

export function ProductList({
  products,
}: {
  products: {
    id: string;
    name: string;
  }[];
}) {
  return (
    <FlashList
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <Text>{item.name}</Text>}
    />
  );
}
