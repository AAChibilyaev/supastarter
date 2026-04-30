# Appwrite Docs — Design Token Reference

> Scraped from https://appwrite.io/docs/advanced/security/hipaa (SvelteKit + LightningCSS)

## Brand Colors

| Token                 | Dark      | Light     | Usage                                 |
| --------------------- | --------- | --------- | ------------------------------------- |
| `--doc-accent`        | `#fd366e` | `#fd366e` | Primary buttons, links, active states |
| `--doc-accent-darker` | `#ca2b58` | `#ca2b58` | Hover states, darker accent           |
| `--color-green-700`   | `#0a714f` | `#0a714f` | Success states                        |

## Backgrounds

| Token                  | Dark                                | Light       |
| ---------------------- | ----------------------------------- | ----------- |
| `--doc-bg`             | `#0f0f11`                           | `#fafafa`   |
| `--doc-surface`        | `#18181b`                           | `#f0f0f0`   |
| `--doc-surface-raised` | `#1f1f23`                           | `#e5e5e5`   |
| `--doc-card`           | `#ffffffe6` (white 90%)             | `#ffffffe6` |
| `--doc-offset`         | `hsl(270 2% 11% / .94)` ≈ `#1b1b1c` | `#00000014` |

## Text

| Token                  | Dark      | Light     |
| ---------------------- | --------- | --------- |
| `--doc-text-primary`   | `#e4e4e7` | `#1b1b1f` |
| `--doc-text-secondary` | `#828288` | `#7a7a80` |
| `--doc-text-muted`     | `#52525b` | `#6e6e73` |
| `--color-white`        | `#fff`    | `#fff`    |
| `--color-black`        | `#000`    | `#000`    |

## Borders

| Token                | Dark                          | Light             |
| -------------------- | ----------------------------- | ----------------- |
| `--doc-border`       | `hsl(270 4% 22%)` ≈ `#363638` | `hsl(270 4% 82%)` |
| `--doc-border-light` | `hsl(270 4% 18%)` ≈ `#2c2c2f` | `hsl(270 4% 88%)` |
| Header border        | `#ffffff1a`                   | `#0000001a`       |

## Greyscale Palette (HSL with hue ≈ 270°)

Grey hue is approximately 270° with slight purple undertone.

| Level | Dark (L%)         | Light (L%)      |
| ----- | ----------------- | --------------- |
| 25    | —                 | 98% ≈ `#fafafa` |
| 50    | —                 | 94% ≈ `#f0f0f0` |
| 100   | 90%               | 90% ≈ `#e5e5e5` |
| 200   | 85%               | 85% ≈ `#d8d8d8` |
| 300   | 68%               | 68% ≈ `#aeaeae` |
| 500   | 52% ≈ `#828288`   | 52% ≈ `#7a7a80` |
| 600   | 43%               | 43% ≈ `#6e6e73` |
| 700   | 35%               | 35% ≈ `#59595c` |
| 750   | 26% ≈ `#1f1f23`   | 26%             |
| 800   | 18% ≈ `#18181b`   | 18%             |
| 850   | 14%               | 14%             |
| 900   | 10.4% ≈ `#0f0f11` | 10.4%           |

## Typography

| Property     | Value                                       |
| ------------ | ------------------------------------------- |
| Heading font | `'Aeonik Pro', sans-serif`                  |
| Body font    | `'Inter', 'Aeonik Pro', sans-serif`         |
| Mono font    | `'Fira Code', 'Aenoik Fono', monospace`     |
| H1 size      | `clamp(2rem, 1.046rem + 3.053vw, 3rem)`     |
| H2 size      | `clamp(1.5rem, 0.534rem + 2.29vw, 2rem)`    |
| Body size    | `clamp(1rem, 0.881rem + 0.382vw, 1.125rem)` |
| Small text   | `clamp(0.875rem, 0.756rem + 0.382vw, 1rem)` |
| Micro text   | `0.75rem`                                   |

## Spacing & Radius

| Token          | Value                |
| -------------- | -------------------- |
| `--spacing`    | `0.25rem` (4px base) |
| `--radius-xs`  | `0.125rem` (2px)     |
| `--radius-sm`  | `0.25rem` (4px)      |
| `--radius-md`  | `0.375rem` (6px)     |
| `--radius-lg`  | `0.5rem` (8px)       |
| `--radius-xl`  | `0.75rem` (12px)     |
| `--radius-2xl` | `1rem` (16px)        |
| `--radius-3xl` | `1.5rem` (24px)      |
| `--radius-4xl` | `2rem` (32px)        |

## Shadows (Drop)

| Token               | Value                   |
| ------------------- | ----------------------- |
| `--drop-shadow-md`  | `0 3px 3px #0000001f`   |
| `--drop-shadow-xl`  | `0 9px 7px #0000001a`   |
| `--drop-shadow-2xl` | `0 25px 25px #00000026` |

## CSS Custom Properties (source)

```css
/* Root theme variables */
--color-primary: var(--color-pink-500);
--color-secondary: var(--color-secondary);
--color-accent: var(--color-pink-500);
--color-accent-darker: #ca2b58;

/* Calculated colors */
--color-pink-500: hsl(var(--color-pink-hue, 340) 98% 60%);
--color-mint-500: hsl(calc(var(--color-mint-hue) + 1) 54% 69%);
--color-purple-500: hsl(calc(var(--color-purple-hue) - 1) 99% 70%);
--color-blue-500: hsl(calc(var(--color-blue-hue) - 1) 99% 70%);
--color-secondary-100: hsl(var(--color-secondary-hue) 99% 66%);

/* Surface/offset */
--color-smooth: var(--color-smooth);
--color-subtle: var(--color-subtle);
--color-tertiary: var(--color-tertiary);
--color-card: var(--color-card);
--color-offset: hsl(var(--color-greyscale-hue) 2% 11% / 0.94);
```

## CSS Class Names (dark/light scoping)

```css
/* Dark theme is default */
html {
	color-scheme: dark;
}

/* Toggle via body.dark / body.light classes */
.dark .web-u-only-dark {
	display: block;
}
.light .web-u-only-dark {
	display: none;
}
.light .web-u-only-light {
	display: block;
}

/* Dark-specific overrides */
.dark\:bg-greyscale-900:where(.dark, .dark *) {
	background-color: var(--color-greyscale-900);
}
.dark\:text-greyscale-100:where(.dark, .dark *) {
	color: var(--color-greyscale-100);
}
.dark\:border-white\/10:where(.dark, .dark *) {
	border-color: #ffffff1a;
}
.dark\:bg-white\/\[0\.04\]:where(.dark, .dark *) {
	background-color: #ffffff0a;
}
.dark\:bg-white\/\[0\.12\]:where(.dark, .dark *) {
	background-color: #ffffff1f;
}
```

## Page Layout (Docs)

| Property               | Value              |
| ---------------------- | ------------------ |
| Sidebar width (open)   | `17.5rem` (280px)  |
| Sidebar width (closed) | `4.5625rem` (73px) |
| Header height          | `4.5625rem` (73px) |
| Content max-width      | `43.5rem` (696px)  |
| Padding inline         | `2rem` (32px)      |
