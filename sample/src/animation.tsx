import { Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export function ExpandingCard() {
  const width = useSharedValue(0);

  const style = useAnimatedStyle(() => ({ width: width.value }));

  return (
    <>
      <Animated.View testID="card" style={style} />
      <Pressable
        onPress={() => {
          width.value = withTiming(200, { duration: 300 });
        }}
      >
        <Text>Expand</Text>
      </Pressable>
    </>
  );
}
