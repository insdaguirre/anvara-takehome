# Bonus 5: Improve Error & Empty States — Implementation Plan

---

## 1. Repo Findings

### 1a. Data-Fetching List UIs

| Screen | Component | File | Fetching Pattern |
|--------|-----------|------|------------------|
| Marketplace grid | `AdSlotGrid` | `app/marketplace/components/ad-slot-grid.tsx` | Client-side `useEffect` → `getMarketplaceAdSlots()` (lib/api.ts) |
| Marketplace detail | `AdSlotDetail` | `app/marketplace/[id]/components/ad-slot-detail.tsx` | Client-side `useEffect` → `getMarketplaceAdSlot(id)` |
| Publisher dashboard | `AdSlotList` | `app/dashboard/publisher/components/ad-slot-list.tsx` | Server-fetched via `page.tsx:31` → passed as props |
| Sponsor dashboard | `CampaignList` | `app/dashboard/sponsor/components/campaign-list.tsx` | Server-fetched via `page.tsx:31` → passed as props |
| Publisher stats | `PublisherDashboardClient` | `app/dashboard/publisher/components/publisher-dashboard-client.tsx` | Stats computed from ad-slot props |
| Sponsor stats | `SponsorDashboardClient` | `app/dashboard/sponsor/components/sponsor-dashboard-client.tsx` | Stats computed from campaign props |

### 1b. Existing Error Handling Patterns

| Pattern | Location | Notes |
|---------|----------|-------|
| Next.js `error.tsx` (route-level boundary) | `app/dashboard/publisher/error.tsx`, `app/dashboard/sponsor/error.tsx` | Inline red box, `reset()` button. No `role="alert"`, no icon, hard-coded light-mode colors. |
| Server-side try/catch → string prop | `app/dashboard/publisher/page.tsx:29-35`, `app/dashboard/sponsor/page.tsx:29-35` | Error string passed to client component |
| Client `useState<string \| null>` error | `ad-slot-grid.tsx:100`, `ad-slot-detail.tsx:70`, `login/page.tsx:14` | Inline red div with retry or nothing |
| Server action `{ error }` return | `dashboard/publisher/actions.ts`, `dashboard/sponsor/actions.ts` | `useActionState` reads `state.error`, rendered inline in forms |
| Toast notifications | `dashboard-toast-region.tsx` + `use-dashboard-toasts.ts` | `role="alert"` for error tone, auto-dismiss 4.2s |
| API client error parsing | `lib/api.ts:18-35` | Throws `Error(message)` on non-OK response |
| Modal error state | `booking-modal.tsx`, `quote-modal.tsx` | Inline `useState` error below form fields |

**Missing error handling:**
- **No global `error.tsx`** at `app/error.tsx` — unhandled route errors show Next.js default
- **No `not-found.tsx`** anywhere — 404s show Next.js default
- **No `loading.tsx`** at `app/loading.tsx` or `app/marketplace/loading.tsx`
- Existing `error.tsx` files don't use CSS variables → broken in dark mode
- Marketplace error state (`ad-slot-grid.tsx:166-175`) has no icon, minimal styling, no `role="alert"`
- Detail page error (`ad-slot-detail.tsx:347-361`) has no retry button, no icon

### 1c. Current Loading UI Patterns

| Screen | Pattern | File:Line |
|--------|---------|-----------|
| Publisher dashboard | Route-segment `loading.tsx` with skeleton cards | `app/dashboard/publisher/loading.tsx` (full file) |
| Sponsor dashboard | Route-segment `loading.tsx` with skeleton cards | `app/dashboard/sponsor/loading.tsx` (full file) |
| Marketplace grid | Inline `renderSkeletonCards()` (6 pulse cards) | `ad-slot-grid.tsx:75-94` |
| Marketplace detail | Full skeleton layout (hero + sidebar + stats) | `ad-slot-detail.tsx:297-344` |
| Login page | Button text "Logging in..." + `disabled:opacity-50` | `login/page.tsx:104-106` |
| Role loading (detail) | CTA button shows "Loading..." | `ad-slot-detail.tsx:611-618` |

**Problems:**
- Skeleton pulse uses hard-coded `bg-slate-200` / `bg-gray-200` → invisible in dark mode
- `SkeletonCard` is duplicated between `publisher/loading.tsx:1-10` and `sponsor/loading.tsx:3-12`
- No skeleton for marketplace route-level `loading.tsx`
- No `aria-busy` / `aria-live` on dashboard skeletons (marketplace detail does have it)

### 1d. Existing Shared UI Primitives

| Role | Status | Location |
|------|--------|----------|
| Button | **No shared component** — inline Tailwind everywhere | — |
| Card | **No shared component** — repeated `rounded-xl border...` pattern | — |
| Toast | **Exists** — `DashboardToastRegion` + `useDashboardToasts` | `app/dashboard/components/` |
| Confirm Dialog | **Exists** — `ConfirmDialog` | `app/dashboard/components/confirm-dialog.tsx` |
| Skeleton | **No shared component** — duplicated `animate-pulse` divs | — |
| EmptyState | **No shared component** — repeated dashed-border + Inbox icon pattern | — |
| ErrorState | **No shared component** — repeated red box pattern | — |
| Icons | **lucide-react** — `AlertCircle`, `Inbox`, `CheckCircle2`, `X`, etc. | All components |

---

## 2. State System Proposal

### 2a. `<EmptyState />`

Create at: **`app/components/ui/empty-state.tsx`**

```typescript
interface EmptyStateProps {
  /** lucide-react icon component, defaults to Inbox */
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  /** Secondary link/action */
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}
```

**Visual style rules:**
- Outer: `rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] p-10 text-center`
- Icon: `mx-auto h-9 w-9 text-[var(--color-muted)]` + `aria-hidden="true"`
- Title: `mt-3 text-lg font-medium text-[var(--color-foreground)]`
- Description: `mt-1 text-sm text-[var(--color-muted)]`
- Primary CTA: `mt-4 inline-flex rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90`
- Secondary: `mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline`

**Accessibility:**
- No `aria-live` needed (static content, not an update notification)
- CTA buttons have descriptive text (no "Click here")
- If `href` provided, render as `<Link>` with proper semantics

**Copy guidelines:** "You haven't created any [things] yet." not "No data found." Always suggest the next step.

### 2b. `<ErrorState />`

Create at: **`app/components/ui/error-state.tsx`**

```typescript
interface ErrorStateProps {
  title?: string;          // default: "Something went wrong"
  description?: string;    // default: "We couldn't load this content. Please try again."
  onRetry?: () => void;    // renders "Try again" button
  onBack?: () => void;     // renders "Go back" button
  backHref?: string;       // alternative: renders <Link> instead of button
  /** Raw error for dev-mode detail panel */
  error?: Error | null;
  className?: string;
}
```

**Visual style rules:**
- Outer: `rounded-xl border border-[var(--color-error)]/20 bg-[var(--color-error)]/5 p-5` + `role="alert" aria-live="assertive"`
- Icon: `AlertCircle` from lucide, `h-5 w-5 text-[var(--color-error)]` + `aria-hidden="true"`
- Layout: flex row — icon left, text + buttons right
- Title: `font-semibold text-[var(--color-error)]`
- Description: `mt-1 text-sm text-[var(--color-error)]/80`
- Retry button: `mt-3 rounded-lg border border-[var(--color-error)]/30 px-3 py-1.5 text-sm font-medium text-[var(--color-error)] transition-colors hover:bg-[var(--color-error)]/10`
- Dev details: `<details>` with `<pre>` for `error.stack`, only when `process.env.NODE_ENV === 'development'`

**Accessibility:**
- `role="alert"` + `aria-live="assertive"` on the container
- Retry button gets `autoFocus` when error state appears (focus management)
- Button labels are explicit: "Try again" not just "Retry"

**Copy guidelines:** "We couldn't load your [things]." not "Error 500." Always offer a way out.

### 2c. `<Skeleton />`

Create at: **`app/components/ui/skeleton.tsx`**

```typescript
interface SkeletonProps {
  className?: string;  // width, height, border-radius overrides
}

// Also export compound skeletons:
interface SkeletonCardGridProps {
  count?: number;       // default: 6
  columns?: string;     // default: 'sm:grid-cols-2 lg:grid-cols-3'
}

interface SkeletonDetailProps {
  // no props — matches marketplace detail layout
}
```

**Visual style rules:**
- Base `<Skeleton>`: `animate-pulse rounded bg-[var(--color-border)]` (uses CSS var → works in dark mode)
- `motion-reduce:animate-none` for reduced-motion preference
- Container gets `role="status" aria-busy="true" aria-live="polite"` + `<span className="sr-only">Loading...</span>`

**Why `bg-[var(--color-border)]` instead of `bg-slate-200`:** The existing `bg-slate-200` / `bg-gray-200` is invisible in dark mode. `--color-border` is `#e2e8f0` (light) / `#334155` (dark) — always visible.

### 2d. `<InlineNotice />` (optional, low-priority)

Create at: **`app/components/ui/inline-notice.tsx`**

```typescript
interface InlineNoticeProps {
  tone: 'info' | 'warning' | 'error';
  children: React.ReactNode;
  className?: string;
}
```

Used for non-blocking inline warnings (e.g., "This listing is popular — book soon!"). Low priority for this iteration.

---

## 3. Screen-by-Screen Plan

### Top 10 High-Impact Improvements

| # | Location | Component(s) | Current Behavior | Proposed: Empty | Proposed: Error | Proposed: Loading | CTA(s) | Analytics |
|---|----------|-------------|------------------|-----------------|-----------------|-------------------|--------|-----------|
| **1** | `app/marketplace/components/ad-slot-grid.tsx:166-175` | `AdSlotGrid` | Plain red box, no icon, no `role="alert"`, retry is unstyled underline | — | `<ErrorState title="Couldn't load the marketplace" description="Our servers might be taking a break." onRetry={loadAdSlots} />` | Already has skeleton ✓ (but fix dark-mode colors) | "Try again" | `track('marketplace_error', { type: 'fetch_failed' })` |
| **2** | `app/marketplace/components/ad-slot-grid.tsx:186-206` | `AdSlotGrid` empty states | Bare text, no icon, no CTA for absolute-empty; "Clear all filters" for filtered-empty | `<EmptyState icon={ShoppingBag} title="Marketplace coming soon" description="Fresh ad placements are on the way." action={{ label: "List your inventory", href: "/login" }} />` | — | — | "List your inventory" → `/login`; "Clear all filters" (filtered) | — |
| **3** | `app/marketplace/[id]/components/ad-slot-detail.tsx:347-361` | `AdSlotDetail` error | Red box, no retry, no icon | `<ErrorState title="Listing not found" description="This placement may have been removed or the link is incorrect." backHref="/marketplace" />` | — | Already has skeleton ✓ (but fix dark-mode colors) | "Back to Marketplace" → `/marketplace` | `track('listing_error', { slot_id: id, type: error ? 'fetch' : 'not_found' })` |
| **4** | `app/dashboard/publisher/components/ad-slot-list.tsx:25-55` | `AdSlotList` error | Good structure (icon, retry), but hard-coded red colors, no focus management | Replace inline markup with `<ErrorState>` using same copy | — | — | "Try again" (triggers `router.refresh()` + toast) | Already tracked via toast |
| **5** | `app/dashboard/publisher/components/ad-slot-list.tsx:58-68` | `AdSlotList` empty | Good structure (Inbox icon), but no CTA button | `<EmptyState icon={Inbox} title="No ad slots yet" description="Create your first slot to start accepting sponsor bookings." action={{ label: "Create ad slot", onClick: scrollToCreateForm }} />` | — | — | "Create ad slot" → scrolls to / focuses the create form | — |
| **6** | `app/dashboard/sponsor/components/campaign-list.tsx:24-54` | `CampaignList` error | Identical to publisher — same issues | Replace with `<ErrorState>` | — | — | "Try again" | Already tracked via toast |
| **7** | `app/dashboard/sponsor/components/campaign-list.tsx:56-66` | `CampaignList` empty | Same pattern — no CTA | `<EmptyState icon={Inbox} title="No campaigns yet" description="Create your first campaign to start reaching publisher audiences." action={{ label: "Create campaign", onClick: scrollToCreateForm }} />` | — | — | "Create campaign" → scrolls to create form | — |
| **8** | `app/dashboard/publisher/error.tsx` | Route-level error boundary | Hard-coded light-mode red, no icon, no `role="alert"`, generic copy | Full-page `<ErrorState>` with CSS vars, icon, dev-mode stack trace. | — | — | "Try again" (calls `reset()`) + "Go to homepage" → `/` | `track('dashboard_error', { dashboard: 'publisher' })` |
| **9** | `app/dashboard/sponsor/error.tsx` | Route-level error boundary | Same as publisher | Same treatment as #8 | — | — | "Try again" + "Go to homepage" | `track('dashboard_error', { dashboard: 'sponsor' })` |
| **10** | `app/login/page.tsx:80-84` | `LoginPage` error | Bare red div, no icon, no `role="alert"` | Wrap with `<ErrorState>` (compact variant or use inline pattern with `role="alert"`) | — | — | (implicit — user retries by re-submitting) | `track('login_error', { message: error })` |

### Skeleton Dark-Mode Fixes (applies to all loading UIs)

| File | Lines | Fix |
|------|-------|-----|
| `app/dashboard/publisher/loading.tsx` | 4, 5, 6, 7, 16, 17, 19, 20, 21 | Replace `bg-slate-200` → `bg-[var(--color-border)]` |
| `app/dashboard/sponsor/loading.tsx` | 6, 7, 8, 9, 19, 20, 22, 23, 24 | Same |
| `app/marketplace/components/ad-slot-grid.tsx` | 83-89 | Replace `bg-gray-200` → `bg-[var(--color-border)]` |
| `app/marketplace/[id]/components/ad-slot-detail.tsx` | 301-338 | Replace `bg-gray-200` → `bg-[var(--color-border)]` |

---

## 4. Error Boundaries + Next.js Conventions

### Current State

| Route | `error.tsx` | `loading.tsx` | `not-found.tsx` |
|-------|-------------|---------------|-----------------|
| `app/` (root) | **MISSING** | **MISSING** | **MISSING** |
| `app/login/` | **MISSING** | **MISSING** | — |
| `app/marketplace/` | **MISSING** | **MISSING** | — |
| `app/marketplace/[id]/` | **MISSING** | **MISSING** | — |
| `app/dashboard/publisher/` | ✅ exists | ✅ exists | — |
| `app/dashboard/sponsor/` | ✅ exists | ✅ exists | — |

### Recommendations

1. **Add `app/error.tsx`** — Global catch-all error boundary. Uses `<ErrorState>` with "Go to homepage" CTA. Prevents Next.js default error page from leaking stack traces in production.

2. **Add `app/not-found.tsx`** — Custom 404 page. Friendly message: "This page doesn't exist." CTAs: "Go to Marketplace", "Go to Homepage".

3. **Add `app/marketplace/loading.tsx`** — Route-level loading skeleton for the marketplace page. Renders the filter bar skeleton + `<SkeletonCardGrid count={6} />`. This provides instant feedback during client-side navigation to `/marketplace`.

4. **Add `app/marketplace/[id]/loading.tsx`** — Skeleton matching the detail layout. Currently the skeleton is inside the client component (good for refetches), but the route-level `loading.tsx` provides faster feedback during Next.js navigation.

5. **Do NOT add `error.tsx` to `app/marketplace/` or `app/marketplace/[id]/`** — These pages do client-side fetching, so errors are handled within the component. A route-level `error.tsx` would only catch render errors, which is already covered by `app/error.tsx`.

6. **Upgrade existing `error.tsx` files** — Both dashboard error boundaries should:
   - Use CSS variables (not hard-coded red colors) for dark-mode support
   - Add `role="alert"` and `aria-live="assertive"`
   - Never render `error.message` in production (could leak internals)
   - Log errors to console in development only

---

## 5. Implementation Sequence

Ordered by smallest safe increments first, with the highest-impact changes earliest:

### Phase 1: Shared Primitives (foundation)
1. **Create `app/components/ui/skeleton.tsx`** — Extract `<Skeleton>` base + `<SkeletonCardGrid>` compound component
2. **Create `app/components/ui/empty-state.tsx`** — `<EmptyState>` with icon/title/description/CTA slots
3. **Create `app/components/ui/error-state.tsx`** — `<ErrorState>` with retry/back/dev-details

### Phase 2: Dark-Mode Skeleton Fix (zero-risk, high-value)
4. **Fix skeleton colors** in all 4 files (replace `bg-slate-200`/`bg-gray-200` → `bg-[var(--color-border)]`)
5. **Extract shared `SkeletonCard`** — deduplicate between publisher and sponsor `loading.tsx`

### Phase 3: Global Error Handling (prevent information leaks)
6. **Add `app/error.tsx`** — global error boundary
7. **Add `app/not-found.tsx`** — custom 404
8. **Upgrade `app/dashboard/publisher/error.tsx`** — use `<ErrorState>`, fix dark mode, add analytics
9. **Upgrade `app/dashboard/sponsor/error.tsx`** — same

### Phase 4: Marketplace Improvements (highest traffic)
10. **Upgrade `AdSlotGrid` error state** — replace inline red box with `<ErrorState>`
11. **Upgrade `AdSlotGrid` empty states** — replace inline markup with `<EmptyState>`
12. **Upgrade `AdSlotDetail` error state** — replace inline red box with `<ErrorState>`
13. **Add `app/marketplace/loading.tsx`** — route-level skeleton
14. **Add `app/marketplace/[id]/loading.tsx`** — route-level detail skeleton

### Phase 5: Dashboard Empty State CTAs
15. **Upgrade `AdSlotList` empty state** — use `<EmptyState>` with "Create ad slot" CTA
16. **Upgrade `CampaignList` empty state** — use `<EmptyState>` with "Create campaign" CTA
17. **Upgrade `AdSlotList` error state** — use `<ErrorState>` (already good structure, just dedup)
18. **Upgrade `CampaignList` error state** — same

### Phase 6: Login & Polish
19. **Upgrade `LoginPage` error display** — add `role="alert"`, icon, consistent styling
20. **Add analytics events** for error/empty states where listed in the table above

---

## 6. QA Checklist

### Manual QA Steps

```
SKELETON / LOADING STATES
[ ] Navigate to /marketplace — skeleton cards appear immediately, then real cards load
[ ] Navigate to /marketplace/[id] — skeleton detail layout appears, then content loads
[ ] Navigate to /dashboard/publisher — skeleton appears during route transition
[ ] Navigate to /dashboard/sponsor — skeleton appears during route transition
[ ] Toggle dark mode on each skeleton screen — pulse bars are visible (not invisible white)
[ ] Enable "prefers-reduced-motion" in OS → skeletons show static bars (no animation)

ERROR STATES
[ ] Stop the backend server → navigate to /marketplace → <ErrorState> appears with "Try again"
[ ] Click "Try again" → loading state appears, then error re-appears (backend still down)
[ ] Start the backend → click "Try again" → marketplace loads normally
[ ] Navigate to /marketplace/nonexistent-id → error state shows "Listing not found" with "Back to Marketplace"
[ ] Stop backend → navigate to /dashboard/publisher → route error.tsx catches it with retry
[ ] Stop backend → navigate to /dashboard/sponsor → same
[ ] Navigate to /nonexistent-route → custom 404 page appears with "Go to Marketplace"
[ ] Trigger a React render error (e.g., throw in a component) → app/error.tsx catches it

EMPTY STATES
[ ] Log in as publisher with no ad slots → empty state shows with "Create ad slot" CTA
[ ] Click "Create ad slot" CTA → create form scrolls into view / receives focus
[ ] Log in as sponsor with no campaigns → empty state shows with "Create campaign" CTA
[ ] On marketplace, if API returns [] → "Marketplace coming soon" empty state
[ ] On marketplace, apply filters that match nothing → "No listings match" with "Clear all filters"
[ ] Click "Clear all filters" → filters reset, all listings show

ACCESSIBILITY
[ ] Tab through error state → retry button is focusable and activatable with Enter/Space
[ ] Screen reader announces error states (role="alert" + aria-live="assertive")
[ ] Screen reader announces "Loading..." during skeleton states (sr-only text)
[ ] All empty state CTAs are keyboard-accessible
[ ] No color-only indicators — icons supplement color for error/empty distinction

DARK MODE
[ ] Every error state is readable in dark mode (uses CSS vars, not hard-coded colors)
[ ] Every empty state is readable in dark mode
[ ] Skeletons are visible in dark mode

LOGIN
[ ] Enter wrong credentials → error appears with role="alert", icon visible
[ ] Fix credentials → error clears on submit
```

### Component/Unit Test Suggestions

No test infrastructure currently exists (no jest/vitest config, no test files). If testing is set up:

1. **`<EmptyState>` unit tests:**
   - Renders title, description, icon
   - Renders primary CTA as `<Link>` when `href` provided
   - Renders primary CTA as `<button>` when `onClick` provided
   - Does not render CTA section when no action provided

2. **`<ErrorState>` unit tests:**
   - Renders with `role="alert"` and `aria-live="assertive"`
   - Calls `onRetry` when "Try again" button clicked
   - Renders dev details `<details>` only when `NODE_ENV === 'development'`
   - Renders back link when `backHref` provided

3. **`<Skeleton>` unit tests:**
   - Renders with `role="status"` and `aria-busy="true"`
   - Has sr-only "Loading..." text
   - `<SkeletonCardGrid>` renders correct number of skeleton cards

4. **Integration-style tests:**
   - `AdSlotGrid`: mock `getMarketplaceAdSlots` to reject → verify `<ErrorState>` renders
   - `AdSlotGrid`: mock to return `[]` → verify `<EmptyState>` renders
   - `AdSlotDetail`: mock `getMarketplaceAdSlot` to reject → verify `<ErrorState>` renders

---

## 7. Risks / Regression Prevention

| Risk | Mitigation |
|------|------------|
| **Dark mode regression** from hard-coded colors | All new components use CSS variables exclusively. Skeleton fix replaces `bg-slate-200`/`bg-gray-200` with `var(--color-border)`. |
| **Breaking existing error.tsx contracts** | Keep same Next.js interface `{ error: Error; reset: () => void }`. Only change the JSX inside. |
| **Empty state CTA "scroll to create form" could break** if create form component changes | Use `document.querySelector` with a stable `id` attribute on the create form, with a null-check fallback. |
| **Over-engineering: too many new files** | Only 3 new primitives (skeleton, empty-state, error-state) + 4 new route files. All are small (<50 lines each). |
| **Motion/animation conflicts** | New components are static (no motion/react dependency). They integrate into existing motion layouts without interference. |
| **Toast double-firing** on dashboard retry | Keep existing pattern where retry triggers a toast + `router.refresh()`. No change in behavior. |
| **Analytics event name collisions** | New events use distinct names: `marketplace_error`, `listing_error`, `dashboard_error`, `login_error`. All go through existing `analytics.track()`. |
| **SSR hydration mismatch** from `process.env.NODE_ENV` check | The dev-details `<details>` in `<ErrorState>` uses `process.env.NODE_ENV` which is inlined at build time — no hydration mismatch. |
| **Regression in `loading.tsx` wrappers** | Sponsor `loading.tsx` wraps in `<GrainientPageShell>`; publisher does not. Preserve this difference when refactoring. |
