# BigRack.dev Design System - Theme

Shared theme configuration for dashboard and marketing website.

## Installation

The theme is part of `@bigrack/shared` package and can be imported:

```typescript
import { theme, colors, typography } from '@bigrack/shared';
```

## Colors

BigRack uses a color scheme based on industrial/material concepts:

- **Rack** (`#79959c` / `hsl(192 23% 54%)`): Main structural element color - represents the core infrastructure
- **Pallet** (`#7b6b43` / `hsl(40 29% 38%)`): Organizational grouping color - represents projects and organization
- **Box** (`#e1bb80` / `hsl(36 66% 70%)`): Individual task/container color - represents atomic tasks and deliverables

### Color Format

Each brand color is available in multiple formats:

```typescript
colors.rack.DEFAULT; // '#79959c'
colors.rack.hex; // '#79959c'
colors.rack.hsl; // '192 23% 54%'
colors.rack.rgb; // 'rgb(121, 149, 156)'
```

### Usage in Tailwind CSS

The website already integrates BigRack colors via CSS custom properties:

```javascript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // BigRack Brand Colors (direct use)
        rack: 'hsl(var(--rack))',
        pallet: 'hsl(var(--pallet))',
        box: 'hsl(var(--box))',

        // Semantic aliases (used in primary/secondary/accent)
        primary: 'hsl(var(--primary))', // Maps to rack
        secondary: 'hsl(var(--secondary))', // Maps to pallet
        accent: 'hsl(var(--accent))', // Maps to box
      },
    },
  },
};
```

### Using Brand Colors in Components

```tsx
// Direct brand color usage
<div className="bg-rack text-white">Rack-colored element</div>
<div className="bg-pallet text-white">Pallet-colored element</div>
<div className="bg-box text-foreground">Box-colored element</div>

// Semantic usage (recommended for UI consistency)
<Button variant="default">Primary action (rack color)</Button>
<Badge variant="secondary">Status (pallet color)</Badge>
<Card className="border-accent">Highlighted card (box accent)</Card>
```

## Typography

**Primary Font**: Oswald (Google Fonts)

- Free and open source (SIL Open Font License)
- Commercial use allowed
- Bold industrial sans-serif with condensed proportions
- Available on [Google Fonts](https://fonts.google.com/specimen/Oswald)

**Monospace Font**: IBM Plex Mono (for code)

### Google Fonts Setup

The website is already configured with Oswald and IBM Plex Mono:

```typescript
// app/layout.tsx
import { Oswald, IBM_Plex_Mono } from 'next/font/google';

const oswald = Oswald({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-oswald',
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-mono',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${oswald.variable} ${ibmPlexMono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
```

### Typography Usage

```tsx
// Default: Oswald (via font-sans)
<h1 className="text-4xl font-bold">Heading</h1>

// Monospace: IBM Plex Mono (for code)
<code className="font-mono">const foo = 'bar';</code>

// Font weights
<p className="font-light">Light (300)</p>
<p className="font-normal">Normal (400)</p>
<p className="font-medium">Medium (500)</p>
<p className="font-semibold">Semibold (600)</p>
<p className="font-bold">Bold (700)</p>
```

## Logo

Logo assets: `packages/shared/src/assets/logo/` (multiple sizes: 64px, 128px, 256px, 512px, 1024px)

## Design Tokens

The theme includes:

- Color palette
- Typography (fonts, sizes, weights)
- Spacing scale
- Border radius
- Shadows
- Breakpoints
- Z-index scale
- Transition durations

All values are available in the `theme` export.

## Usage Examples

### React Component

```typescript
import { colors } from '@bigrack/shared';

function Button() {
  return (
    <button style={{ backgroundColor: colors.rack }}>
      Click me
    </button>
  );
}
```

### Tailwind CSS Classes

After extending Tailwind config:

```tsx
<div className="bg-rack text-white p-4">Rack colored box</div>
```
