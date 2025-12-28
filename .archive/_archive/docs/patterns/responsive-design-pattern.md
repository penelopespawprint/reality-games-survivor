# Responsive Design Pattern

## Overview

RGFL uses a mobile-first responsive design approach with defined breakpoints as design tokens.

## Breakpoints

| Name | Width | Token | Usage |
|------|-------|-------|-------|
| sm | 640px | `--breakpoint-sm` | Small tablets |
| md | 768px | `--breakpoint-md` | Tablets |
| lg | 1024px | `--breakpoint-lg` | Small laptops |
| xl | 1280px | `--breakpoint-xl` | Desktops |
| 2xl | 1536px | `--breakpoint-2xl` | Large screens |

## Container Widths

```css
--container-sm: 640px;
--container-md: 768px;
--container-lg: 1024px;
--container-xl: 1280px;
--container-2xl: 1536px;
```

## Media Query Strategy

RGFL uses **max-width** queries (desktop-first approach in global styles):

```css
/* Desktop (default) */
.rg-nav__links {
  display: flex;
  gap: 2rem;
}

/* Large tablet */
@media (max-width: 1024px) {
  .rg-nav__links {
    gap: 1.5rem;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .rg-nav__links {
    display: none; /* Hide, show hamburger */
  }
}

/* Small mobile */
@media (max-width: 480px) {
  .rg-page {
    padding: 0.75rem 1vw;
  }
}
```

## Navigation Responsive Pattern

### Desktop (>768px)
- Horizontal navigation links
- Dropdowns on hover
- Full logo display

### Mobile (≤768px)
- Hamburger menu icon
- Slide-out drawer navigation
- Overlay backdrop
- Full-screen menu items

```css
/* Mobile navigation z-index stacking */
.user-layout__nav { z-index: 100; }
.user-layout__drawer { z-index: 101; }
.user-layout__overlay { z-index: 99; }
```

## Layout Responsive Pattern

### Sidebar Layout (Admin)

```css
/* Desktop */
.admin-layout__sidebar {
  width: 260px;
  position: fixed;
}

/* Tablet */
@media (max-width: 1024px) {
  .admin-layout__sidebar {
    width: 220px;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .admin-layout__sidebar {
    display: none; /* Hidden by default */
    transform: translateX(-100%);
  }

  .admin-layout__sidebar.open {
    display: block;
    transform: translateX(0);
  }
}
```

## Grid Responsive Pattern

```css
.rg-grid--two {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

@media (max-width: 768px) {
  .rg-grid--two {
    grid-template-columns: 1fr;
  }
}
```

## Typography Responsive Pattern

Use `clamp()` for fluid typography:

```css
.rg-hero h1 {
  font-size: clamp(1.4rem, 4vw, 2.5rem);
}
```

### Breakpoint-specific sizing

```css
/* Desktop */
.rg-section h2 {
  font-size: 1.5rem;
}

/* Tablet */
@media (max-width: 1024px) {
  .rg-section h2 {
    font-size: 1.3rem;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .rg-section h2 {
    font-size: 1.2rem;
  }
}

/* Small mobile */
@media (max-width: 480px) {
  .rg-section h2 {
    font-size: 1.1rem;
  }
}
```

## Touch-Friendly Sizing

Ensure interactive elements are at least 44x44px on mobile:

```css
@media (max-width: 768px) {
  .btn {
    min-height: 44px;
    padding: 0.75rem 1.25rem;
  }

  .rg-nav__avatar {
    width: 40px;
    height: 40px;
  }
}
```

## Responsive Utility Classes

```css
/* Hide on mobile */
.hidden-mobile {
  @media (max-width: 768px) {
    display: none;
  }
}

/* Hide on desktop */
.hidden-desktop {
  @media (min-width: 769px) {
    display: none;
  }
}
```

## Table Responsive Pattern

```css
/* Desktop: Full table */
table {
  width: 100%;
}

/* Mobile: Reduce padding, smaller text */
@media (max-width: 768px) {
  table {
    font-size: 0.85rem;
  }

  th, td {
    padding: 0.65rem 0.5rem;
  }
}

/* Small mobile */
@media (max-width: 480px) {
  th, td {
    padding: 0.5rem 0.4rem;
    font-size: 0.8rem;
  }
}
```

## Best Practices

1. **Test at breakpoints** - Check all defined breakpoints during development
2. **Touch targets** - Maintain 44px minimum touch targets on mobile
3. **Readable text** - Ensure minimum 16px font size on mobile
4. **Stack layouts** - Convert horizontal layouts to vertical on mobile
5. **Hide with purpose** - Don't hide essential content on mobile
6. **Test on devices** - Use real devices for final testing

## Related Patterns

- [Design Token Architecture](./design-token-architecture.md)
- [Component Styling Pattern](./component-styling-pattern.md)
