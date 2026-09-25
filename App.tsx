import './global.css';
import './src/theme/interop';
import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GoatThemeProvider } from './src/theme/ThemeProvider';
import { AuthProvider, useAuth } from './src/features/auth/AuthContext';
import { RootAuthScreen } from './src/screens/RootAuthScreen';
import { useGoatFonts } from './src/theme/fonts';

function Gate() {
  const { status } = useAuth();
  const [fontsLoaded] = useGoatFonts();

  if (!fontsLoaded || status === 'checking') {
    return <View style={{ flex: 1, backgroundColor: '#050505' }} />;
  }

  return <RootAuthScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GoatThemeProvider>
        <AuthProvider>
          <Gate />
          <StatusBar style="light" />
        </AuthProvider>
      </GoatThemeProvider>
    </SafeAreaProvider>
  );
}
