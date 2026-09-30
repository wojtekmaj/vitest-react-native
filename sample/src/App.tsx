import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

const Tabs = createBottomTabNavigator();

function Home() {
  const [count, setCount] = useState(0);
  const opacity = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <SafeAreaView>
      <Animated.View style={style}>
        <Text>Saved: {count}</Text>
        <Svg accessibilityLabel="Status icon" width={24} height={24}>
          <Circle cx={12} cy={12} r={10} fill="green" />
        </Svg>
      </Animated.View>
      <Pressable
        accessibilityRole="button"
        onPress={async () => {
          const next = count + 1;
          await AsyncStorage.setItem('count', String(next));
          opacity.value = withTiming(0.5);
          setCount(next);
        }}
      >
        <Text>Save counter</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Details() {
  return (
    <View>
      <Text>Details screen</Text>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, bottom: 34, left: 0, right: 0 },
        }}
      >
        <NavigationContainer>
          <Tabs.Navigator screenOptions={{ animation: 'none' }}>
            <Tabs.Screen name="Home" component={Home} />
            <Tabs.Screen name="Details" component={Details} />
          </Tabs.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
