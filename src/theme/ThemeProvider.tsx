import React, { createContext, useContext, useMemo, useState } from 'react';
import { View } from 'react-native';
import { darkTheme, lightTheme, ThemeName } from './tokens';

type ThemeContextValue = {
  theme: ThemeName;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
});

export const useGoatTheme = () => useContext(ThemeContext);

/**
 * Matches the web app: dark is the default/original palette, light is an
 * explicit opt-in. Applies the CSS-variable theme via NativeWind's vars()
 * on the root View so every `goat-*` Tailwind color resolves at runtime.
 */
export function GoatThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>('dark');

  const value = useMemo(
    () => ({ theme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, theme === 'dark' ? darkTheme : lightTheme]} className="flex-1 bg-goat-bg">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}
