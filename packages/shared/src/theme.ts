/*
 * Copyright 2025 BigRack.dev
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * BigRack.dev Design System - Theme Configuration
 *
 * Shared theme configuration for dashboard and marketing website
 * Colors, typography, and design tokens
 */

/**
 * Color Palette
 *
 * BigRack uses a color scheme based on industrial/material concepts:
 * - Rack/Repo: Main structural element color
 * - Pallet/Project: Organizational grouping color
 * - Box/Ticket: Individual task/container color
 */
export const colors = {
  // Primary colors - represent BigRack concepts
  rack: {
    DEFAULT: '#79959c', // Repo color - main structure
    hex: '#79959c',
    hsl: '192 23% 54%',
    rgb: 'rgb(121, 149, 156)',
  },
  pallet: {
    DEFAULT: '#7b6b43', // Project color - organizational grouping
    hex: '#7b6b43',
    hsl: '40 29% 38%',
    rgb: 'rgb(123, 107, 67)',
  },
  box: {
    DEFAULT: '#e1bb80', // Ticket color - individual tasks/containers
    hex: '#e1bb80',
    hsl: '36 66% 70%',
    rgb: 'rgb(225, 187, 128)',
  },

  // Semantic colors derived from primary palette
  primary: '#79959c', // Alias for repo
  secondary: '#7b6b43', // Alias for project
  accent: '#e1bb80', // Alias for ticket

  // Neutral colors (for UI elements)
  background: {
    light: '#ffffff',
    dark: '#121212',
    muted: {
      light: '#f5f5f5',
      dark: '#262626',
    },
  },

  text: {
    primary: {
      light: '#1a1a1a',
      dark: '#fafafa',
    },
    secondary: {
      light: '#737373',
      dark: '#a6a6a6',
    },
  },

  border: {
    light: '#e5e5e5',
    dark: '#333333',
  },

  // Status colors
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
} as const;

/**
 * Typography
 *
 * Title font: Oswald (Google Fonts)
 * - Free and open source (SIL Open Font License)
 * - Commercial use allowed
 * - Bold industrial sans-serif with condensed proportions
 * - Available on Google Fonts: https://fonts.google.com/specimen/Oswald
 *
 * Body font: Inter (Google Fonts)
 * - Free and open source (SIL Open Font License)
 * - Commercial use allowed
 * - Highly readable, modern sans-serif optimized for UI
 * - Available on Google Fonts: https://fonts.google.com/specimen/Inter
 *
 * Monospace font: IBM Plex Mono (for code)
 */
export const typography = {
  fontFamily: {
    sans: [
      'Inter',
      'system-ui',
      '-apple-system',
      'BlinkMacSystemFont',
      'Segoe UI',
      'Roboto',
      'sans-serif',
    ],
    title: ['Oswald', 'system-ui', 'sans-serif'],
    mono: ['IBM Plex Mono', 'Consolas', 'monospace'],
  },

  fontSizes: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
  },

  fontWeights: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

/**
 * Spacing Scale
 */
export const spacing = {
  0: '0',
  1: '0.25rem', // 4px
  2: '0.5rem', // 8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
} as const;

/**
 * Border Radius
 */
export const borderRadius = {
  none: '0',
  sm: '0.125rem', // 2px
  base: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  '2xl': '1rem', // 16px
  full: '9999px',
} as const;

/**
 * Shadows
 */
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;

/**
 * Breakpoints for responsive design
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Z-index scale
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modal: 1040,
  popover: 1050,
  tooltip: 1060,
} as const;

/**
 * Animation durations
 */
export const transitions = {
  fast: '150ms',
  base: '200ms',
  slow: '300ms',
} as const;

/**
 * Theme configuration object
 * Can be used with Tailwind CSS or other styling solutions
 */
export const theme = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  zIndex,
  transitions,
} as const;

/**
 * Type exports for TypeScript
 */
export type Theme = typeof theme;
export type Colors = typeof colors;
export type Typography = typeof typography;
