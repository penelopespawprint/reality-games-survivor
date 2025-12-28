# Component Styling Pattern

## Overview

RGFL uses a hybrid styling approach combining CSS classes with BEM-inspired naming and CSS variable inline styles.

## Naming Conventions

### Layout Components: `rg-*` prefix
```css
.rg-nav           /* Navigation bar */
.rg-nav__brand    /* Navigation brand/logo */
.rg-nav__links    /* Navigation links container */
.rg-page          /* Page container */
.rg-hero          /* Hero section */
.rg-section       /* Content section */
.rg-card          /* Card component */
.rg-footer        /* Footer */
```

### UI Components: Semantic names with modifiers
```css
.btn                    /* Button base */
.btn--primary          /* Primary variant */
.btn--secondary        /* Secondary variant */
.btn--outline          /* Outline variant */
.btn--ghost            /* Ghost variant */
.btn--sm, --lg, --xl   /* Size modifiers */
.btn--full             /* Full width */
.btn--icon             /* Icon-only button */
```

### Form Components: `form-*` prefix
```css
.form-group            /* Form field wrapper */
.form-label            /* Label */
.form-label--required  /* Required indicator */
.form-input            /* Text input */
.form-input--sm, --lg  /* Size variants */
.form-input--error     /* Error state */
.form-select           /* Select dropdown */
.form-textarea         /* Textarea */
.form-checkbox         /* Checkbox */
.form-radio            /* Radio button */
.form-hint             /* Helper text */
.form-error            /* Error message */
```

### Status Components
```css
.badge                 /* Badge base */
.badge--success        /* Success variant */
.badge--warning        /* Warning variant */
.badge--error          /* Error variant */
.badge--info           /* Info variant */
.badge--neutral        /* Neutral variant */

.alert                 /* Alert base */
.alert--success        /* Success alert */
.alert--warning        /* Warning alert */
.alert--error          /* Error alert */
.alert--info           /* Info alert */
```

## BEM Pattern in Layouts

Layout-specific components use BEM (Block__Element--Modifier):

```css
/* Block */
.user-layout__nav

/* Elements */
.user-layout__nav-links
.user-layout__nav-link
.user-layout__logo
.user-layout__hamburger

/* Modifiers */
.user-layout__nav-link.active
```

## Token Consumption

Components should always use design tokens:

```css
/* DO: Use tokens */
.card {
  background: var(--color-bg-secondary);
  padding: var(--space-6);
  border-radius: var(--radius-base);
  box-shadow: var(--shadow-sm);
}

/* DON'T: Hardcode values */
.card {
  background: #ffffff;
  padding: 24px;
  border-radius: 8px;
}
```

## Utility Classes

### Spacing
```css
.m-0 through .m-12     /* Margin all sides */
.mt-*, .mb-*, .ml-*, .mr-*  /* Directional margin */
.mx-*, .my-*           /* Axis margin */
.p-0 through .p-12     /* Padding */
.pt-*, .pb-*, .px-*, .py-*  /* Directional padding */
```

### Flexbox
```css
.flex, .inline-flex
.flex-col, .flex-row
.justify-start, .justify-center, .justify-between
.items-start, .items-center, .items-stretch
.gap-0 through .gap-8
```

### Typography
```css
.text-xs through .text-4xl  /* Font sizes */
.font-normal, .font-medium, .font-semibold, .font-bold
.text-primary, .text-secondary, .text-brand
.text-left, .text-center, .text-right
```

### Display & Layout
```css
.block, .inline-block, .hidden
.relative, .absolute, .fixed, .sticky
.w-full, .h-full
.overflow-auto, .overflow-hidden
```

## Component States

### Interactive States
```css
.btn:hover:not(:disabled) {
  background: var(--color-brand-red-hover);
}

.btn:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Error States
```css
.form-input--error {
  border-color: var(--color-error);
}

.form-input--error:focus {
  box-shadow: var(--shadow-focus-error);
}
```

## Inline Style Pattern

For dynamic styling, combine inline styles with CSS variables:

```jsx
<Link
  style={{
    background: isActive ? 'var(--brand-red)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-muted)',
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius)'
  }}
>
  Link Text
</Link>
```

## File Structure

```
client/src/styles/
├── components.css           # Shared component styles
├── components/
│   ├── layouts/
│   │   ├── UserLayout.css   # User layout specific
│   │   └── AdminLayout.css  # Admin layout specific
│   ├── TorchRevealAnimation.css
│   └── BewareAdvantageModal.css
```

## Best Practices

1. **Use tokens** - Never hardcode colors, spacing, or typography
2. **Prefer classes** - Use CSS classes over inline styles when possible
3. **Follow naming** - Use established prefixes (`rg-`, `btn`, `form-`)
4. **State consistency** - Use standard state suffixes (`--hover`, `--error`)
5. **Responsive first** - Consider mobile layout from the start

## Related Patterns

- [Design Token Architecture](./design-token-architecture.md)
- [Responsive Design Pattern](./responsive-design-pattern.md)
