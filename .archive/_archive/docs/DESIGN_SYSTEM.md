# RGFL Design System Documentation

## Overview

The RGFL Design System is a comprehensive, token-based design foundation that enables consistent, scalable, and accessible user experiences across the platform.

### Philosophy

**Consistency enables creativity.** By establishing a robust design system, we empower developers to build features faster while maintaining visual coherence and brand identity.

---

## Design Tokens

Design tokens are the single source of truth for all design decisions. They're defined as CSS custom properties in `tokens.css`.

### Color Tokens

#### Brand Colors
```css
--color-brand-red: #A42828        /* Primary brand color */
--color-brand-red-hover: #8a2020  /* Hover state */
--color-brand-red-light: #d63535  /* Light variant */
--color-brand-red-dark: #6e1b1b   /* Dark variant */
```

#### Accent Colors
```css
--color-accent-coral: #FF776C     /* Secondary accent */
--color-accent-blue: #3FACFF      /* Info/focus color */
--color-accent-green: #22c55e     /* Success states */
--color-accent-yellow: #f59e0b    /* Warning states */
```

#### Text Colors
```css
--color-text-primary: #1a1a1a     /* Primary text */
--color-text-secondary: #666666   /* Secondary text */
--color-text-tertiary: #999999    /* Tertiary/disabled */
--color-text-inverse: #ffffff     /* Text on dark backgrounds */
```

#### Status Colors
```css
--color-success: #22c55e
--color-success-hover: #16a34a
--color-success-bg: #dcfce7
--color-warning: #f59e0b
--color-warning-hover: #d97706
--color-warning-bg: #fef3c7
--color-error: #ef4444
--color-error-hover: #dc2626
--color-error-bg: #fee2e2
--color-info: #3b82f6
--color-info-hover: #2563eb
--color-info-bg: #dbeafe
```

### Spacing Tokens (8px Base Scale)

```css
--space-0: 0
--space-1: 0.25rem   /* 4px */
--space-2: 0.5rem    /* 8px */
--space-3: 0.75rem   /* 12px */
--space-4: 1rem      /* 16px */
--space-6: 1.5rem    /* 24px */
--space-8: 2rem      /* 32px */
--space-12: 3rem     /* 48px */
--space-16: 4rem     /* 64px */
```

**Usage:**
```css
.my-component {
  padding: var(--space-4);
  margin-bottom: var(--space-6);
  gap: var(--space-2);
}
```

### Typography Tokens

#### Font Sizes (Modular Scale 1.25)
```css
--font-size-xs: 0.75rem      /* 12px */
--font-size-sm: 0.875rem     /* 14px */
--font-size-base: 1rem       /* 16px */
--font-size-lg: 1.25rem      /* 20px */
--font-size-xl: 1.5rem       /* 24px */
--font-size-2xl: 1.875rem    /* 30px */
--font-size-3xl: 2.25rem     /* 36px */
--font-size-4xl: 3rem        /* 48px */
```

#### Font Weights
```css
--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-semibold: 600
--font-weight-bold: 700
```

#### Line Heights
```css
--line-height-tight: 1.25     /* Headings */
--line-height-normal: 1.5     /* Body text */
--line-height-relaxed: 1.625  /* Long-form content */
```

### Shadow Tokens (Elevation System)

```css
--shadow-xs: 0 1px 2px rgba(0,0,0,0.05)
--shadow-sm: 0 1px 3px rgba(0,0,0,0.1)
--shadow-base: 0 4px 6px rgba(0,0,0,0.1)
--shadow-md: 0 10px 15px rgba(0,0,0,0.1)
--shadow-lg: 0 20px 25px rgba(0,0,0,0.1)
--shadow-xl: 0 25px 50px rgba(0,0,0,0.25)
```

### Border Radius
```css
--radius-sm: 4px
--radius-base: 8px      /* Default */
--radius-md: 12px
--radius-lg: 16px
--radius-full: 9999px   /* Pills/avatars */
```

### Z-Index Hierarchy
```css
--z-base: 0
--z-dropdown: 10
--z-sticky: 20
--z-fixed: 30
--z-modal-backdrop: 40
--z-modal: 50
--z-tooltip: 70
--z-toast: 80
```

### Transition & Animation Tokens

#### Durations
```css
--duration-instant: 0ms       /* No transition */
--duration-fast: 150ms        /* Quick interactions */
--duration-base: 200ms        /* Default transitions */
--duration-slow: 300ms        /* Larger movements */
--duration-slower: 500ms      /* Complex animations */
```

#### Timing Functions
```css
--ease-linear: linear
--ease-in: cubic-bezier(0.4, 0, 1, 1)
--ease-out: cubic-bezier(0, 0, 0.2, 1)
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

#### Composed Transitions
```css
--transition-base: all var(--duration-base) var(--ease-in-out)
--transition-colors: color, background-color, border-color var(--duration-base) var(--ease-in-out)
--transition-transform: transform var(--duration-base) var(--ease-in-out)
--transition-opacity: opacity var(--duration-base) var(--ease-in-out)
```

**Usage:**
```css
.my-button {
  transition: var(--transition-colors);
}

.my-modal {
  transition: var(--transition-opacity), var(--transition-transform);
}
```

### Responsive Breakpoints

```css
--breakpoint-sm: 640px    /* Small tablets */
--breakpoint-md: 768px    /* Tablets */
--breakpoint-lg: 1024px   /* Small laptops */
--breakpoint-xl: 1280px   /* Desktops */
--breakpoint-2xl: 1536px  /* Large screens */
```

**Container Widths:**
```css
--container-sm: 640px
--container-md: 768px
--container-lg: 1024px
--container-xl: 1280px
--container-2xl: 1536px
```

**Media Query Usage:**
```css
/* Mobile-first approach */
.component { /* Mobile styles */ }

@media (min-width: 768px) {
  .component { /* Tablet styles */ }
}

@media (min-width: 1024px) {
  .component { /* Desktop styles */ }
}
```

---

## Component Library

All components are available in `components.css` with token-based styling.

### Buttons

#### Variants
- **Primary** - Main call-to-action buttons
- **Secondary** - Alternative actions
- **Outline** - Less prominent actions
- **Ghost** - Minimal actions
- **Danger** - Destructive actions

#### Sizes
- **sm** - 32px height
- **base** - 40px height (default)
- **lg** - 48px height
- **xl** - 56px height

#### Usage Examples

```html
<!-- Primary button (default size) -->
<button class="btn btn--primary">
  Save Changes
</button>

<!-- Large secondary button -->
<button class="btn btn--secondary btn--lg">
  Upload File
</button>

<!-- Small outline button -->
<button class="btn btn--outline btn--sm">
  Cancel
</button>

<!-- Full-width button -->
<button class="btn btn--primary btn--full">
  Continue
</button>

<!-- Icon button -->
<button class="btn btn--ghost btn--icon">
  <svg>...</svg>
</button>

<!-- Button with icon -->
<button class="btn btn--primary">
  <svg>...</svg>
  <span>Download</span>
</button>
```

### Badges

```html
<!-- Primary badge -->
<span class="badge badge--primary">New</span>

<!-- Success badge -->
<span class="badge badge--success">Active</span>

<!-- Warning badge -->
<span class="badge badge--warning">Pending</span>

<!-- Small badge -->
<span class="badge badge--sm badge--info">Beta</span>

<!-- Outline badge -->
<span class="badge badge--outline">Draft</span>
```

### Cards

```html
<!-- Basic card -->
<div class="card">
  <div class="card__header">
    <h3>Card Title</h3>
  </div>
  <div class="card__body">
    <p>Card content goes here</p>
  </div>
  <div class="card__footer">
    <button class="btn btn--primary">Action</button>
  </div>
</div>

<!-- Interactive card (hover effects) -->
<div class="card card--interactive">
  <div class="card__body">
    <h3>Clickable Card</h3>
    <p>This card has hover effects</p>
  </div>
</div>

<!-- Elevated card (with shadow) -->
<div class="card card--elevated">
  <div class="card__body">
    <h3>Elevated Card</h3>
  </div>
</div>
```

### Forms

```html
<!-- Form group with label and input -->
<div class="form-group">
  <label class="form-label form-label--required">
    Email Address
  </label>
  <input
    type="email"
    class="form-input"
    placeholder="you@example.com"
  />
  <span class="form-hint">
    We'll never share your email
  </span>
</div>

<!-- Error state -->
<div class="form-group">
  <label class="form-label">Password</label>
  <input
    type="password"
    class="form-input form-input--error"
  />
  <span class="form-error">
    Password must be at least 8 characters
  </span>
</div>

<!-- Textarea -->
<div class="form-group">
  <label class="form-label">Message</label>
  <textarea class="form-textarea" rows="4"></textarea>
</div>

<!-- Select -->
<div class="form-group">
  <label class="form-label">Country</label>
  <select class="form-select">
    <option>United States</option>
    <option>Canada</option>
  </select>
</div>

<!-- Checkbox -->
<label class="form-checkbox-label">
  <input type="checkbox" class="form-checkbox" />
  <span>I agree to the terms</span>
</label>

<!-- Radio buttons -->
<label class="form-radio-label">
  <input type="radio" name="plan" class="form-radio" />
  <span>Basic Plan</span>
</label>
```

### Alerts

```html
<!-- Success alert -->
<div class="alert alert--success">
  <div class="alert__icon">✓</div>
  <div class="alert__content">
    <div class="alert__title">Success!</div>
    <div class="alert__message">
      Your changes have been saved.
    </div>
  </div>
</div>

<!-- Error alert -->
<div class="alert alert--error">
  <div class="alert__icon">!</div>
  <div class="alert__content">
    <div class="alert__title">Error</div>
    <div class="alert__message">
      Something went wrong. Please try again.
    </div>
  </div>
</div>

<!-- Warning alert -->
<div class="alert alert--warning">
  <div class="alert__content">
    <div class="alert__message">
      Your session will expire in 5 minutes.
    </div>
  </div>
</div>
```

### Avatars

```html
<!-- Text avatar -->
<div class="avatar">JD</div>

<!-- Image avatar -->
<div class="avatar">
  <img src="..." alt="John Doe" class="avatar__img" />
</div>

<!-- Sizes -->
<div class="avatar avatar--xs">JS</div>
<div class="avatar avatar--sm">MD</div>
<div class="avatar">LG</div>
<div class="avatar avatar--lg">XL</div>
<div class="avatar avatar--xl">2X</div>
```

### Loading States

```html
<!-- Spinner -->
<div class="spinner"></div>
<div class="spinner spinner--lg"></div>

<!-- Skeleton loaders -->
<div class="skeleton skeleton--text" style="width: 60%"></div>
<div class="skeleton skeleton--text" style="width: 80%"></div>
<div class="skeleton skeleton--title" style="width: 40%"></div>
<div class="skeleton skeleton--avatar"></div>
```

### Dividers

```html
<!-- Horizontal divider -->
<div class="divider"></div>

<!-- Vertical divider (for flex containers) -->
<div class="divider divider--vertical"></div>

<!-- With spacing -->
<div class="my-4">
  <div class="divider"></div>
</div>
```

### Tooltips

```html
<!-- Basic tooltip -->
<div class="tooltip">
  Tooltip content here
</div>

<!-- Position tooltips using utility classes -->
<div class="tooltip" style="top: 100%; left: 50%;">
  Positioned below
</div>
```

**Note:** Tooltips require JavaScript for show/hide behavior. Use `aria-describedby` for accessibility.

---

## Utility Classes

Utility classes provide quick styling options using design tokens.

### Spacing

```html
<!-- Margin -->
<div class="mt-4">Margin top 16px</div>
<div class="mb-6">Margin bottom 24px</div>
<div class="mx-auto">Centered horizontally</div>
<div class="my-8">Margin Y-axis 32px</div>

<!-- Padding -->
<div class="p-4">Padding 16px</div>
<div class="px-6 py-4">Padding X 24px, Y 16px</div>
```

### Flexbox

```html
<!-- Flex container -->
<div class="flex items-center gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- Flex between -->
<div class="flex items-center justify-between">
  <div>Left</div>
  <div>Right</div>
</div>

<!-- Column layout -->
<div class="flex flex-col gap-2">
  <div>Row 1</div>
  <div>Row 2</div>
</div>
```

### Grid

```html
<!-- 2-column grid -->
<div class="grid grid-cols-2 gap-4">
  <div>Column 1</div>
  <div>Column 2</div>
</div>

<!-- Auto-fit grid -->
<div class="grid grid-cols-auto gap-6">
  <div>Card 1</div>
  <div>Card 2</div>
  <div>Card 3</div>
</div>
```

### Typography

```html
<h1 class="text-3xl font-bold">Heading</h1>
<p class="text-base text-secondary leading-relaxed">
  Body text with relaxed line height
</p>
<span class="text-sm text-tertiary">Small muted text</span>
```

### Colors

```html
<div class="bg-primary text-white">Dark background</div>
<div class="bg-cream text-brand">Cream background with brand text</div>
```

---

## Accessibility

### Focus States

All interactive elements have accessible focus indicators:

```css
/* Applied automatically */
.btn:focus-visible,
.form-input:focus,
.form-select:focus {
  box-shadow: var(--shadow-focus);
}
```

### Reduced Motion

The system respects `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Screen Reader Support

```html
<!-- Screen reader only content -->
<span class="sr-only">Screen reader text</span>

<!-- ARIA labels -->
<button aria-label="Close dialog">×</button>
```

### Color Contrast

All color combinations meet WCAG 2.1 AA standards:
- Text on backgrounds: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum

---

## Dark Mode

Dark mode is supported via `data-theme` attribute:

```html
<!-- Auto (respects system preference) -->
<html data-theme="auto">

<!-- Force light mode -->
<html data-theme="light">

<!-- Force dark mode -->
<html data-theme="dark">
```

Implement theme switching in JavaScript:

```javascript
// Toggle dark mode
document.documentElement.setAttribute('data-theme', 'dark');

// Respect system preference
document.documentElement.setAttribute('data-theme', 'auto');
```

---

## Migration Guide

### From Legacy Styles

Old tokens are mapped to new ones for backwards compatibility:

```css
/* Old (still works) */
.my-component {
  background: var(--brand-red);
  padding: 0.5rem;
}

/* New (recommended) */
.my-component {
  background: var(--color-brand-red);
  padding: var(--space-2);
}
```

### Migrating Components

Replace inline styles with component classes:

```html
<!-- Before -->
<button style="
  padding: 0.6rem 1.2rem;
  background: #A42828;
  color: white;
  border-radius: 8px;
">
  Click me
</button>

<!-- After -->
<button class="btn btn--primary">
  Click me
</button>
```

### Using Utilities

Replace custom CSS with utilities:

```html
<!-- Before -->
<div class="custom-container" style="
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
">
  ...
</div>

<!-- After -->
<div class="flex items-center gap-4 mt-8">
  ...
</div>
```

---

## Best Practices

### Do's ✅

- **Use design tokens** for all colors, spacing, and typography
- **Use component classes** instead of inline styles
- **Use utility classes** for one-off adjustments
- **Maintain** semantic HTML structure
- **Test** with keyboard navigation and screen readers
- **Verify** color contrast ratios
- **Respect** reduced motion preferences

### Don'ts ❌

- **Don't** use magic numbers (hard-coded pixels)
- **Don't** create one-off colors outside the token system
- **Don't** skip focus indicators
- **Don't** rely solely on color for information
- **Don't** use `!important` unless absolutely necessary
- **Don't** create components that don't use tokens

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari 14+
- Chrome Android 90+

CSS custom properties and modern CSS features are fully supported.

---

## Resources

- **Figma File**: [Design System Components]
- **Token Reference**: `/client/src/styles/tokens.css`
- **Component Library**: `/client/src/styles/components.css`
- **Utility Classes**: `/client/src/styles/utilities.css`

---

## Questions?

Contact the design system team or create an issue in the repository.
