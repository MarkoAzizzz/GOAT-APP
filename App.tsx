import './global.css';
import './src/theme/interop';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GoatThemeProvider } from './src/theme/ThemeProvider';
import { ComponentPreviewScreen } from './src/screens/ComponentPreviewScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <GoatThemeProvider>
        <ComponentPreviewScreen />
        <StatusBar style="light" />
      </GoatThemeProvider>
    </SafeAreaProvider>
  );
}
