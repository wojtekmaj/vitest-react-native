import { useState } from 'react';
import { Text, View } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from 'react-native-gesture-handler';

export function DraggableCard() {
  const [offset, setOffset] = useState(0);

  const pan = usePanGesture({
    onUpdate({ translationX }) {
      setOffset(translationX);
    },
    runOnJS: true,
    testID: 'drag',
  });

  return (
    <GestureHandlerRootView>
      <GestureDetector gesture={pan}>
        <View>
          <Text>Offset: {offset}</Text>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
