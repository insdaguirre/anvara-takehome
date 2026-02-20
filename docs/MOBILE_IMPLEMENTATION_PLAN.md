# Mobile-First Implementation Plan — Bonus 4: Perfect Mobile Experience

---

## 1) Repo Findings (Mobile-Related)

### Routing & Layout Structure

- **Root layout**: `apps/frontend/app/layout.tsx`
  - `<body>` uses `flex min-h-screen flex-col`
  - `<Nav />` at top, `<main>` with `mx-auto w-full max-w-6xl flex-1 p-4`, `<Footer />`
  - The `p-4` (16px) container padding is the **only** global spacing — good baseline but tight on 375px screens with nested `p-6` cards
- **Pages**: `/` (landing), `/login`, `/marketplace`, `/marketplace/[id]`, `/dashboard/sponsor`, `/dashboard/publisher`
- **No Tailwind config file** — uses Tailwind CSS v4 with CSS-first configuration in `globals.css`

### Current Breakpoint Usage Patterns

| Breakpoint | Usage |
|-----------|-------|
| `sm:` (640px) | Grid cols, flex-row switches, footer form layout |
| `md:` (768px) | Landing text sizes (`md:text-5xl`), section padding (`md:py-24`) |
| `lg:` (1024px) | Nav desktop/mobile split (`lg:hidden` / `lg:flex`), grid cols (`lg:grid-cols-3`), marketplace detail 3-col layout |
| `xl:` | Not used anywhere |

**Key gap**: Nothing targets the 375–639px range specifically. The `sm:` breakpoint at 640px means phones (375–430px) always get the "no-prefix" mobile styles.

### Current Nav Implementation — `app/components/nav.tsx`

- **Desktop** (≥1024px): Glass-surface horizontal nav bar, `max-w-6xl`, `sticky top-0 z-[70]`, `h-[72px]`
  - Logo hidden below `lg:` (line 94: `hidden ... lg:flex`)
  - Links hidden below `lg:` (line 105: `hidden ... lg:flex`)
- **Mobile** (<1024px): `StaggeredMenu` third-party component, `fixed` position, `z-[80]`, triggered by a hamburger button on the right
  - `ThemeToggle` floats independently at `fixed top-4 left-4 z-[80]` (line 152)
  - **No logout button in mobile menu** — only links to pages; logout is desktop-only (line 129-134 inside `lg:flex`)
  - **No scroll locking** when mobile menu opens
  - StaggeredMenu is an opaque library component (`.d.ts` only, likely from a package or compiled JS)

### Current Modal/Dialog Patterns

Three modal implementations, all custom (no `<dialog>` element):

| Modal | File | Max Width | Mobile Behavior |
|-------|------|-----------|-----------------|
| BookingModal | `marketplace/[id]/components/booking-modal.tsx` | `max-w-md` (448px) | Centered with `p-4` inset. Works okay but not full-screen on mobile. |
| QuoteModal | `marketplace/[id]/components/quote-modal.tsx` | `max-w-2xl` (672px) | Centered — **overflows on 375px screens** due to form grid and padding. No scroll container inside modal. |
| ConfirmDialog | `dashboard/components/confirm-dialog.tsx` | `max-w-md` (448px) | Centered, simpler content. Acceptable on mobile. |

**Common pattern**: All use `fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm` as overlay. Escape key closes. No body scroll locking. No `<dialog>` element or `inert` on underlying content.

### Current Table/List Patterns

**No `<table>` elements exist in the codebase.** All data is displayed as card grids:
- `ad-slot-grid.tsx:209` — `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`
- `ad-slot-list.tsx:72` — `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`
- `campaign-list.tsx:71` — `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`
- Dashboard stat cards: `grid gap-3 sm:grid-cols-3`

On < 640px all grids collapse to single column — good.

### Current Card Patterns

- Marketplace cards (`ad-slot-grid.tsx:228`): rounded-xl, `p-4`, hover translate, internal flex/grid layouts
- Dashboard cards (`ad-slot-card.tsx`, `campaign-card.tsx`): same pattern, include inline edit forms
- Feature cards (`features-section.tsx:46`): `p-6` with icon + text

### Known CSS Issues

1. **Hero section** (`hero-section.tsx:8`): `left-1/2 w-screen -translate-x-1/2` — can cause horizontal scroll if any ancestor has `overflow: hidden` issues
2. **CTA section** (`cta-section.tsx:15`): Same `left-1/2 w-screen -translate-x-1/2` pattern
3. **QuoteModal grid** (`quote-modal.tsx:509`): `grid-cols-1 sm:grid-cols-2` — the 2-col layout at 640px+ is fine, but the modal container at `max-w-2xl` (672px) inside a `p-4` (8px each side from overlay) + `p-6` (24px each side from modal) leaves only ~624px for content. On phones with 375px viewport, the modal's inner scroll is missing — long forms scroll the backdrop instead.
4. **No `overflow-x: hidden`** on body/html — full-width sections may leak
5. **Marketplace filters** (`marketplace-filters.tsx:105`): `grid gap-3 sm:grid-cols-2 lg:grid-cols-5` — on mobile (< 640px) this stacks to 1 column which is fine, but 5 filter controls in a row above 1024px may get cramped
6. **Dashboard stat cards** use `bg-slate-50` hardcoded (e.g., `ad-slot-card.tsx:133`, `campaign-card.tsx:155`) which doesn't adapt to dark mode
7. **Login page select** (`login/page.tsx:94`): `bg-white text-gray-900` hardcoded, breaks dark mode
8. **Mobile CTA footer bar** (`ad-slot-detail.tsx:691-757`): Already exists with `lg:hidden`, good implementation with price + action buttons

---

## 2) Mobile UX Audit — Issues Checklist

### Navigation

- [ ] **No logout in mobile menu** — `nav.tsx:129-134` is inside `lg:flex`. Logged-in mobile users can't log out.
  - *Fix*: Add logout as a menu item in StaggeredMenu's `items` array when user is authenticated.

- [ ] **ThemeToggle overlaps StaggeredMenu hamburger** — both float fixed at `top-4`, ThemeToggle at `left-4`, StaggeredMenu button at `right` (line 152-172). On narrow screens, the theme toggle may overlap content.
  - *Fix*: Move ThemeToggle inside the mobile menu or position it consistently.

- [ ] **No scroll lock when mobile menu is open** — StaggeredMenu is a third-party component and may not lock body scroll.
  - *Fix*: Add `overflow: hidden` to body when StaggeredMenu opens via `onMenuOpen`/`onMenuClose` callbacks.

- [ ] **Mobile nav bar still takes 72px height even though content is hidden** — The `GlassSurface` renders at 72px height on mobile even though links are `lg:flex` hidden. The nav bar area is `pointer-events-none` below `lg:` (line 83), so it's not interactive but still takes visual space.
  - *Fix*: Hide the glass bar on mobile entirely (`lg:block hidden`) or reduce its height.

### Forms

- [ ] **QuoteModal form overflows on small screens** — `max-w-2xl` (672px) modal with `p-6` internal padding. On 375px devices, the modal is wider than viewport minus padding, and internal content can't scroll.
  - *Fix*: Add `max-h-[calc(100dvh-2rem)] overflow-y-auto` to the modal dialog content, and use `sm:max-w-2xl max-w-full` approach.

- [ ] **Dashboard inline edit forms lack mobile optimization** — `ad-slot-card.tsx` and `campaign-card.tsx` contain inline edit forms with `sm:grid-cols-2` grids. On mobile these stack fine, but the card + form combo becomes very long.
  - *Fix*: Acceptable as-is since cards are single-column on mobile. Low priority.

- [ ] **Input fields are `px-3 py-2 text-sm`** — py-2 = 8px top/bottom + text-sm line height ≈ 36px total height. Apple recommends min 44px touch targets.
  - *Fix*: Increase to `py-2.5` or `py-3` on mobile for all form inputs to hit ≥44px.

- [ ] **Login page select has hardcoded `bg-white text-gray-900`** — `login/page.tsx:94`
  - *Fix*: Use `bg-[var(--color-background)] text-[var(--color-foreground)]` instead.

- [ ] **No `inputMode` attributes** — Number inputs use `type="number"` which is correct, but `tel` and `email` are already used in quote modal. Good.

### Cards & Lists

- [ ] **Marketplace card text can be tight on 375px** — Card padding `p-4` (16px) inside a container with `p-4` leaves 375 - 32 - 32 = 311px for card content. This is acceptable but tight.
  - *Fix*: Reduce outer container padding to `p-3` on smallest screens if needed. Low priority.

- [ ] **No visual feedback for card taps on mobile** — Cards have `hover:-translate-y-0.5 hover:shadow-lg` which doesn't trigger on touch.
  - *Fix*: Add `active:scale-[0.98]` for touch feedback.

### Tables

- No tables in codebase — **no issues here**. All data uses card grids.

### Modals & Dialogs

- [ ] **Modals don't become full-screen on mobile** — All modals use `flex items-center justify-center` with fixed max-width. On 375px screens, BookingModal (`max-w-md` = 448px) gets clipped to viewport minus padding, which works. But QuoteModal (`max-w-2xl` = 672px) is problematic.
  - *Fix*: On mobile, make modals slide up from bottom and be full-height with internal scroll.

- [ ] **No body scroll lock on modal open** — Background scrolls while modal is open.
  - *Fix*: Add `document.body.style.overflow = 'hidden'` when modal opens, restore on close.

- [ ] **Modal close button is small** — `p-1` with ✕ character = ~28px touch target (line 185-189 in booking-modal.tsx, line 491-499 in quote-modal.tsx).
  - *Fix*: Increase to `p-2` minimum, ideally `min-h-[44px] min-w-[44px]`.

- [ ] **ConfirmDialog buttons may be small** — `px-4 py-2` = ~36px height.
  - *Fix*: Increase to `py-2.5` or `py-3` on mobile.

### Performance / Polish

- [ ] **Hero full-width trick may cause horizontal scroll** — `left-1/2 w-screen -translate-x-1/2` pattern in `hero-section.tsx:8` and `cta-section.tsx:15` — if body has scrollbar, `100vw` includes scrollbar width causing horizontal overflow.
  - *Fix*: Add `overflow-x: hidden` to `<html>` or `<body>` in `globals.css`, or use `overflow-x-clip` on `<main>`.

- [ ] **No `viewport-fit=cover` for iOS safe areas** — Not critical but would improve notch handling.
  - *Fix*: Add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` in layout/metadata and use `env(safe-area-inset-*)` for fixed elements.

- [ ] **Mobile CTA footer bar on marketplace detail** — Already implemented well at `ad-slot-detail.tsx:691`. Hides when footer is visible. Good pattern.

- [ ] **Toast region** — `dashboard-toast-region.tsx:17`: `fixed right-4 top-24 z-[70] w-[min(92vw,360px)]` — good mobile sizing with `min(92vw, ...)`.

---

## 3) Proposed Mobile-First System

### Breakpoint Rules

| Prefix | Width | Usage |
|--------|-------|-------|
| *(none)* | 0–639px | Mobile-first defaults. Single column, stacked layouts, full-width modals. |
| `sm:` | ≥640px | Two-column grids, side-by-side form fields, inline buttons. |
| `md:` | ≥768px | Larger text sizes, more generous padding. |
| `lg:` | ≥1024px | Desktop nav, 3-column grids, sidebar layouts, centered modals. |

**No new breakpoints needed.** The existing Tailwind defaults are sufficient.

### Touch Target Policy

- All interactive elements (buttons, links, inputs, selects) must be **≥44px** in height on touch devices
- Achieved via: `min-h-[44px]` on buttons, `py-2.5` or `py-3` on form inputs
- Close buttons on modals: `min-w-[44px] min-h-[44px]` with centered icon

### Spacing Rules

- **Container**: Keep `p-4` (16px) on `<main>` — sufficient for mobile
- **Cards**: Keep `p-4` internal padding — gives 311px content width on 375px which is acceptable
- **Modal internal**: `p-4 sm:p-6` — reduce padding on mobile
- **Sections**: Landing sections already use `px-4` → `md:px-10` pattern, good

### Typography Scaling

- No changes needed. Current pattern: base text-sm/text-base, `md:text-xl` for hero, `text-2xl` → `md:text-4xl` for headings. Good mobile-first approach.

### Safe-Area Support

- Add `viewport-fit=cover` to viewport meta
- Add `pb-[env(safe-area-inset-bottom)]` to fixed bottom bars (mobile CTA footer, modals in bottom-sheet mode)
- Add `pt-[env(safe-area-inset-top)]` to fixed top nav elements

### No-Horizontal-Scroll Enforcement

- Add `overflow-x: hidden` to `<html>` element in `globals.css`
- This is the safest approach given the `w-screen` tricks in hero/CTA sections

---

## 4) Implementation Plan (Phased)

### Phase A: Global Layout & Overflow Fixes

**Impact**: High — prevents horizontal scroll, establishes safe-area support
**Risk**: Low — additive CSS changes

#### Task A1: Add overflow-x hidden and safe-area viewport

**File**: `apps/frontend/app/globals.css`
**Changes**:
```css
html {
  overflow-x: hidden;
}
```
**Regression check**: Verify desktop layouts still scroll vertically. Verify no content is clipped that shouldn't be.

#### Task A2: Add viewport-fit=cover

**File**: `apps/frontend/app/layout.tsx`
**Changes**: Add to metadata export:
```tsx
export const metadata: Metadata = {
  // ... existing
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  // OR use the new Next.js viewport export:
};
```
Actually, in Next.js App Router, use the `viewport` export:
```tsx
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};
```
**Regression check**: Desktop unchanged. iOS devices should render into safe areas.

#### Task A3: Add safe-area padding to mobile CTA footer

**File**: `apps/frontend/app/marketplace/[id]/components/ad-slot-detail.tsx`
**Changes**: On the fixed bottom bar (line 692), add `pb-[env(safe-area-inset-bottom)]`:
```tsx
<div className="fixed inset-x-0 bottom-0 z-50 border-t ... px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg lg:hidden">
```
**Regression check**: Bar still appears correctly on non-notch devices.

---

### Phase B: Navigation — Mobile Menu Fixes

**Impact**: High — fixes logout, scroll lock, and menu UX
**Risk**: Medium — touches third-party StaggeredMenu component

#### Task B1: Add logout to mobile menu

**File**: `apps/frontend/app/components/nav.tsx`
**Changes**: The `menuItems` array (line 48-61) currently only includes page links. StaggeredMenu accepts `items` with `{label, ariaLabel, link}`. Since logout is an action (not a link), we need a workaround:

Option 1 (simplest): Add a `/logout` route that performs the logout action server-side, then include `{label: 'Logout', ariaLabel: 'Log out', link: '/logout'}` in `menuItems` when `user` is truthy.

Option 2 (better UX): If StaggeredMenu supports `onClick` on items, use that. Check the component's actual JS bundle. If not, go with Option 1 and create a thin `/logout/page.tsx` that calls `authClient.signOut()` on mount and redirects.

**Suggested approach**: Option 2 if StaggeredMenu supports it; otherwise Option 1 with a new file:
- Create `apps/frontend/app/logout/page.tsx` — client component that calls `authClient.signOut()` and redirects to `/`
- Add to `menuItems`: `...(user ? [{ label: 'Logout', ariaLabel: 'Log out of your account', link: '/logout' }] : [])`

**Regression check**: Desktop logout button still works. Mobile menu shows Logout when logged in, doesn't show it when logged out.

#### Task B2: Add scroll lock when mobile menu opens

**File**: `apps/frontend/app/components/nav.tsx`
**Changes**: Use `onMenuOpen` and `onMenuClose` callbacks (line 167-168, currently just `console.log`):
```tsx
onMenuOpen={() => {
  document.body.style.overflow = 'hidden';
}}
onMenuClose={() => {
  document.body.style.overflow = '';
}}
```
**Regression check**: Body scrolls normally when menu is closed. No scroll behind open menu.

#### Task B3: Hide desktop glass bar on mobile

**File**: `apps/frontend/app/components/nav.tsx`
**Changes**: The `<header>` at line 82 contains the GlassSurface bar. Currently `pointer-events-none lg:pointer-events-auto`. Change to hide it entirely on mobile:
```tsx
<header className="sticky top-0 z-[70] hidden px-4 pt-4 lg:block">
```
This removes the empty 72px glass bar from mobile. The StaggeredMenu hamburger already provides mobile navigation.

**Regression check**: Desktop nav unchanged. Mobile no longer has a blank glass bar at top. Ensure StaggeredMenu hamburger button is still visible and accessible.

#### Task B4: Reposition ThemeToggle on mobile

**File**: `apps/frontend/app/components/nav.tsx`
**Changes**: Currently ThemeToggle is at `fixed top-4 left-4 z-[80]` (line 152). This is separate from the StaggeredMenu. Consider moving it to a less intrusive position:
```tsx
<div className="fixed bottom-4 left-4 z-[80] lg:hidden">
  <ThemeToggle />
</div>
```
Or better: position it next to the StaggeredMenu button (both on the right side). Keep `fixed top-4 left-4` but add safe-area awareness:
```tsx
<div className="fixed left-4 top-[max(1rem,env(safe-area-inset-top))] z-[80] lg:hidden">
```

**Regression check**: Theme toggle still visible on mobile, doesn't overlap menu or content.

---

### Phase C: Modals — Mobile Full-Screen / Bottom Sheet

**Impact**: High — fixes the biggest usability problems (QuoteModal overflow, scroll issues)
**Risk**: Medium — structural changes to modal layout

#### Task C1: Create a shared modal wrapper utility

**File**: Create `apps/frontend/app/components/mobile-modal-wrapper.tsx`
**Purpose**: Encapsulate mobile-specific modal behavior:
- Body scroll lock on open
- Full-screen on mobile, centered on desktop
- Internal scroll for long content
- Bottom-to-top slide animation on mobile

```tsx
// Simplified sketch:
interface MobileModalWrapperProps {
  isOpen: boolean;
  onClose(): void;
  maxWidth?: string; // e.g., 'max-w-md', 'max-w-2xl'
  children: React.ReactNode;
  ariaLabelledBy: string;
}

export function MobileModalWrapper({ isOpen, onClose, maxWidth = 'max-w-md', children, ariaLabelledBy }: MobileModalWrapperProps) {
  // On mount: document.body.style.overflow = 'hidden'
  // On unmount: document.body.style.overflow = ''

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm ...">
      {/* Mobile: full-screen, slides up from bottom */}
      {/* Desktop: centered dialog */}
      <div className={`
        fixed inset-0 flex flex-col bg-[var(--color-background)] overflow-y-auto
        lg:static lg:inset-auto lg:mx-auto lg:my-auto lg:flex lg:max-h-[90vh]
        lg:w-full lg:${maxWidth} lg:rounded-xl lg:border lg:border-[var(--color-border)] lg:shadow-xl
      `}>
        {children}
      </div>
    </div>
  );
}
```

**Regression check**: All three modals render correctly on both mobile and desktop.

#### Task C2: Refactor BookingModal to use mobile wrapper

**File**: `apps/frontend/app/marketplace/[id]/components/booking-modal.tsx`
**Changes**:
- Replace the outer `<div className="fixed inset-0 z-50 flex items-center justify-center ...">` and inner `<div className="w-full max-w-md ...">` with MobileModalWrapper
- Add `overflow-y-auto` to inner content
- Make the modal full-screen on mobile: remove `items-center justify-center` on mobile, add it only for `lg:`
- Increase close button to 44x44: change `p-1` to `flex h-11 w-11 items-center justify-center`
- Add body scroll lock

Simpler alternative (avoid new component, just update classes):
```tsx
// Outer overlay stays the same
// Inner dialog changes:
<div className="flex h-full w-full flex-col overflow-y-auto bg-[var(--color-background)] p-4 sm:p-6 lg:mx-auto lg:my-auto lg:h-auto lg:max-h-[90vh] lg:max-w-md lg:rounded-xl lg:border lg:border-[var(--color-border)] lg:shadow-xl">
```

**Regression check**: BookingModal opens/closes, form submits, analytics still tracked, Escape closes, focus management works.

#### Task C3: Refactor QuoteModal for mobile

**File**: `apps/frontend/app/marketplace/[id]/components/quote-modal.tsx`
**Changes**: Same pattern as C2. This is the most critical one since the 2-col form + large max-width overflows on mobile.
- On mobile: full-screen with internal scroll
- Reduce padding: `p-4 sm:p-6`
- Close button: increase to 44x44
- Add body scroll lock

**Regression check**: QuoteModal form scrollable on mobile, all fields accessible, file upload works, form submits correctly.

#### Task C4: Refactor ConfirmDialog for mobile

**File**: `apps/frontend/app/dashboard/components/confirm-dialog.tsx`
**Changes**: Lighter touch — this dialog is small enough to stay centered. Just:
- Increase button heights to 44px on mobile: add `min-h-[44px]`
- Add body scroll lock
- Increase close affordance

**Regression check**: Delete confirmation still works on both dashboard types.

---

### Phase D: Tables → Not Applicable

No tables exist. **Skip this phase.** Card grids already collapse to single column.

---

### Phase E: Forms — Input Types, Sizing, Keyboard UX

**Impact**: Medium — improves tap accuracy and keyboard experience
**Risk**: Low — CSS-only changes + attribute additions

#### Task E1: Increase touch target height on all form inputs

**Files**: All form-containing components:
- `apps/frontend/app/marketplace/[id]/components/booking-modal.tsx`
- `apps/frontend/app/marketplace/[id]/components/quote-modal.tsx`
- `apps/frontend/app/dashboard/publisher/components/create-ad-slot-button.tsx`
- `apps/frontend/app/dashboard/publisher/components/ad-slot-card.tsx`
- `apps/frontend/app/dashboard/sponsor/components/create-campaign-button.tsx`
- `apps/frontend/app/dashboard/sponsor/components/campaign-card.tsx`
- `apps/frontend/app/marketplace/components/marketplace-filters.tsx`
- `apps/frontend/app/components/footer.tsx`
- `apps/frontend/app/login/page.tsx`

**Changes**: Global approach in `globals.css` is cleanest:
```css
@media (pointer: coarse) {
  input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
  select,
  textarea {
    min-height: 44px;
  }

  button,
  [role="button"],
  a {
    min-height: 44px;
  }
}
```

This uses `pointer: coarse` media query to only apply on touch devices, preserving desktop density.

**Regression check**: Desktop inputs unchanged. Mobile inputs are tappable. No layout shifts.

#### Task E2: Fix login page select dark mode

**File**: `apps/frontend/app/login/page.tsx`
**Changes** (line 94):
```tsx
// Before:
className="mt-1 w-full rounded border border-[var(--color-border)] bg-white px-3 py-2 text-gray-900"
// After:
className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
```

**Regression check**: Select readable in both light and dark modes.

#### Task E3: Add inputMode attributes where beneficial

**Files**: Various form inputs
**Changes**:
- Number inputs: already use `type="number"`, which is correct
- Phone input in QuoteModal: already uses `type="tel"`, correct
- Email inputs: already use `type="email"`, correct
- Search input in marketplace filters: already uses `type="search"`, correct

**Status**: Already good. No changes needed.

---

### Phase F: Cards/Lists Polish

**Impact**: Low-medium — visual refinements
**Risk**: Very low

#### Task F1: Add touch feedback to marketplace cards

**File**: `apps/frontend/app/marketplace/components/ad-slot-grid.tsx`
**Changes** (line 228): Add `active:scale-[0.98]` to the card Link:
```tsx
className={`group relative block overflow-hidden rounded-xl ... active:scale-[0.98] transition-all duration-200 ...`}
```

**Regression check**: Cards still clickable, hover effects on desktop unchanged.

#### Task F2: Add touch feedback to dashboard cards

**Files**:
- `apps/frontend/app/dashboard/publisher/components/ad-slot-card.tsx` (line 119)
- `apps/frontend/app/dashboard/sponsor/components/campaign-card.tsx` (line 141)

**Changes**: Add `active:scale-[0.99]` to article elements.

**Regression check**: Edit/delete buttons still work. Card hover effects on desktop unchanged.

#### Task F3: Fix dark-mode hardcoded backgrounds in dashboard cards

**Files**:
- `apps/frontend/app/dashboard/publisher/components/ad-slot-card.tsx` (line 133): `bg-slate-50` hardcoded
- `apps/frontend/app/dashboard/sponsor/components/campaign-card.tsx` (line 155): `bg-slate-50` hardcoded

**Changes**: Replace `bg-slate-50` with `bg-[var(--color-background)]` or `bg-slate-50 dark:bg-slate-800`.

**Regression check**: Cards readable in both light and dark modes.

---

## 5) Acceptance Criteria (Testable Checklist)

- [ ] **No horizontal scrolling** on 375px, 390px, and 414px viewport widths across all routes
- [ ] **Mobile nav** has hamburger menu with working logout when authenticated
- [ ] **Body doesn't scroll** behind open mobile menu or any modal
- [ ] **All form inputs ≥44px** touch target height on `pointer: coarse` devices
- [ ] **QuoteModal** scrollable on 375px screen, all fields reachable, form submits
- [ ] **BookingModal** usable on 375px screen
- [ ] **ConfirmDialog** buttons are ≥44px tap targets
- [ ] **Login page** select is readable in dark mode
- [ ] **Marketplace cards** have touch feedback (press state)
- [ ] **Dashboard cards** background adapts to dark mode
- [ ] **Fixed bottom CTA bar** (`/marketplace/[id]`) has safe-area bottom padding
- [ ] **ThemeToggle** accessible on mobile without overlapping other controls
- [ ] **Desktop UI unchanged** — all existing layouts, hover effects, and interactions still work at ≥1024px
- [ ] **Lighthouse mobile score**: Performance ≥80, Accessibility ≥90, no critical layout shift warnings
- [ ] **Reduced motion respected**: All new animations honor `prefers-reduced-motion`

---

## 6) QA Plan (Step-by-Step Test Script)

### Setup
1. Open Chrome DevTools → Toggle Device Toolbar
2. Select **iPhone SE** (375×667) as primary test device
3. Also test **iPhone 14 Pro** (393×852) and **Pixel 7** (412×915)

### Route-by-Route Tests

#### Landing Page `/`
1. ✅ No horizontal scroll at 375px
2. ✅ Hero text readable, CTA buttons full-width and tappable
3. ✅ Feature cards stack single-column
4. ✅ How It Works stepper navigable (tap Next/Previous)
5. ✅ CTA section doesn't overflow
6. ✅ Footer newsletter form usable — email input + subscribe button
7. ✅ Hamburger menu opens → body stops scrolling → menu links work → menu closes

#### Login `/login`
1. ✅ Form centered and readable
2. ✅ Select dropdown usable in light and dark mode
3. ✅ Login button ≥44px tall
4. ✅ Login successful, redirects to dashboard

#### Marketplace `/marketplace`
1. ✅ Filters stack to single column on mobile
2. ✅ Card grid is single column
3. ✅ Cards have touch press feedback
4. ✅ Search input is tap-friendly (≥44px)
5. ✅ "Clear all filters" link tappable

#### Marketplace Detail `/marketplace/[id]`
1. ✅ Content stacks (no sidebar on mobile)
2. ✅ Fixed bottom CTA bar appears with price + Book/Quote buttons
3. ✅ Bottom bar has safe-area padding (iOS notch simulation)
4. ✅ Tap "Book This Placement" → BookingModal opens full-screen on mobile
5. ✅ Modal body doesn't scroll behind
6. ✅ Modal close button (✕) is ≥44px tap target
7. ✅ Modal form fields are ≥44px height
8. ✅ Submit form → success message
9. ✅ Close modal → return focus to trigger button
10. ✅ Tap "Request a Quote" → QuoteModal opens full-screen on mobile
11. ✅ QuoteModal scrollable — can reach all fields including attachments
12. ✅ Back to marketplace link tappable
13. ✅ Scroll down → bottom bar hides when footer visible

#### Publisher Dashboard `/dashboard/publisher`
1. ✅ Stat cards stack to single column on mobile (they use `sm:grid-cols-3`)
2. ✅ "New Ad Slot" button tappable
3. ✅ Create form opens inline, all fields usable
4. ✅ Ad slot cards single column, Edit/Delete buttons tappable
5. ✅ Delete → ConfirmDialog appears, buttons are tappable
6. ✅ Toast notifications visible and dismissible

#### Sponsor Dashboard `/dashboard/sponsor`
1. ✅ Same as publisher dashboard tests
2. ✅ Campaign cards show budget progress bar
3. ✅ Date inputs usable (native date picker on mobile)

### Dark Mode Test
1. Toggle theme via ThemeToggle
2. Re-run all above tests in dark mode
3. Verify no hardcoded white/black backgrounds that break

### Slow 3G Test
1. DevTools → Network → Slow 3G
2. Navigate to `/marketplace`
3. ✅ Skeleton loading cards appear
4. ✅ Page eventually loads, no layout shift
5. Navigate to `/marketplace/[id]`
6. ✅ Loading skeleton appears for detail page
7. ✅ Images (logo) load progressively

### Accessibility Spot Check
1. ✅ Hamburger menu has `aria-label`
2. ✅ Modals have `aria-modal="true"` and `aria-labelledby`
3. ✅ Focus trapped in open modals
4. ✅ Escape key closes modals
5. ✅ All form fields have associated labels

---

## Implementation Priority Summary

| Phase | Impact | Effort | Risk |
|-------|--------|--------|------|
| A: Global layout + overflow | High | Low | Low |
| B: Navigation fixes | High | Medium | Medium |
| C: Modal mobile behavior | High | Medium | Medium |
| E: Form touch targets | Medium | Low | Low |
| F: Card polish | Low | Low | Very Low |
| D: Tables | N/A | N/A | N/A |

**Recommended order**: A → B → C → E → F

Total estimated files touched: ~12 files
New files: 1–2 (logout page, optionally mobile modal wrapper)
