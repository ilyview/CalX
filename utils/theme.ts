export type ThemeName = 'default' | 'minecraft';

export interface Theme {
  name: ThemeName;
  bg: string;
  card: string;
  cardBorder: string | null;
  accent: string;
  accentText: string; // text ON the accent color
  text: string;
  sub: string;
  radius: number;
  tabBarBg: string;
  tabBarBorder: string;
  modalBg: string;
  inputBg: string;
  // macro colors
  protein: string;
  carbs: string;
  fat: string;
  // misc
  progressBg: string;
  dangerText: string;
  successText: string;
}

export const DEFAULT_THEME: Theme = {
  name: 'default',
  bg: '#0d0d0d',
  card: '#1a1a1a',
  cardBorder: null,
  accent: '#a78bfa',
  accentText: '#ffffff',
  text: '#f0f0f0',
  sub: '#666666',
  radius: 14,
  tabBarBg: '#111111',
  tabBarBorder: '#1e1e1e',
  modalBg: '#181818',
  inputBg: '#222222',
  protein: '#60a5fa',
  carbs: '#fbbf24',
  fat: '#f87171',
  progressBg: '#252525',
  dangerText: '#f87171',
  successText: '#4ade80',
};

export const MINECRAFT_THEME: Theme = {
  name: 'minecraft',
  bg: '#1a1008',           // cave dark
  card: '#2d2010',         // dirt dark
  cardBorder: '#5a3d18',   // dirt lighter edge
  accent: '#5aac2e',       // grass green
  accentText: '#ffffff',
  text: '#fcffc5',         // classic MC parchment text
  sub: '#8a7a5a',
  radius: 3,               // blocky
  tabBarBg: '#1a1008',
  tabBarBorder: '#5a3d18',
  modalBg: '#221508',
  inputBg: '#150e04',
  protein: '#49c0c2',      // diamond blue
  carbs: '#ffaa00',        // gold
  fat: '#ff3a3a',          // redstone
  progressBg: '#150e04',
  dangerText: '#ff3a3a',
  successText: '#5aac2e',
};

export const THEMES: Record<ThemeName, Theme> = {
  default: DEFAULT_THEME,
  minecraft: MINECRAFT_THEME,
};
