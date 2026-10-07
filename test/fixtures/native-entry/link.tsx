import { Pressable, Text } from 'react-native';
import { useNavigate } from 'react-router';

export default function NativeLink() {
  const navigate = useNavigate();

  return (
    <Pressable onPress={() => navigate('/done')}>
      <Text>Navigate from dependency</Text>
    </Pressable>
  );
}
