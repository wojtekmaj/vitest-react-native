import { Pressable, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<{ Start: undefined; Details: undefined }>();

function Start({
  navigation,
}: NativeStackScreenProps<{ Start: undefined; Details: undefined }, 'Start'>) {
  return (
    <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Details')}>
      <Text>Open details</Text>
    </Pressable>
  );
}

function Details() {
  return <Text>Stack details</Text>;
}

export function NativeStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ animation: 'none' }}>
        <Stack.Screen name="Start" component={Start} />
        <Stack.Screen name="Details" component={Details} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
