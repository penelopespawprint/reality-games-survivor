# Design Token Architecture Pattern

## Overview

RGFL uses a comprehensive CSS custom properties (CSS variables) system following a two-tier token architecture.

## Token Categories

| Category | Count | Examples |
|----------|-------|----------|
| Colors | 43 | `--color-brand-red`, `--color-text-primary` |
| Spacing | 14 | `--space-0` through `--space-24` |
| Typography | 31 | `--font-size-base`, `--font-weight-bold` |
| Borders | 9 | `--radius-base`, `--border-width-thin` |
| Shadows | 9 | `--shadow-sm`, `--shadow-focus` |
| Z-Index | 8 | `--z-modal`, `--z-tooltip` |
| Transitions | 11 | `--duration-fast`, `--ease-in-out` |
| Layout | 10 | `--container-lg`, `--breakpoint-md` |
| Components | 10 | `--button-height-base`, `--avatar-lg` |

**Total: 145+ design tokens**

## Naming Convention

**Pattern: `--category-subcategory-variant`**

```css
--color-brand-red              /* category-subcategory-variant */
--color-brand-red-hover        /* category-subcategory-variant-state */
--color-text-primary           /* category-semantic-level */
--space-4                      /* category-scale */
--font-size-lg                 /* category-property-size */
```

### Suffixes

- **State suffixes**: `-hover`, `-focus`, `-error`, `-bg`
- **Size suffixes**: `-xs`, `-sm`, `-base`, `-lg`, `-xl`, `-2xl`

## Two-Tier Token System

### Tier 1: Primitive Tokens
Direct values without references:
```css
--color-brand-red: #A42828;
--space-4: 1rem;
--font-size-base: 1rem;
```

### Tier 2: Semantic Tokens
References to primitive tokens:
```css
--color-text-link: var(--color-brand-red);
--color-bg-primary: var(--color-cream);
--space-section: var(--space-8);
```

## Legacy Compatibility Layer

For backwards compatibility, legacy tokens map to new tokens in `global.css`:
```css
--bg-cream: var(--color-cream);
--text-dark: var(--color-text-primary);
--brand-red: var(--color-brand-red);
--radius: var(--radius-base);
```

## Dark Mode Implementation

### Auto-switching (System Preference)
```css
@media (prefers-color-scheme: dark) {
  :root[data-theme="auto"] {
    --color-text-primary: #f5f5f5;
    --color-bg-primary: #1a1a1a;
  }
}
```

### Manual Override
```css
:root[data-theme="dark"] {
  --color-text-primary: #f5f5f5;
  --color-bg-primary: #1a1a1a;
}
```

## Accessibility Features

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-base: 0ms;
  }
}
```

### Focus States
Dedicated tokens for focus rings:
- `--shadow-focus`: Standard focus ring (blue)
- `--shadow-focus-error`: Error focus ring (red)

## File Organization

```
client/src/styles/
├── tokens.css      # All design tokens
├── components.css  # Component styles using tokens
├── utilities.css   # Utility classes using tokens
└── global.css      # Imports + legacy compatibility
```

## Usage Examples

### In CSS
```css
.button {
  background: var(--color-brand-red);
  padding: var(--space-4) var(--space-6);
  border-radius: var(--radius-base);
  transition: var(--transition-colors);
}
```

### In JSX (inline)
```jsx
<div style={{
  color: 'var(--color-text-primary)',
  padding: 'var(--space-4)'
}}>
```

## Known Gaps

1. Missing `--color-success-hover` token (referenced but undefined)
2. No opacity/transparency utility tokens
3. Animation keyframes use hardcoded values
4. Dark mode doesn't adjust shadow tokens

## Related Patterns

- [Component Styling Pattern](./component-styling-pattern.md)
- [Responsive Design Pattern](./responsive-design-pattern.md)
