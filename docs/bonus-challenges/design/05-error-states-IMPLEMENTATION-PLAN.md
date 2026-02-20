# Bonus 5: Error & Empty States — Implementation Plan

**Date:** February 19, 2026  
**Status:** Planning Phase (DO NOT IMPLEMENT YET)  
**Scope:** Comprehensive error, empty, and loading state improvements across all user journeys

---

## 1. Repo Findings

### 1.1 Data-Fetching List UIs

| Location | Component | Data Source | Current States |
|----------|-----------|-------------|----------------|
| [apps/frontend/app/dashboard/sponsor/page.tsx](apps/frontend/app/dashboard/sponsor/page.tsx#L1-L41) | `SponsorDashboardClient` | Server-side fetch via `getSponsorCampaigns()` | Has loading.tsx, error.tsx, empty state |
| [apps/frontend/app/dashboard/publisher/page.tsx](apps/frontend/app/dashboard/publisher/page.tsx#L1-L39) | `PublisherDashboardClient` | Server-side fetch via `getPublisherAdSlots()` | Has loading.tsx, error.tsx, empty state |
| [apps/frontend/app/marketplace/page.tsx](apps/frontend/app/marketplace/page.tsx#L1-L18) | `AdSlotGrid` | Client-side fetch via `getMarketplaceAdSlots()` | Has loading skeleton, error, empty |
| [apps/frontend/app/marketplace/[id]/page.tsx](apps/frontend/app/marketplace/[id]/page.tsx#L1-L16) | `AdSlotDetail` | Client-side fetch via `getMarketplaceAdSlot(id)` | Has loading skeleton, error state |
| [apps/frontend/app/dashboard/sponsor/components/campaign-list.tsx](apps/frontend/app/dashboard/sponsor/components/campaign-list.tsx#L1-L88) | `CampaignList` | Props from parent | Shows empty + error states |
| [apps/frontend/app/dashboard/publisher/components/ad-slot-list.tsx](apps/frontend/app/dashboard/publisher/components/ad-slot-list.tsx#L1-L83) | `AdSlotList` | Props from parent | Shows empty + error states |

**Dashboard Stats Panels:**
- [apps/frontend/app/dashboard/sponsor/components/sponsor-dashboard-client.tsx](apps/frontend/app/dashboard/sponsor/components/sponsor-dashboard-client.tsx#L48-L66) — 3-column stat cards (Total, Active, Spent/Budget)
- [apps/frontend/app/dashboard/publisher/components/publisher-dashboard-client.tsx](apps/frontend/app/dashboard/publisher/components/publisher-dashboard-client.tsx#L48-L66) — 3-column stat cards (Total, Available, Monthly Inventory)

### 1.2 Existing Error Handling Patterns

**Next.js Error Boundaries:**
- [apps/frontend/app/dashboard/sponsor/error.tsx](apps/frontend/app/dashboard/sponsor/error.tsx#L1-L21) — Basic error UI with retry button
- [apps/frontend/app/dashboard/publisher/error.tsx](apps/frontend/app/dashboard/publisher/error.tsx#L1-L21) — Basic error UI with retry button
- **Missing:** Root-level `app/error.tsx`, `app/not-found.tsx`, marketplace route errors

**Inline Error States:**
- [apps/frontend/app/dashboard/sponsor/components/campaign-list.tsx](apps/frontend/app/dashboard/sponsor/components/campaign-list.tsx#L26-L48) — AlertCircle icon, error message, retry button, `role="alert"`, `aria-live="assertive"`
- [apps/frontend/app/dashboard/publisher/components/ad-slot-list.tsx](apps/frontend/app/dashboard/publisher/components/ad-slot-list.tsx#L25-L47) — Same pattern
- [apps/frontend/app/marketplace/components/ad-slot-grid.tsx](apps/frontend/app/marketplace/components/ad-slot-grid.tsx#L166-L173) — Minimal red border alert with retry link

**Server Action Error Handling:**
- [apps/frontend/app/dashboard/sponsor/actions.ts](apps/frontend/app/dashboard/sponsor/actions.ts#L28-L38) — `parseApiError()` extracts `{ error }` from response
- [apps/frontend/app/dashboard/publisher/actions.ts](apps/frontend/app/dashboard/publisher/actions.ts#L24-L34) — Same pattern
- Returns `{ success: false, error: string, fieldErrors?: Record<string, string> }`
- Form field errors shown inline with `aria-describedby` linking to error message IDs

**API Client:**
- [apps/frontend/lib/api.ts](apps/frontend/lib/api.ts#L1-L57) — Extracts `{ error }` from failed responses, throws Error
- Comment notes lack of detailed error parsing (fixme on L2-3)

**Toast Notifications:**
- [apps/frontend/app/dashboard/components/dashboard-toast-region.tsx](apps/frontend/app/dashboard/components/dashboard-toast-region.tsx#L1-L60) — Success/error toasts with CheckCircle2/AlertCircle icons, aria-live, dismiss button
- Used in dashboard client components to show action outcomes

**Modal Errors:**
- [apps/frontend/app/marketplace/[id]/components/booking-modal.tsx](apps/frontend/app/marketplace/[id]/components/booking-modal.tsx#L138-L143) — Inline error alert in modal
- [apps/frontend/app/marketplace/[id]/components/quote-modal.tsx](apps/frontend/app/marketplace/[id]/components/quote-modal.tsx#L504) — `role="alert"` div for errors

### 1.3 Current Loading UI Patterns

**Route-Level Loading:**
- [apps/frontend/app/dashboard/sponsor/loading.tsx](apps/frontend/app/dashboard/sponsor/loading.tsx#L1-L40) — Skeleton screen with stat card skeletons + 3 campaign card skeletons
- [apps/frontend/app/dashboard/publisher/loading.tsx](apps/frontend/app/dashboard/publisher/loading.tsx#L1-L31) — Same pattern for publisher
- **Missing:** `app/marketplace/loading.tsx`, `app/marketplace/[id]/loading.tsx`

**Client Component Loading:**
- [apps/frontend/app/marketplace/components/ad-slot-grid.tsx](apps/frontend/app/marketplace/components/ad-slot-grid.tsx#L73-L89) — `renderSkeletonCards()` function renders 6 skeleton cards
- [apps/frontend/app/marketplace/[id]/components/ad-slot-detail.tsx](apps/frontend/app/marketplace/[id]/components/ad-slot-detail.tsx#L299) — Skeleton content with `aria-busy="true"`, `role="status"`

**Button Loading States:**
- [apps/frontend/app/dashboard/sponsor/components/create-campaign-button.tsx](apps/frontend/app/dashboard/sponsor/components/create-campaign-button.tsx#L10-L21) — "Creating..." / "Create Campaign", disabled state
- [apps/frontend/app/dashboard/sponsor/components/campaign-card.tsx](apps/frontend/app/dashboard/sponsor/components/campaign-card.tsx#L44-L56) — "Saving..." / "Deleting..." states
- Standard pattern: `disabled={pending}` with opacity-60 and cursor-not-allowed

### 1.4 Existing Shared UI Primitives

**Available Components:**
- `DashboardToastRegion` — [apps/frontend/app/dashboard/components/dashboard-toast-region.tsx](apps/frontend/app/dashboard/components/dashboard-toast-region.tsx) — Success/error toasts
- `ConfirmDialog` — [apps/frontend/app/dashboard/components/confirm-dialog.tsx](apps/frontend/app/dashboard/components/confirm-dialog.tsx) — Modal confirmation with focus trap
- `GrainientPageShell` — Layout wrapper
- Inline `SkeletonCard` components (not reusable, defined locally)

**Icons (lucide-react):**
- `AlertCircle` — Errors
- `Inbox` — Empty states
- `CheckCircle2` — Success
- `X` — Close/dismiss
- `RefreshCw`, `RotateCw` — Retry (not currently used)
- `ArrowLeft`, `Home`, `FileQuestion` — Navigation (not currently used)

**Design Tokens (globals.css):**
- `--color-primary` (#6366f1), `--color-primary-hover` (#4f46e5)
- `--color-background`, `--color-foreground`, `--color-muted`, `--color-border`
- `--color-success` (#22c55e), `--color-warning` (#f59e0b), `--color-error` (#ef4444)
- Supports light/dark mode via `html.dark` class

**Missing Shared Components:**
- No `<EmptyState />` component (logic repeated in AdSlotList, CampaignList, AdSlotGrid)
- No `<ErrorState />` component (repeated patterns)
- No `<SkeletonCard />`, `<SkeletonGrid />`, `<SkeletonTable />` shared components
- No `<InlineAlert />` or `<Notice />` component

---

## 2. State System Proposal

### 2.1 Component: `<EmptyState />`

**Purpose:** Consistent empty state UI for lists, grids, and searches.

**Props Interface:**
```typescript
interface EmptyStateProps {
  /** Heading text (e.g., "No campaigns yet") */
  title: string;
  
  /** Supporting explanation */
  description: string;
  
  /** Icon from lucide-react */
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  
  /** Primary action button */
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  
  /** Secondary action (e.g., "Clear filters") */
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  
  /** Semantic variant affects styling */
  variant?: 'default' | 'search' | 'filter';
  
  /** Optional illustration slot for custom graphics */
  illustration?: React.ReactNode;
}
```

**Visual Style:**
```tsx
// Base container
className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-background)] p-10 text-center"

// Icon (if provided)
<Icon className="mx-auto h-9 w-9 text-[var(--color-muted)]" aria-hidden="true" />

// Title
className="mt-3 text-lg font-medium text-[var(--color-foreground)]"

// Description
className="mt-1 text-sm text-[var(--color-muted)]"

// Primary button (if action provided)
className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"

// Secondary button (if secondaryAction provided)
className="mt-2 text-sm text-[var(--color-primary)] underline-offset-4 hover:underline"
```

**Accessibility:**
- Wrap in `<div role="status" aria-live="polite">` when dynamically rendered after loading
- Icon uses `aria-hidden="true"`
- Buttons have clear, action-oriented labels
- Use semantic `<a>` for href, `<button>` for onClick

**Copy Guidelines:**
- **Title:** Concise, user-friendly (no "No data found" jargon) — e.g., "No campaigns yet", "No listings match your filters"
- **Description:** Friendly next step — e.g., "Create your first campaign to start reaching publisher audiences.", "Try broadening your search or clearing active filters."
- **Button labels:** Action-oriented — "Create Campaign", "Clear Filters", "Browse Marketplace"

**Example Usage:**
```tsx
<EmptyState
  icon={Inbox}
  title="No campaigns yet"
  description="Create your first campaign to start reaching publisher audiences."
  action={{ label: "Create Campaign", onClick: handleCreate }}
/>
```

---

### 2.2 Component: `<ErrorState />`

**Purpose:** Consistent error UI for network failures, API errors, and auth issues.

**Props Interface:**
```typescript
interface ErrorStateProps {
  /** Error heading (e.g., "Unable to load campaigns") */
  title: string;
  
  /** User-friendly explanation */
  message: string;
  
  /** Retry callback */
  onRetry?: () => void;
  
  /** Show "Go back" or "Home" navigation */
  showBackButton?: boolean;
  backButtonLabel?: string;
  backButtonHref?: string;
  
  /** Developer details (only shown in dev mode) */
  technicalDetails?: string;
  
  /** Error severity affects styling */
  variant?: 'error' | 'warning' | 'network';
}
```

**Visual Style:**
```tsx
// Container (variant="error")
className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"

// Flex layout for icon + content
<div className="flex items-start gap-3">
  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
  <div>
    <p className="font-semibold">{title}</p>
    <p className="mt-1 text-sm">{message}</p>
    
    {/* Actions */}
    <div className="mt-3 flex flex-wrap gap-2">
      <button className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/50">
        Retry
      </button>
      {/* Go back button if provided */}
    </div>
    
    {/* Technical details (dev only) */}
    {process.env.NODE_ENV === 'development' && technicalDetails && (
      <details className="mt-3 text-xs opacity-75">
        <summary className="cursor-pointer">Technical details</summary>
        <pre className="mt-1 overflow-auto">{technicalDetails}</pre>
      </details>
    )}
  </div>
</div>
```

**Variants:**
- `error` (default): Red background, AlertCircle icon
- `warning`: Yellow/amber background, AlertTriangle icon
- `network`: Blue background, WifiOff icon, suggest offline mode

**Accessibility:**
- `role="alert"` on container
- `aria-live="assertive"` for critical errors
- Focus retry button after rendering (if user was interacting)
- Clear button labels: "Try again", "Go back to dashboard", "Return home"

**Copy Guidelines:**
- **Title:** User-friendly, no status codes — "Unable to load campaigns", "Connection lost", "Something went wrong"
- **Message:** Actionable explanation — "Check your internet connection and try again.", "This resource may have been deleted.", "Our servers are temporarily unavailable. Please try again in a moment."
- Avoid: "Error 500", "Null reference exception", "API request failed"

**Example Usage:**
```tsx
<ErrorState
  title="Unable to load campaigns"
  message="Check your internet connection and try again."
  onRetry={handleRetry}
  showBackButton
  backButtonHref="/dashboard/sponsor"
  technicalDetails={error.stack}
  variant="network"
/>
```

---

### 2.3 Component: `<SkeletonCard />`

**Purpose:** Reusable skeleton screen that matches real card shapes.

**Props Interface:**
```typescript
interface SkeletonCardProps {
  /** Shape variant to match different card types */
  variant?: 'campaign' | 'adSlot' | 'marketplace' | 'stat';
  
  /** Number of cards to render */
  count?: number;
  
  /** Grid layout classes */
  gridClassName?: string;
}
```

**Shapes to Match:**

**Campaign Card Shape:**
```tsx
// Matches CampaignCard structure
<div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-sm">
  <div className="mb-3 h-4 w-1/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Status badge */}
  <div className="mb-2 h-5 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Name */}
  <div className="mb-4 h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Description */}
  <div className="mb-2 h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Budget */}
  <div className="mb-4 h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Dates */}
  <div className="flex gap-2">
    <div className="h-8 flex-1 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Edit */}
    <div className="h-8 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Delete */}
  </div>
</div>
```

**Ad Slot Card Shape:**
```tsx
// Similar structure to above, different proportions
```

**Marketplace Card Shape:**
```tsx
// Matches marketplace grid cards (has publisher info, pricing, metrics)
<div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
  <div className="mb-3 h-1 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Category bar */}
  <div className="mb-3 h-5 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Slot name */}
  <div className="mb-2 h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Publisher */}
  <div className="mb-2 h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Description */}
  <div className="mb-4 h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Metrics */}
  <div className="mb-3 h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Audience */}
  <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Price */}
</div>
```

**Stat Card Shape:**
```tsx
// Matches dashboard stat cards
<div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-sm">
  <div className="mb-2 h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Title */}
  <div className="mb-2 h-8 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Value */}
  <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /> {/* Helper text */}
</div>
```

**Visual Style:**
- Use `animate-pulse` (Tailwind built-in)
- `bg-slate-200` for light mode, `dark:bg-slate-700` for dark mode
- Match border radius, padding, and spacing of real cards
- Use `aria-busy="true"` and `aria-label="Loading..."` on container

**Accessibility:**
- Wrap skeleton grid in `<div role="status" aria-live="polite" aria-busy="true" aria-label="Loading campaigns">`
- Use `aria-hidden="true"` on individual skeleton elements
- Ensure loading state is announced to screen readers

---

### 2.4 Component: `<InlineNotice />`

**Purpose:** Small, non-blocking notices for warnings, info, tips.

**Props Interface:**
```typescript
interface InlineNoticeProps {
  /** Notice type affects color and icon */
  tone: 'info' | 'warning' | 'success' | 'neutral';
  
  /** Notice text */
  children: React.ReactNode;
  
  /** Optional dismiss callback */
  onDismiss?: () => void;
}
```

**Visual Style:**
```tsx
// Info variant
className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200"

// Warning variant
className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"

// With icon
<div className="flex items-start gap-2">
  <Info className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
  <div className="flex-1">{children}</div>
  {onDismiss && <button onClick={onDismiss}><X className="h-4 w-4" /></button>}
</div>
```

**Accessibility:**
- `role="status"` for info/success
- `role="alert"` for warnings
- `aria-live="polite"` or `aria-live="assertive"` depending on tone

---

## 3. Screen-by-Screen Plan

### 3.1 High-Impact Improvement Locations

| # | Route | Component | Empty State | Error State | Loading State | CTAs | Analytics | Priority |
|---|-------|-----------|-------------|-------------|---------------|------|-----------|----------|
| 1 | `/dashboard/sponsor` | `CampaignList` | ✅ Has (improve styling) | ✅ Has (standardize) | ✅ Has loading.tsx (refine) | "Create Campaign" (existing) | None needed | **High** |
| 2 | `/dashboard/publisher` | `AdSlotList` | ✅ Has (improve styling) | ✅ Has (standardize) | ✅ Has loading.tsx (refine) | "Create Ad Slot" (existing) | None needed | **High** |
| 3 | `/marketplace` | `AdSlotGrid` | ✅ Has (two states: no listings + no filters) | ⚠️ Minimal (enhance) | ⚠️ Client-side only (add route loading.tsx) | "Clear Filters" (existing), "List Your Inventory" (add) | Track empty marketplace views | **High** |
| 4 | `/marketplace/[id]` | `AdSlotDetail` | N/A (single item) | ⚠️ Basic (enhance) | ⚠️ Client-side only (add route loading.tsx) | "Back to Marketplace", "Report Issue" (add) | Track error type | **Medium** |
| 5 | `/login` | Login form | N/A | ✅ Has (improve styling) | Has button state | N/A | None | **Medium** |
| 6 | `/` (Landing) | N/A | N/A | ❌ Missing (add error.tsx) | ❌ Missing (add loading.tsx) | N/A | None | **Low** |
| 7 | App-level | Root error boundary | N/A | ❌ Missing (add app/error.tsx) | ❌ Missing (add app/loading.tsx) | "Return Home", "Contact Support" | Track global errors | **High** |
| 8 | App-level | 404 handler | N/A | ❌ Missing (add app/not-found.tsx) | N/A | "Return Home", "Browse Marketplace" | Track 404s | **High** |
| 9 | Modals | `BookingModal` | N/A | ✅ Has (standardize) | Has button state | "Try Again" (existing) | Already tracked | **Low** |
| 10 | Modals | `QuoteModal` | N/A | ✅ Has (standardize) | Has button state | "Try Again" (existing) | Already tracked | **Low** |

---

### 3.2 Detailed Screen Plans

#### Screen 1: Sponsor Dashboard (`/dashboard/sponsor`)

**File:** [apps/frontend/app/dashboard/sponsor/page.tsx](apps/frontend/app/dashboard/sponsor/page.tsx)  
**Component:** [SponsorDashboardClient](apps/frontend/app/dashboard/sponsor/components/sponsor-dashboard-client.tsx)  
**List Component:** [CampaignList](apps/frontend/app/dashboard/sponsor/components/campaign-list.tsx)

**Current Behavior:**
- **Loading:** Shows [loading.tsx](apps/frontend/app/dashboard/sponsor/loading.tsx) skeleton screen with stat card skeletons + 3 campaign card skeletons
- **Empty:** Shows Inbox icon + "No campaigns yet" + description at [campaign-list.tsx#L51-L58](apps/frontend/app/dashboard/sponsor/components/campaign-list.tsx#L51-L58)
- **Error:** Shows AlertCircle + error message + retry button at [campaign-list.tsx#L26-L48](apps/frontend/app/dashboard/sponsor/components/campaign-list.tsx#L26-L48)

**Proposed Improvements:**

**Empty State:**
- Replace inline empty with `<EmptyState />` component
- Props: `icon={Inbox}`, `title="No campaigns yet"`, `description="Create your first campaign to start reaching publisher audiences."`, `action={{ label: "Create Campaign", onClick: scrollToCreateButton }}`
- Analytics: No event needed (already tracked by create button)

**Error State:**
- Replace inline error with `<ErrorState />` component
- Props: `title="Unable to load campaigns"`, `message={error}`, `onRetry={router.refresh}`, `variant="error"`
- Analytics: Track error via `analytics.dashboardError('sponsor', 'campaigns', errorType)`

**Loading State:**
- Refine [loading.tsx](apps/frontend/app/dashboard/sponsor/loading.tsx) skeleton to use `<SkeletonCard variant="campaign" count={3} />` and `<SkeletonCard variant="stat" count={3} />`
- Ensure shapes match real cards more precisely

**CTAs:**
- Keep existing "New Campaign" button
- Empty state CTA scrolls to create button (focus management)

---

#### Screen 2: Publisher Dashboard (`/dashboard/publisher`)

**File:** [apps/frontend/app/dashboard/publisher/page.tsx](apps/frontend/app/dashboard/publisher/page.tsx)  
**Component:** [PublisherDashboardClient](apps/frontend/app/dashboard/publisher/components/publisher-dashboard-client.tsx)  
**List Component:** [AdSlotList](apps/frontend/app/dashboard/publisher/components/ad-slot-list.tsx)

**Current Behavior:**
- **Loading:** Shows [loading.tsx](apps/frontend/app/dashboard/publisher/loading.tsx) skeleton screen
- **Empty:** Shows Inbox icon + "No ad slots yet" at [ad-slot-list.tsx#L47-L56](apps/frontend/app/dashboard/publisher/components/ad-slot-list.tsx#L47-L56)
- **Error:** Shows AlertCircle + error message + retry at [ad-slot-list.tsx#L25-L47](apps/frontend/app/dashboard/publisher/components/ad-slot-list.tsx#L25-L47)

**Proposed Improvements:**

**Empty State:**
- Replace with `<EmptyState icon={Inbox} title="No ad slots yet" description="Create your first slot to start accepting sponsor bookings." action={{ label: "Create Ad Slot", onClick: scrollToCreateButton }} />`

**Error State:**
- Replace with `<ErrorState title="Unable to load ad slots" message={error} onRetry={router.refresh} />`
- Analytics: Track via `analytics.dashboardError('publisher', 'adSlots', errorType)`

**Loading State:**
- Refine skeleton to use `<SkeletonCard variant="adSlot" count={3} />`

**CTAs:**
- Keep existing "Create Ad Slot" button

---

#### Screen 3: Marketplace Listing (`/marketplace`)

**File:** [apps/frontend/app/marketplace/page.tsx](apps/frontend/app/marketplace/page.tsx)  
**Component:** [AdSlotGrid](apps/frontend/app/marketplace/components/ad-slot-grid.tsx)

**Current Behavior:**
- **Loading:** Client-side loading state shows skeleton cards at [ad-slot-grid.tsx#L156-L164](apps/frontend/app/marketplace/components/ad-slot-grid.tsx#L156-L164), no route-level loading.tsx
- **Empty (no listings):** Shows dashed border + "The marketplace is being stocked with fresh listings." at [ad-slot-grid.tsx#L183-L189](apps/frontend/app/marketplace/components/ad-slot-grid.tsx#L183-L189)
- **Empty (filtered):** Shows "No listings match your filters." + clear filters button at [ad-slot-grid.tsx#L190-L201](apps/frontend/app/marketplace/components/ad-slot-grid.tsx#L190-L201)
- **Error:** Minimal red alert at [ad-slot-grid.tsx#L166-L173](apps/frontend/app/marketplace/components/ad-slot-grid.tsx#L166-L173)

**Proposed Improvements:**

**Add Route-Level Loading:**
- Create `app/marketplace/loading.tsx` to show skeleton during server transitions
- Use `<SkeletonCard variant="marketplace" count={6} gridClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />`

**Empty State (no listings):**
- Replace with `<EmptyState icon={Store} title="The marketplace is launching soon" description="We're stocking fresh listings. Check back soon, or contact us to list your ad inventory." action={{ label: "Contact Us", href: "/contact" }} />`
- Analytics: `analytics.marketplaceEmpty('no_listings')`

**Empty State (filtered):**
- Replace with `<EmptyState variant="filter" icon={Filter} title="No listings match your filters" description="Try broadening your search or clearing active filters." action={{ label: "Clear Filters", onClick: handleClearFilters }} />`
- Analytics: `analytics.marketplaceEmpty('filtered', { filterCount: activeFilterCount })`

**Error State:**
- Replace with `<ErrorState variant="network" title="Unable to load marketplace listings" message="Check your internet connection and try again." onRetry={loadAdSlots} />`
- Analytics: `analytics.marketplaceError(error.message)`

**Loading State:**
- Replace `renderSkeletonCards()` inline function with `<SkeletonCard variant="marketplace" count={6} />`

**CTAs:**
- "Clear Filters" (existing, line 201)
- "Contact Us" for empty marketplace
- "Try Again" for errors

---

#### Screen 4: Marketplace Detail (`/marketplace/[id]`)

**File:** [apps/frontend/app/marketplace/[id]/page.tsx](apps/frontend/app/marketplace/[id]/page.tsx)  
**Component:** [AdSlotDetail](apps/frontend/app/marketplace/[id]/components/ad-slot-detail.tsx)

**Current Behavior:**
- **Loading:** Client-side skeleton at [ad-slot-detail.tsx#L299](apps/frontend/app/marketplace/[id]/components/ad-slot-detail.tsx#L299) with `aria-busy="true"`
- **Error:** Shows error message, no retry button (line 308-310)
- **Not found:** No specific handling

**Proposed Improvements:**

**Add Route-Level Loading:**
- Create `app/marketplace/[id]/loading.tsx` with skeleton matching detail page layout

**Error State:**
- Replace inline error at line 308-310 with `<ErrorState title="Slot details unavailable" message={error} onRetry={handleRetry} showBackButton backButtonHref="/marketplace" backButtonLabel="Back to Marketplace" />`
- For 404-like errors (slot not found): Use `<ErrorState title="Listing not found" message="This ad slot may have been removed or is no longer available." showBackButton backButtonHref="/marketplace" />`
- Analytics: `analytics.listingError(id, error.message)`

**Loading State:**
- Refine skeleton to match detail page structure (hero section, sidebar CTA, description, publisher info)

**CTAs:**
- "Back to Marketplace" (navigation)
- "Try Again" (retry fetch)
- "Report Issue" (optional, link to support)

---

#### Screen 5: App-Level Error Boundary

**File:** `app/error.tsx` (does not exist, create it)

**Current Behavior:**
- Missing — unhandled errors show default Next.js error screen

**Proposed Implementation:**

**Create `app/error.tsx`:**
```tsx
'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ErrorState';
import { analytics } from '@/lib/analytics';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    analytics.globalError(error.message, error.digest);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center p-4">
          <ErrorState
            title="Something went wrong"
            message="We're sorry, but an unexpected error occurred. Please try refreshing the page."
            onRetry={reset}
            showBackButton
            backButtonHref="/"
            backButtonLabel="Return Home"
            technicalDetails={error.stack}
          />
        </div>
      </body>
    </html>
  );
}
```

**Analytics:**
- Track via `analytics.globalError(message, digest)` (add this method to analytics.ts)

**CTAs:**
- "Try Again" → calls `reset()`
- "Return Home" → navigates to `/`

---

#### Screen 6: 404 Not Found

**File:** `app/not-found.tsx` (does not exist, create it)

**Current Behavior:**
- Missing — shows default Next.js 404

**Proposed Implementation:**

**Create `app/not-found.tsx`:**
```tsx
import { ErrorState } from '@/components/ErrorState';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ErrorState
        title="Page not found"
        message="The page you're looking for doesn't exist or has been moved."
        showBackButton
        backButtonHref="/"
        backButtonLabel="Return Home"
        variant="warning"
      />
    </div>
  );
}
```

**Analytics:**
- Track via middleware or route change listener: `analytics.notFound(pathname)`

**CTAs:**
- "Return Home" → `/`
- "Browse Marketplace" → `/marketplace` (secondary action)

---

#### Screen 7: Login Page Error

**File:** [apps/frontend/app/login/page.tsx](apps/frontend/app/login/page.tsx)

**Current Behavior:**
- Shows inline error alert at [login/page.tsx#L77-L81](apps/frontend/app/login/page.tsx#L77-L81)

**Proposed Improvements:**
- Replace inline div with `<InlineNotice tone="error">{error}</InlineNotice>`
- Or use standardized error alert styling to match design system
- No retry CTA needed (user will re-submit form)

---

#### Screen 8: Modal Errors (BookingModal, QuoteModal)

**Files:**
- [apps/frontend/app/marketplace/[id]/components/booking-modal.tsx](apps/frontend/app/marketplace/[id]/components/booking-modal.tsx)
- [apps/frontend/app/marketplace/[id]/components/quote-modal.tsx](apps/frontend/app/marketplace/[id]/components/quote-modal.tsx)

**Current Behavior:**
- Show inline error alerts within modal

**Proposed Improvements:**
- Standardize error styling using `<InlineNotice tone="error">{error}</InlineNotice>` or small `<ErrorState />` variant
- Ensure `role="alert"` and `aria-live="assertive"` for accessibility
- No loading.tsx needed (modals are client components with inline loading states)

---

## 4. Error Boundaries + Next.js Conventions

### 4.1 Current State

**Existing:**
- [apps/frontend/app/dashboard/sponsor/error.tsx](apps/frontend/app/dashboard/sponsor/error.tsx)
- [apps/frontend/app/dashboard/publisher/error.tsx](apps/frontend/app/dashboard/publisher/error.tsx)

**Missing:**
- `app/error.tsx` — Global error boundary
- `app/not-found.tsx` — 404 handler
- `app/marketplace/error.tsx` — Marketplace route errors
- `app/marketplace/[id]/error.tsx` — Detail page errors
- `app/marketplace/loading.tsx` — Route-level loading for marketplace
- `app/marketplace/[id]/loading.tsx` — Route-level loading for detail page

### 4.2 Recommendations

**Add Global Error Boundary:**
- Create `app/error.tsx` (see Screen 5 above)
- Catches unhandled errors in the entire app
- Provides retry and "Return Home" options
- Logs error digest for debugging

**Add 404 Handler:**
- Create `app/not-found.tsx` (see Screen 6 above)
- Friendly message, navigation options
- Track 404s in analytics

**Add Marketplace Error Boundaries:**
- Create `app/marketplace/error.tsx` to catch marketplace-specific errors
- Create `app/marketplace/[id]/error.tsx` for detail page errors
- Both should use `<ErrorState />` component with "Back to Marketplace" / "Return Home" options

**Add Missing Loading Files:**
- Create `app/marketplace/loading.tsx` — Shows skeleton grid during server transitions
- Create `app/marketplace/[id]/loading.tsx` — Shows skeleton detail page layout

**Server vs Client Error Handling:**
- **Server errors:** Caught by error.tsx boundaries → show ErrorState with retry
- **Client errors:** Caught by try/catch in components → show inline ErrorState
- **Server action errors:** Return `{ success: false, error }` → show inline errors with field-level granularity
- **Never leak stack traces in production:** Use `process.env.NODE_ENV === 'development'` check for technical details

**Ensure Clean Production Errors:**
- API error messages should be user-friendly (already partially done in parseApiError)
- Enhance `lib/api.ts` to distinguish error types:
  - Network errors (offline, timeout)
  - Auth errors (401, 403)
  - Not found (404)
  - Server errors (500+)
  - Validation errors (400 with field errors)
- Map these to appropriate ErrorState variants and messages

---

## 5. Implementation Sequence

**Phase 1: Foundation (Shared Components)**
1. Create `app/components/EmptyState.tsx` — Shared empty state component
2. Create `app/components/ErrorState.tsx` — Shared error state component
3. Create `app/components/SkeletonCard.tsx` — Shared skeleton component (supports variants)
4. Create `app/components/InlineNotice.tsx` — Shared inline notice component
5. Add new analytics events to `lib/analytics.ts`:
   - `dashboardError(role, section, errorType)`
   - `marketplaceError(message)`
   - `marketplaceEmpty(reason, metadata?)`
   - `listingError(slotId, message)`
   - `globalError(message, digest?)`
   - `notFound(pathname)`

**Phase 2: App-Level Error & Loading States**
6. Create `app/error.tsx` — Global error boundary
7. Create `app/not-found.tsx` — 404 page
8. Create `app/loading.tsx` — Root loading state (optional, low priority)

**Phase 3: Marketplace Route States**
9. Create `app/marketplace/loading.tsx` — Route-level loading for marketplace page
10. Create `app/marketplace/error.tsx` — Marketplace error boundary
11. Create `app/marketplace/[id]/loading.tsx` — Detail page loading
12. Create `app/marketplace/[id]/error.tsx` — Detail page error boundary

**Phase 4: Replace Inline States in Dashboard**
13. Refactor [CampaignList](apps/frontend/app/dashboard/sponsor/components/campaign-list.tsx):
    - Replace empty state (lines 50-59) with `<EmptyState />`
    - Replace error state (lines 26-48) with `<ErrorState />`
14. Refactor [AdSlotList](apps/frontend/app/dashboard/publisher/components/ad-slot-list.tsx):
    - Replace empty state (lines 47-56) with `<EmptyState />`
    - Replace error state (lines 25-47) with `<ErrorState />`
15. Refactor [loading.tsx files](apps/frontend/app/dashboard/sponsor/loading.tsx):
    - Replace inline SkeletonCard with `<SkeletonCard variant="campaign" count={3} />`
    - Replace stat skeletons with `<SkeletonCard variant="stat" count={3} />`
16. Repeat for [publisher loading.tsx](apps/frontend/app/dashboard/publisher/loading.tsx)

**Phase 5: Replace Inline States in Marketplace**
17. Refactor [AdSlotGrid](apps/frontend/app/marketplace/components/ad-slot-grid.tsx):
    - Replace no-listings empty state (lines 183-189) with `<EmptyState />`
    - Replace filtered empty state (lines 190-201) with `<EmptyState variant="filter" />`
    - Replace error state (lines 166-173) with `<ErrorState />`
    - Replace skeleton function (lines 73-89) with `<SkeletonCard variant="marketplace" count={6} />`
18. Refactor [AdSlotDetail](apps/frontend/app/marketplace/[id]/components/ad-slot-detail.tsx):
    - Replace error state (lines 308-310) with `<ErrorState />`
    - Add not-found handling (404-like errors)

**Phase 6: Polish & Details**
19. Enhance [lib/api.ts](apps/frontend/lib/api.ts):
    - Add error type detection (network, auth, validation, server, not-found)
    - Return structured error objects: `{ type: 'network' | 'auth' | ..., message: string, statusCode?: number }`
20. Update [login page](apps/frontend/app/login/page.tsx):
    - Replace inline error div with `<InlineNotice tone="error" />`
21. Update modals ([BookingModal](apps/frontend/app/marketplace/[id]/components/booking-modal.tsx), [QuoteModal](apps/frontend/app/marketplace/[id]/components/quote-modal.tsx)):
    - Standardize error styling with `<InlineNotice tone="error" />`
22. Add error recovery:
    - Implement offline detection (window.navigator.onLine, 'online'/'offline' events)
    - Show `<ErrorState variant="network" />` when offline
    - Auto-retry when connection restored
23. Add skeleton dark mode refinements:
    - Ensure `dark:bg-slate-700` is used consistently
    - Test all skeleton states in dark mode

**Phase 7: Testing & QA**
24. Manual QA for all screens (see QA Checklist below)
25. Accessibility audit:
    - Keyboard navigation (Tab, Enter, Escape)
    - Focus management (retry buttons, modals, empty state CTAs)
    - Screen reader testing (NVDA/VoiceOver)
26. Visual regression testing (optional, if tooling exists):
    - Capture screenshots of all empty/error/loading states
    - Compare light/dark mode

---

## 6. QA Checklist

### 6.1 Manual Testing Steps

**Dashboard (Sponsor & Publisher):**
- [ ] **Empty State:** Create a fresh account with no campaigns/ad slots. Verify EmptyState component renders with correct icon, title, description, and CTA.
- [ ] **Loading State:** Navigate to dashboard, verify loading.tsx skeleton appears during server transition.
- [ ] **Error State (network):** Disconnect internet, refresh page. Verify ErrorState shows "Unable to load" message with retry button.
- [ ] **Error State (server):** Stop backend server, refresh page. Verify ErrorState shows with appropriate message.
- [ ] **Retry Action:** Click "Retry" button in error state. Verify it calls router.refresh() and attempts to reload data.
- [ ] **Keyboard Navigation:** Tab through error state, ensure retry and back buttons are focusable.
- [ ] **Screen Reader:** Use NVDA/VoiceOver to verify `role="alert"` and `aria-live` announcements.

**Marketplace Listing:**
- [ ] **Empty (no listings):** Clear database marketplace listings. Verify "marketplace is launching soon" message with contact CTA.
- [ ] **Empty (filtered):** Apply filters that yield no results. Verify "no listings match your filters" with "Clear Filters" button.
- [ ] **Clear Filters CTA:** Click "Clear Filters", verify filters reset and results reappear.
- [ ] **Loading State:** Navigate to /marketplace, verify loading.tsx skeleton grid appears.
- [ ] **Error State:** Disconnect internet, refresh page. Verify network error with retry.
- [ ] **Skeleton Accuracy:** Compare skeleton card shapes to real marketplace cards. Ensure proportions, spacing, and elements match.

**Marketplace Detail:**
- [ ] **Loading State:** Navigate to /marketplace/[id], verify loading.tsx skeleton for detail layout.
- [ ] **Error State (network):** Disconnect internet, navigate to detail page. Verify network error with "Back to Marketplace" CTA.
- [ ] **Error State (404):** Navigate to /marketplace/invalid-id. Verify "Listing not found" message with back button.
- [ ] **Back to Marketplace CTA:** Click button, verify navigation to /marketplace.

**App-Level Errors:**
- [ ] **Global Error:** Trigger an unhandled error (e.g., throw new Error in a component). Verify app/error.tsx catches it and shows ErrorState with "Return Home".
- [ ] **404 Page:** Navigate to /nonexistent-route. Verify not-found.tsx shows with "Page not found" message.
- [ ] **Error Retry:** On error page, click "Try Again". Verify reset() is called and app attempts recovery.

**Login Page:**
- [ ] **Error State:** Enter invalid credentials. Verify inline error notice appears with correct styling.
- [ ] **Accessibility:** Verify error has `role="alert"` and is announced by screen reader.

**Modals:**
- [ ] **Booking Error:** Trigger API error in booking modal. Verify inline error notice appears.
- [ ] **Quote Error:** Trigger validation error in quote modal. Verify field errors and general error notice.

**Offline Mode:**
- [ ] **Simulate Offline:** Use browser DevTools to go offline. Verify all fetch failures show network error variant.
- [ ] **Reconnect:** Bring connection back online. Verify "Retry" button successfully refetches data.

**Dark Mode:**
- [ ] **Toggle Dark Mode:** Switch to dark mode, verify all skeletons use `dark:bg-slate-700`.
- [ ] **Error/Empty States:** Verify error and empty states use dark-mode-safe colors (dark:border-red-900/50, dark:bg-red-950/30, etc.).

**Analytics:**
- [ ] **Track Errors:** Trigger various errors, verify analytics events fire with correct parameters.
- [ ] **Track Empty States:** View empty dashboards and filtered marketplace, verify analytics events.
- [ ] **Track 404s:** Navigate to invalid routes, verify `analytics.notFound()` fires.

---

### 6.2 Automated Testing (If Infrastructure Exists)

**Component Tests (Vitest + React Testing Library):**
- [ ] `EmptyState.test.tsx`: Test all variants, icon rendering, CTA clicks, accessibility attributes
- [ ] `ErrorState.test.tsx`: Test variants, retry callback, back button, technical details (dev only)
- [ ] `SkeletonCard.test.tsx`: Test all variants, count prop, aria-busy attribute
- [ ] `InlineNotice.test.tsx`: Test all tones, dismiss callback

**Integration Tests (Playwright/Cypress):**
- [ ] Dashboard empty state flow: New user → sees empty state → clicks CTA → scrolls to create button
- [ ] Marketplace filter flow: Apply filters → no results → click "Clear Filters" → see results
- [ ] Error recovery flow: Offline → error shown → reconnect → retry → data loads
- [ ] 404 flow: Navigate to invalid route → see not-found page → click "Return Home" → land on /

**Visual Regression Tests (if using Percy/Chromatic):**
- [ ] Capture all empty states (light + dark mode)
- [ ] Capture all error states (light + dark mode)
- [ ] Capture all loading states (light + dark mode)

---

## 7. Acceptance Criteria

### 7.1 Functional Requirements

- [ ] All data-fetching list UIs (dashboards, marketplace) show consistent loading, empty, and error states
- [ ] Loading states use skeleton screens that closely match real content shapes
- [ ] Empty states provide clear, friendly messaging and actionable CTAs
- [ ] Error states provide user-friendly messages (no jargon/status codes) and retry options
- [ ] All states are accessible (keyboard, screen reader, semantic HTML, ARIA attributes)
- [ ] Error states distinguish between network errors, auth errors, and server errors
- [ ] No stack traces or technical details leak in production
- [ ] App-level error.tsx and not-found.tsx provide global error handling
- [ ] All route segments have appropriate loading.tsx and error.tsx files

### 7.2 Design Consistency

- [ ] All empty/error/loading states use consistent Tailwind classes and CSS variables
- [ ] Icons are from lucide-react and match existing usage patterns
- [ ] Colors match design tokens (--color-error, --color-border, --color-primary, etc.)
- [ ] Dark mode support is consistent across all states
- [ ] Animations respect `prefers-reduced-motion`

### 7.3 User Experience

- [ ] Copy is friendly, human, and actionable (no "Error 500", "Null pointer", etc.)
- [ ] Empty states suggest next steps ("Create your first...", "Clear filters")
- [ ] Error states provide retry actions that work
- [ ] Loading states appear quickly (no flash of empty content)
- [ ] Focus management: Retry buttons receive focus when error renders
- [ ] Navigation flow: "Back" buttons work, "Return Home" routes to `/`

### 7.4 Analytics

- [ ] All error types are tracked with relevant metadata (error message, route, user role)
- [ ] Empty states are tracked (distinguish "no data" vs "filtered to empty")
- [ ] 404s and global errors are tracked

---

## 8. Risks / Regression Prevention

### 8.1 Potential Risks

**Risk 1: Inline State Replacement Breaks Existing Functionality**
- **Mitigation:** Replace states incrementally, test each screen after refactor. Use feature flags if necessary.
- **Regression Test:** After replacing inline empty/error states, verify all CTAs still work (router.refresh, filter clearing, etc.)

**Risk 2: New Shared Components Introduce Accessibility Regressions**
- **Mitigation:** Audit shared components with screen reader before deploying. Ensure role, aria-live, and aria-label attributes are correct.
- **Regression Test:** Run axe-core or similar accessibility linter on all pages with new components.

**Risk 3: Skeleton Cards Don't Match Real Content, Causing Layout Shift**
- **Mitigation:** Meticulously compare skeleton dimensions to real cards. Use same border-radius, padding, and spacing. Test with real data side-by-side.
- **Regression Test:** Measure Cumulative Layout Shift (CLS) before and after. Ensure CLS does not increase.

**Risk 4: Dark Mode Styling Inconsistencies**
- **Mitigation:** Test all new components in dark mode during development. Use consistent dark: prefixes for all colors.
- **Regression Test:** Visual regression testing in dark mode for all state components.

**Risk 5: Over-Reliance on Client-Side Loading States**
- **Mitigation:** Add route-level loading.tsx files for server-side transitions. Use Suspense boundaries where appropriate.
- **Regression Test:** Verify loading skeletons appear during route changes, not just initial page load.

**Risk 6: Error Messages Become Too Generic**
- **Mitigation:** Enhance lib/api.ts to detect error types and return specific messages. Map status codes to user-friendly explanations.
- **Regression Test:** Manually test various error scenarios (offline, 401, 404, 500) and verify messages are helpful.

**Risk 7: Analytics Events Fire Incorrectly**
- **Mitigation:** Add analytics events with clear naming conventions. Test events in dev mode with analytics console logging.
- **Regression Test:** Verify analytics events don't fire multiple times (deduplicate in analytics.ts if needed).

**Risk 8: Focus Management After Error/Empty Rendering**
- **Mitigation:** Use refs to focus retry buttons or CTA buttons after state changes. Test keyboard navigation.
- **Regression Test:** Tab through all interactive elements, ensure focus order is logical and nothing is skipped.

---

### 8.2 Rollback Plan

- **Incremental Implementation:** Each phase can be rolled back independently. Use Git branches for each phase.
- **Feature Flags:** If available, wrap new components in feature flags to enable/disable per user or deployment.
- **Monitoring:** Track error rates and user engagement with new CTAs. If metrics degrade, roll back affected screens.

---

## 9. Additional Notes

### 9.1 Future Enhancements (Out of Scope for Initial Implementation)

- **Inline Skeleton Transitions:** Animate skeleton → real content fade-in for smoother UX
- **Retry with Exponential Backoff:** Automatic retry on network errors with backoff
- **Offline Mode Indicator:** Persistent banner at top of app when offline
- **Error State Illustrations:** Custom SVG illustrations for 404, 500, offline states
- **Advanced Empty State Personalization:** Show different empty states based on user role or onboarding progress
- **Pagination for Large Lists:** Add pagination UI to empty state component (if list supports it)
- **Search Suggestions in Marketplace:** Show popular categories or featured listings when search returns empty
- **Live Status Indicator:** Real-time server status (operational/degraded/down) in error states

### 9.2 Design System Integration

- After implementing shared components (EmptyState, ErrorState, SkeletonCard, InlineNotice), consider:
  - Adding to a Storybook instance for design system documentation
  - Exporting components to a shared `@anvara/ui` package if expanding to multiple frontends
  - Creating variants for different contexts (dashboard vs public marketplace)

### 9.3 Copy Writing Guidelines

**Tone:** Friendly, helpful, never blame the user.
**Avoid:** Technical jargon, HTTP status codes, developer terms (e.g., "API", "endpoint", "null", "undefined").
**Use:** Plain language explanations and actionable next steps.

**Examples:**
- ❌ "Error 500: Internal Server Error"
- ✅ "Something went wrong on our end. Please try again in a moment."

- ❌ "No data found"
- ✅ "No campaigns yet. Create your first campaign to get started."

- ❌ "Request failed"
- ✅ "Unable to load your ad slots. Check your connection and try again."

### 9.4 Accessibility Checklist (Per Component)

- [ ] Semantic HTML (use `<button>`, `<a>`, `<section>`, not `<div onClick>`)
- [ ] ARIA roles (`role="alert"`, `role="status"`)
- [ ] ARIA live regions (`aria-live="polite"` or `"assertive"`)
- [ ] ARIA labels (`aria-label`, `aria-labelledby`, `aria-describedby`)
- [ ] Focus indicators (visible `:focus` and `:focus-visible` styles)
- [ ] Keyboard navigation (Enter, Space, Tab, Escape)
- [ ] Screen reader testing (NVDA, VoiceOver, JAWS)
- [ ] Color contrast (WCAG AA minimum: 4.5:1 for text)
- [ ] Reduced motion support (`prefers-reduced-motion: reduce`)

---

## 10. Summary

This implementation plan provides a comprehensive roadmap to standardize and improve error, empty, and loading states across the Anvara marketplace application. By creating reusable, accessible, and beautifully designed state components, we ensure a consistent and delightful user experience across all journeys — from first-time empty dashboards to network errors and 404 pages.

**Key Outcomes:**
1. **Shared Component Library:** EmptyState, ErrorState, SkeletonCard, InlineNotice
2. **Comprehensive Coverage:** All key screens (dashboards, marketplace, detail pages, app-level routes)
3. **Enhanced UX:** Clear messaging, actionable CTAs, retry options, navigation aids
4. **Accessibility:** Full keyboard support, screen reader compatibility, semantic HTML, ARIA attributes
5. **Analytics:** Track all error types, empty states, and 404s for data-driven improvements
6. **Design Consistency:** Unified styling with Tailwind tokens, lucide-react icons, dark mode support

**Implementation Time Estimate:** 3-5 days for complete implementation + QA (assuming 1 developer)

**Next Steps:**
1. Review this plan with stakeholders and UX team
2. Get approval on component designs and copy examples
3. Begin Phase 1 (Foundation) implementation
4. Iterate through phases with incremental testing and QA

---

**End of Implementation Plan**
