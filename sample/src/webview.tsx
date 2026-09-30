import WebView from 'react-native-webview';

export function NativeBrowser({
  onMessage,
}: Pick<React.ComponentProps<typeof WebView>, 'onMessage'>) {
  return <WebView testID="browser" source={{ uri: 'https://example.com' }} onMessage={onMessage} />;
}
