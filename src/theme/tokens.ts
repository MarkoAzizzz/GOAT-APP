import { vars } from 'nativewind';

/**
 * Ported 1:1 from frontend/src/index.css. Dark is GOAT's default/original
 * palette; light is the explicit override — same relationship as the web app.
 * Accent colors (red, chart colors) intentionally do not change between themes.
 */
export const darkTheme = vars({
  '--c-bg-base': '5 5 5',
  '--c-bg-surface': '10 10 10',
  '--c-bg-elevated': '13 13 13',
  '--c-bg-input': '8 8 8',
  '--c-bg-header': '15 15 15',
  '--c-text-primary': '245 245 245',
  '--c-text-secondary': '155 163 167',
  '--c-overlay': '255 255 255',
  '--c-chart-amber-rgb': '245 158 11',
  '--c-chart-green-rgb': '16 185 129',
  '--c-chart-blue-rgb': '59 130 246',
  '--c-chart-purple-rgb': '168 85 247',
  '--c-chart-teal-rgb': '20 184 166',
});

export const lightTheme = vars({
  '--c-bg-base': '222 224 227',
  '--c-bg-surface': '241 243 245',
  '--c-bg-elevated': '241 243 245',
  '--c-bg-input': '235 237 239',
  '--c-bg-header': '255 255 255',
  '--c-text-primary': '17 19 21',
  '--c-text-secondary': '60 65 70',
  '--c-overlay': '17 19 21',
  '--c-chart-amber-rgb': '180 83 9',
  '--c-chart-green-rgb': '4 120 87',
  '--c-chart-blue-rgb': '29 78 216',
  '--c-chart-purple-rgb': '126 34 206',
  '--c-chart-teal-rgb': '15 118 110',
});

export const GOAT_RED = '#E11919';
export const GOAT_RED_SOFT = 'rgba(225,25,25,0.16)';

export type ThemeName = 'dark' | 'light';
