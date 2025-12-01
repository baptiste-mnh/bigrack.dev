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
 * CSS Variables Generator
 *
 * Generates CSS custom properties from the BigRack theme
 * for use in Tailwind CSS and other styling solutions
 */

import { colors } from './theme';

/**
 * Generate CSS variables string for BigRack theme
 * Returns a string that can be injected into :root or .dark selectors
 */
export function generateCSSVariables(mode: 'light' | 'dark' = 'light'): string {
  const isDark = mode === 'dark';

  if (isDark) {
    return `
    /* BigRack Brand Colors (same in dark mode) */
    --rack: ${colors.rack.hsl};
    --pallet: ${colors.pallet.hsl};
    --box: ${colors.box.hsl};

    /* Base Colors */
    --background: 0 0% 7%;
    --foreground: 0 0% 98%;

    /* Card & Popover */
    --card: 0 0% 10%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 10%;
    --popover-foreground: 0 0% 98%;

    /* Semantic Colors - Using BigRack palette */
    --primary: ${colors.rack.hsl};              /* rack */
    --primary-foreground: 0 0% 100%;
    --secondary: 40 29% 45%;                    /* lighter pallet for dark mode */
    --secondary-foreground: 0 0% 100%;
    --accent: ${colors.box.hsl};                /* box */
    --accent-foreground: 0 0% 10%;

    /* Muted */
    --muted: 0 0% 15%;
    --muted-foreground: 0 0% 65%;

    /* Destructive */
    --destructive: 0 63% 40%;
    --destructive-foreground: 0 0% 100%;

    /* Borders & Inputs */
    --border: 0 0% 20%;
    --input: 0 0% 20%;
    --ring: 192 23% 60%;                       /* lighter rack */

    /* Charts - Using BigRack palette with adjustments */
    --chart-1: 192 30% 60%;                    /* lighter rack */
    --chart-2: 40 40% 50%;                     /* lighter pallet */
    --chart-3: 36 70% 75%;                     /* lighter box */
    --chart-4: 192 50% 45%;
    --chart-5: 36 85% 65%;
  `.trim();
  }

  return `
    /* BigRack Brand Colors */
    --rack: ${colors.rack.hsl};        /* #79959c - Main structural color */
    --pallet: ${colors.pallet.hsl};     /* #7b6b43 - Organizational grouping */
    --box: ${colors.box.hsl};          /* #e1bb80 - Individual tasks */

    /* Base Colors */
    --background: 0 0% 100%;
    --foreground: 0 0% 10%;

    /* Card & Popover */
    --card: 0 0% 100%;
    --card-foreground: 0 0% 10%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 10%;

    /* Semantic Colors - Using BigRack palette */
    --primary: ${colors.rack.hsl};              /* rack */
    --primary-foreground: 0 0% 100%;
    --secondary: ${colors.pallet.hsl};           /* pallet */
    --secondary-foreground: 0 0% 100%;
    --accent: ${colors.box.hsl};                 /* box */
    --accent-foreground: 0 0% 10%;

    /* Muted */
    --muted: 0 0% 96%;
    --muted-foreground: 0 0% 45%;

    /* Destructive */
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    /* Borders & Inputs */
    --border: 0 0% 90%;
    --input: 0 0% 90%;
    --ring: ${colors.rack.hsl};                  /* rack */

    /* Border Radius */
    --radius: 0.5rem;

    /* Charts - Using BigRack palette */
    --chart-1: ${colors.rack.hsl};               /* rack */
    --chart-2: ${colors.pallet.hsl};             /* pallet */
    --chart-3: ${colors.box.hsl};                /* box */
    --chart-4: 192 40% 40%;                      /* darker rack */
    --chart-5: 36 80% 60%;                       /* vibrant box */
  `.trim();
}

/**
 * Generate complete CSS for :root and .dark selectors
 */
export function generateThemeCSS(): string {
  return `
:root {
  ${generateCSSVariables('light')}
}

.dark {
  ${generateCSSVariables('dark')}
}
  `.trim();
}
