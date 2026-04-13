import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, ThemeName, THEMES, DEFAULT_THEME } from './theme';

const THEME_KEY = 'app_theme';

interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  themeName: 'default',
  setTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeName>('default');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val && val in THEMES) setThemeNameState(val as ThemeName);
    });
  }, []);

  const setTheme = async (name: ThemeName) => {
    await AsyncStorage.setItem(THEME_KEY, name);
    setThemeNameState(name);
  };

  return (
    <ThemeContext.Provider value={{ theme: THEMES[themeName], themeName, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
