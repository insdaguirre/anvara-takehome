Repo Findings
Key Files Inspected
Dashboard pages & route files:

page.tsx — server component, fetches campaigns, renders header + list
loading.tsx — skeleton (3 gray blocks, no card-shaped detail)
error.tsx — red error box + "Try again" button
actions.ts — server actions: CRUD for campaigns
form-state.ts — CampaignFormState / CampaignFormValues types
Dashboard components:

campaign-list.tsx — grid, empty state (text-only), error state
campaign-card.tsx — display + inline edit form + delete w/ window.confirm
create-campaign-button.tsx — toggles inline form, flash message on success
Shared utilities & styling:

globals.css — CSS vars for colors, dark mode media query
utils.ts — cn(), formatPrice(), formatRelativeTime(), truncate()
format.ts — formatCompactNumber(), formatPrice()
types.ts — Campaign, AdSlot, Placement interfaces
analytics.ts — event tracking, GA4 bridge
Backend:

dashboard.ts — GET /api/dashboard/stats (platform-wide stats: sponsors, publishers, campaigns, placements, impressions/clicks/conversions/CTR)
campaigns.ts — full CRUD + status filter
Existing patterns (no component library):

No toast/notification system
No modal component (delete uses window.confirm)
No shared Button/Card/Input components — all inline Tailwind
Loading: animate-pulse skeletons in loading.tsx only
Empty state: plain text in dashed border box
Success feedback: inline <p className="text-green-600"> that persists until next action
Error feedback: inline red box or <p className="text-red-600">
Form submission: useActionState + useFormStatus for pending states
Implementation Plan
A) UX/Visual Goals
#	Improvement	Maps to Challenge Spec
1	Summary stats row at top of dashboard (total campaigns, total budget, total spent, active count)	Information hierarchy, summary cards
2	Richer card design — subtle shadow, hover elevation, better typography hierarchy, status badge pill refinement	Visual polish, card design
3	Skeleton loading that mirrors actual card shapes (not just gray rectangles)	Loading states
4	Empty state with icon + CTA instead of plain text	Empty states
5	Toast notification system for success/error on create, update, delete	Success/error notifications
6	Confirmation modal replacing window.confirm for delete	Confirmation modals
7	Create campaign as a slide-down modal/dialog instead of inline form toggle	Better form UX, visual polish
8	Inline validation with real-time feedback on blur, plus disabled submit until valid	Better form validation
9	Subtle animations — card hover, modal open/close, skeleton fade-out, toast slide-in	Smooth transitions
10	Status filter tabs above the campaign grid	Filter/sort controls
B) Proposed Dashboard Layout
New layout structure (top to bottom):

┌────────────────────────────────────────────────┐
│  Page Header: "My Campaigns"  +  [+ New Campaign] button (right)  │
├────────────────────────────────────────────────┤
│  Summary Stats Row (4 cards):                                      │
│  [ Total Campaigns ] [ Active ] [ Total Budget ] [ Total Spent ]  │
├────────────────────────────────────────────────┤
│  Filter Bar: [All] [Active] [Draft] [Paused] [Completed]          │
├────────────────────────────────────────────────┤
│  Campaign Card Grid (responsive 1/2/3 cols)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                          │
│  │ Card     │ │ Card     │ │ Card     │                          │
│  └──────────┘ └──────────┘ └──────────┘                          │
├────────────────────────────────────────────────┤
│  (Empty state shown here when no campaigns match filter)           │
└────────────────────────────────────────────────┘
Responsive behavior:
Desktop (lg+): 3-column grid, stats row = 4 columns, filter bar horizontal
Tablet (sm–lg): 2-column grid, stats row = 2x2 grid
Mobile (<sm): 1-column stack, stats row = 2x2 grid, filter bar scrollable horizontal
Before vs After:
Aspect	Before	After
Page header	text-2xl font-bold + inline create button	Same size, but "+" icon before text on button, font-bold tracking-tight
Stats	None	4 summary stat cards above content
Filtering	None	Horizontal status filter pills
Cards	Flat border, no shadow, no hover effect	shadow-sm resting, shadow-md + slight translateY on hover, rounded-xl
Card typography	Status badge raw enum (PENDING_REVIEW)	Human-readable labels ("Pending Review"), refined pill with dot indicator
Budget progress bar	1.5px tall gray bar	4px tall with rounded caps, gradient fill, percentage label
Empty state	Dashed border + "No campaigns yet" text	Icon (clipboard/megaphone), headline, description, prominent CTA button
Delete confirmation	window.confirm() browser dialog	Custom modal with warning icon, title, description, Cancel + Delete buttons
Success feedback	Inline <p> green text that persists	Toast notification that auto-dismisses after 4s
Error feedback	Inline red box inside form	Toast for server errors, inline field errors remain for validation
Create form	Inline toggle below button	<dialog> element modal overlay with backdrop
Loading skeleton	3 uniform gray rectangles	Card-shaped skeletons matching actual card layout (header line, badge, bar, date)
C) Component/Engineering Work Breakdown
C1. Toast Notification System
Priority: P0 | Effort: 2 dev-hours

Objective: Global toast provider that any component can call to show success/error/info messages.

Files to create:

apps/frontend/components/ui/toast.tsx — ToastProvider (context), ToastContainer (renders toasts), Toast (single toast UI)
Files to modify:

apps/frontend/app/layout.tsx — wrap children with <ToastProvider>
Pattern:

Client component. React context with useToast() hook.
State: array of { id, type: 'success'|'error'|'info', message, duration? }.
addToast(opts) adds to array, auto-removes after duration (default 4000ms).
Render fixed bottom-right (desktop) / top-center (mobile) stack.
Each toast: icon (checkmark/X/info), message text, close button.
Entry animation: translate-x-full -> translate-x-0 + opacity-0 -> opacity-100 (CSS transition).
Exit animation: opacity-0 + translate-x-full with transition-all duration-300.
Accessibility: role="status", aria-live="polite".
Acceptance criteria:

useToast().addToast({ type: 'success', message: 'Campaign created' }) works from any client component.
Toasts stack, auto-dismiss, can be manually dismissed.
No new dependencies.
C2. Confirmation Modal
Priority: P0 | Effort: 1.5 dev-hours

Objective: Reusable <ConfirmDialog> component using the native <dialog> element.

Files to create:

apps/frontend/components/ui/confirm-dialog.tsx
Files to modify:

apps/frontend/app/dashboard/sponsor/components/campaign-card.tsx — replace window.confirm with <ConfirmDialog>
Pattern:

Props: open, onConfirm, onCancel, title, description, confirmLabel (default "Delete"), confirmVariant ("danger" | "primary"), isLoading.
Uses native <dialog> with showModal()/close() via useEffect synced to open prop.
Focus trap: native <dialog> provides this automatically.
ESC to close: native <dialog> provides this. Also call onCancel on cancel event.
Backdrop: dialog::backdrop styled with bg-black/50.
Layout: warning icon (inline SVG), title, description paragraph, button row (Cancel secondary, Confirm danger).
aria-labelledby on dialog pointing to title.
Acceptance criteria:

Delete button opens modal instead of window.confirm.
ESC and Cancel close without action. Confirm triggers delete action.
Focus returns to trigger button on close.
Loading state on confirm button while action is pending.
C3. Summary Stats Row
Priority: P0 | Effort: 2 dev-hours

Objective: Compute and display 4 key metrics above the campaign grid.

Files to create:

apps/frontend/app/dashboard/sponsor/components/stats-row.tsx
Files to modify:

apps/frontend/app/dashboard/sponsor/page.tsx — render <StatsRow> between header and campaign list, pass campaigns data
Pattern:

Server component (no interactivity needed). Receives campaigns: Campaign[] as prop.
Computes from campaign data (no extra API call needed):
Total Campaigns: campaigns.length
Active: campaigns.filter(c => c.status === 'ACTIVE').length
Total Budget: sum of campaign.budget, formatted with formatPrice()
Total Spent: sum of campaign.spent, formatted with formatPrice()
Layout: grid grid-cols-2 gap-4 lg:grid-cols-4
Each stat card: rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-sm
Label: text-sm text-[var(--color-muted)]
Value: text-2xl font-bold tracking-tight
Optional: small colored dot or icon left of label
Acceptance criteria:

4 stat cards render correctly with real data.
Values update after create/update/delete (server revalidation handles this).
Responsive: 2x2 on mobile, 4-across on desktop.
C4. Campaign Card Visual Upgrade
Priority: P0 | Effort: 2.5 dev-hours

Objective: Improve card aesthetics, typography, and interactive states.

Files to modify:

apps/frontend/app/dashboard/sponsor/components/campaign-card.tsx
Changes:

Card container: Change from rounded-lg border border-[var(--color-border)] p-4 to rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-5 shadow-sm transition-shadow duration-200 hover:shadow-md.
Status badge: Add a statusLabels map to show human-readable text ("Pending Review" instead of "PENDING_REVIEW"). Add small colored dot before label: <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />.
Budget progress bar: Increase height from h-1.5 to h-2. Add percentage text right-aligned. Use bg-[var(--color-primary)] with transition-all duration-500 so it animates on first paint.
Date range: Use formatRelativeTime or a more readable format. Add a subtle calendar icon (inline SVG, 14px).
Card title: Add text-base (bump from default) and tracking-tight.
Action buttons section: Reduce top border visual weight. Use border-[var(--color-border)]/50 for subtlety. Add mt-auto for consistent button positioning across cards of varying height (requires card to be flex flex-col).
Success/error feedback: Remove inline <p> feedback messages. Instead, call useToast() on success/error from the useActionState callbacks.
Acceptance criteria:

Cards have visible shadow, subtle hover effect.
Status shows human-readable label with color dot.
Budget bar is thicker with percentage label.
No more inline success text; toasts fire instead.
C5. Create Campaign Modal
Priority: P1 | Effort: 2 dev-hours

Objective: Convert inline create form into a proper <dialog> modal.

Files to create:

apps/frontend/app/dashboard/sponsor/components/create-campaign-modal.tsx
Files to modify:

apps/frontend/app/dashboard/sponsor/components/create-campaign-button.tsx — simplify to just the trigger button, render <CreateCampaignModal> conditionally
apps/frontend/app/dashboard/sponsor/page.tsx — no change needed (button already in header)
Pattern:

Use native <dialog> element (same pattern as ConfirmDialog).
Modal content: title "Create Campaign", form fields (same as current), Cancel + Submit buttons in footer.
On success: close modal, fire success toast via useToast().
On error: show inline error in modal (don't close).
Field validation: same server-action validation, but add required attribute to name/budget/dates for instant browser validation.
Backdrop click closes (with onClick on backdrop, not on dialog content).
Acceptance criteria:

"Create Campaign" button opens a centered modal overlay.
Form submits, modal closes on success, toast appears.
Validation errors display inline within the modal.
ESC closes the modal.
C6. Empty State Enhancement
Priority: P1 | Effort: 1 dev-hour

Objective: Replace plain text empty state with a visually engaging component.

Files to modify:

apps/frontend/app/dashboard/sponsor/components/campaign-list.tsx
Changes:

Replace the dashed-border <div> with a structured empty state:
Inline SVG icon (megaphone or document-plus, ~48px, text-[var(--color-muted)])
Headline: text-lg font-semibold — "No campaigns yet"
Description: text-sm text-[var(--color-muted)] — "Create your first campaign to start reaching publishers and growing your brand."
CTA button: same style as "Create Campaign" button, fires the create modal open
Pass an onCreateClick callback prop from parent or use a shared ref/context.
Acceptance criteria:

Empty state shows icon + headline + description + CTA.
CTA opens the create campaign modal.
Centered with generous padding (py-16).
C7. Skeleton Loading Upgrade
Priority: P1 | Effort: 1 dev-hour

Objective: Make skeletons mirror actual card layout for reduced layout shift.

Files to modify:

apps/frontend/app/dashboard/sponsor/loading.tsx
Changes:

Add a skeleton stats row (4 cards: h-20 rounded-xl animate-pulse bg-gray-200)
Replace flat card skeletons with structured card skeletons:

rounded-xl border border-[var(--color-border)] p-5 space-y-3
  ├─ header row: h-5 w-3/4 rounded bg-gray-200 + h-5 w-16 rounded-full bg-gray-200 (badge)
  ├─ description: h-4 w-full + h-4 w-2/3 (two lines)
  ├─ budget bar: h-2 w-full rounded-full bg-gray-200
  └─ date: h-3 w-1/3 rounded bg-gray-200
Use animate-pulse with staggered animation-delay via inline style for visual variety.
Acceptance criteria:

Loading state looks like a "wireframe" of the real dashboard.
No layout shift when real content loads.
Stats row skeleton matches stats row dimensions.
C8. Status Filter Tabs
Priority: P1 | Effort: 1.5 dev-hours

Objective: Let users filter campaigns by status.

Files to create:

apps/frontend/app/dashboard/sponsor/components/status-filter.tsx
Files to modify:

apps/frontend/app/dashboard/sponsor/components/campaign-list.tsx — accept filter prop or manage internally
apps/frontend/app/dashboard/sponsor/page.tsx — render filter above list (or make campaign-list a client component wrapper)
Pattern:

Client component. Local state: activeFilter: string | null (null = "All").
Render horizontal row of pill buttons: "All", "Active", "Draft", "Paused", "Pending", "Completed", "Cancelled".
Only show pills for statuses that exist in the campaign data (plus "All").
Each pill: rounded-full px-3 py-1 text-sm + active state bg-[var(--color-primary)] text-white vs inactive bg-gray-100 text-[var(--color-muted)] hover:bg-gray-200.
Filter is client-side only (no API call). Wrap CampaignList in a client boundary that manages the filter state and passes filtered campaigns down.
On mobile: overflow-x-auto flex gap-2 pb-2 with -webkit-overflow-scrolling: touch.
Acceptance criteria:

Filter pills render. Clicking one filters the grid instantly.
"All" shows everything. Active pill is visually distinct.
Count badge on each pill (e.g., "Active (3)").
Empty filter state: "No [status] campaigns" message with link to clear filter.
C9. Form Validation Enhancements
Priority: P2 | Effort: 1.5 dev-hours

Objective: Add client-side validation on blur + better visual feedback.

Files to modify:

apps/frontend/app/dashboard/sponsor/components/create-campaign-modal.tsx (new modal)
apps/frontend/app/dashboard/sponsor/components/campaign-card.tsx (edit form)
Changes:

Add onBlur handlers for:
Name: required, min length 2 → "Campaign name must be at least 2 characters"
Budget: required, > 0 → "Budget must be greater than 0"
Start date: required → "Start date is required"
End date: required, after start date → "End date must be after start date"
Visual: invalid field gets border-red-400 ring-1 ring-red-400 + error text below.
Valid field (after previous error) gets border-green-400 briefly (1s) then reverts.
Submit button: disabled + opacity-50 cursor-not-allowed when any client error exists OR when pending.
Keep server-side validation as the authoritative source. Client-side is UX enhancement only.
Acceptance criteria:

Blur out of empty "Name" field shows error immediately.
Entering valid value clears the error.
Submit button is disabled while client-side errors exist.
Server-side errors still render correctly if client-side was bypassed.
C10. Subtle Animations
Priority: P2 | Effort: 1 dev-hour

Objective: Add 5 tasteful transitions using only CSS/Tailwind.

Files to modify:

apps/frontend/app/globals.css — add keyframes
Various component files (as listed below)
Animations:

Card hover lift (campaign-card.tsx): transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 — already covered in C4.

Modal open/close (confirm-dialog.tsx, create-campaign-modal.tsx):

Add CSS keyframes in globals.css: @keyframes dialog-open { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
Apply: dialog[open] { animation: dialog-open 200ms ease-out; }
Backdrop: dialog::backdrop { animation: fade-in 150ms ease-out; }
Skeleton fade-out (loading.tsx → real content): This happens naturally with Next.js Suspense boundaries. No extra work needed.

Toast slide-in (toast.tsx): Handled in C1 — translate-x-full -> translate-x-0 transition.

Filter pill press (status-filter.tsx): transition-colors duration-150 active:scale-95 on pills.

Acceptance criteria:

All transitions are <=300ms.
No janky layout shifts.
prefers-reduced-motion: reduce disables animations (add motion-safe: prefix to Tailwind classes or a media query in globals.css).
D) UI States Matrix
Campaign List Section
State	What the user sees
Loading	Stats row: 4 skeleton cards (rounded-xl, pulse). Grid: 3 card-shaped skeletons with header/badge/bar/date placeholder lines.
Empty (no campaigns)	Stats row: all zeros. No filter bar. Empty state: megaphone icon + "No campaigns yet" + "Create your first campaign to start reaching publishers" + [Create Campaign] CTA button.
Empty (filter applied, no matches)	Stats row: real data. Filter bar: active pill highlighted. Message: "No {status} campaigns" + "Clear filter" link.
Error (fetch failed)	Error boundary: red box with "Failed to load sponsor dashboard" + "The backend service may be unavailable" + [Try again] button. Stats row not shown.
Success (has data)	Stats row with computed values. Filter bar. Campaign cards in grid.
Partial data (some fields null)	Cards handle missing description (hidden), zero budget (progress bar at 0%), missing dates gracefully.
Campaign Card
State	What the user sees
View mode	Card with name, status badge, description (2-line clamp), budget bar + %, date range, Edit + Delete buttons.
Edit mode	Card expands: form fields replace display content. Save + Cancel buttons.
Saving	Save button: "Saving..." + disabled + opacity-60. All fields disabled.
Save success	Edit mode closes. Toast: "Campaign updated successfully" (success).
Save error (server)	Inline red error box at top of form. Fields remain editable. Toast: "Failed to update campaign" (error).
Save error (validation)	Individual field errors below inputs. Red border on invalid fields. Submit disabled.
Deleting	Confirm modal open. Confirm button: "Deleting..." + disabled.
Delete success	Card removed from grid (revalidation). Toast: "Campaign deleted" (success).
Delete error	Modal closes. Toast: "Failed to delete campaign" (error).
Create Campaign Modal
State	What the user sees
Open (fresh)	Modal with empty form. Submit disabled until required fields filled.
Validation error (client)	Red border + error text on invalid fields on blur. Submit remains disabled.
Submitting	Submit button: "Creating..." + disabled. Fields disabled.
Success	Modal closes. Toast: "Campaign created successfully" (success). New card appears in grid.
Server error	Inline error at top of modal form. Fields re-enabled. Modal stays open.
E) Toast + Modal Strategy
Toast System
Implementation: New ToastProvider context in apps/frontend/components/ui/toast.tsx.

Type	Icon	Background	Border	Auto-dismiss	When fired
success	Checkmark circle (inline SVG)	bg-green-50	border-green-200	4s	Campaign created/updated/deleted
error	X circle (inline SVG)	bg-red-50	border-red-200	6s	Server action failure
info	Info circle (inline SVG)	bg-blue-50	border-blue-200	4s	(future use)
API:


const { addToast } = useToast();
addToast({ type: 'success', message: 'Campaign created successfully' });
Positioning: Fixed bottom-right (bottom-4 right-4), stacks upward. On mobile: fixed top-center (top-4 inset-x-4).

Accessibility: role="status", aria-live="polite", close button with aria-label="Dismiss".

Confirmation Modal
Implementation: Reusable <ConfirmDialog> in apps/frontend/components/ui/confirm-dialog.tsx.

Delete Campaign modal copy:

Title: "Delete Campaign"
Description: "Are you sure you want to delete "{campaign.name}"? This action cannot be undone."
Cancel button: "Cancel" (secondary style)
Confirm button: "Delete" (red/danger style: bg-red-600 text-white hover:bg-red-700)
Loading state: "Deleting..." on confirm button
Accessibility:

Native <dialog> element → automatic focus trap, ESC to close
aria-labelledby pointing to title element
aria-describedby pointing to description element
Focus returns to trigger element on close (use ref on delete button, restore in onCancel/onConfirm callbacks)
F) Validation & Form Feedback
Forms on Dashboard
Create Campaign Modal — fields: name, description, budget, startDate, endDate
Edit Campaign (inline in card) — fields: name, description, budget, startDate, endDate, status
Validation Rules
Field	Rule	Client error message	Server error message
name	Required, min 2 chars	"Campaign name is required" / "Name must be at least 2 characters"	"Name is required"
description	Optional, max 500 chars	"Description must be under 500 characters"	(none)
budget	Required, number > 0	"Budget is required" / "Budget must be greater than 0"	"Budget must be greater than 0"
startDate	Required, valid date	"Start date is required"	"Start date is required"
endDate	Required, valid date, >= startDate	"End date is required" / "End date must be after start date"	"End date must be after start date"
status	Must be valid enum value	(select field, no invalid option possible)	"Select a valid campaign status"
Behavior
On blur: Validate individual field, show error if invalid.
On change (after error shown): Re-validate, clear error when fixed.
Submit button: Disabled (opacity-50 cursor-not-allowed) when: (a) any client-side errors exist, or (b) form is pending/submitting.
Server errors: Displayed as inline banner at top of form AND as error toast.
Field error styling: border-red-400 ring-1 ring-red-400 on the input + <p className="mt-1 text-xs text-red-600"> below.
G) Animations (Subtle)
#	Animation	Where	Implementation	Duration
1	Card hover lift	campaign-card.tsx	motion-safe:transition-all motion-safe:duration-200 hover:shadow-md hover:-translate-y-0.5	200ms
2	Modal open	confirm-dialog.tsx, create-campaign-modal.tsx	CSS keyframe in globals.css: @keyframes dialog-open (opacity + scale + translateY)	200ms
3	Modal backdrop fade	Same files	dialog::backdrop animation: @keyframes fade-in (opacity 0→1)	150ms
4	Toast slide-in	toast.tsx	motion-safe:transition-all motion-safe:duration-300 + transform from translate-x-full to translate-x-0	300ms
5	Filter pill active press	status-filter.tsx	motion-safe:transition-colors motion-safe:duration-150 active:scale-[0.97]	150ms
Reduced motion: All animations gated behind motion-safe: Tailwind prefix (or @media (prefers-reduced-motion: no-preference) in globals.css for the keyframes). Add to globals.css:


@media (prefers-reduced-motion: reduce) {
  dialog[open] { animation: none; }
  dialog::backdrop { animation: none; }
}
H) Effort + Priority
Task	ID	Priority	Effort (dev-hours)	Dependencies
Toast notification system	C1	P0	2.0	None
Confirmation modal	C2	P0	1.5	None
Summary stats row	C3	P0	2.0	None
Campaign card visual upgrade	C4	P0	2.5	C1 (uses toast)
Create campaign modal	C5	P1	2.0	C1 (uses toast)
Empty state enhancement	C6	P1	1.0	C5 (CTA opens modal)
Skeleton loading upgrade	C7	P1	1.0	C3 (matches stats row shape)
Status filter tabs	C8	P1	1.5	None
Form validation enhancements	C9	P2	1.5	C5 (create modal)
Subtle animations	C10	P2	1.0	C1, C2, C4, C5 (applies to all)
Total estimated effort: ~16.5 dev-hours

Recommended execution order:

C1 (Toast) + C2 (ConfirmDialog) + C3 (StatsRow) — in parallel, no deps
C4 (Card upgrade) — depends on C1
C5 (Create modal) — depends on C1
C6 (Empty state) + C7 (Skeleton) + C8 (Filter) — in parallel
C9 (Validation) + C10 (Animations) — finishing touches
I) Final QA Checklist
Loading States
 Navigate to /dashboard/sponsor — skeleton loading state appears with stat row skeletons + card-shaped skeletons
 Skeleton layout matches actual content layout (no layout shift on load)
 Skeleton uses animate-pulse and respects prefers-reduced-motion
Empty States
 With zero campaigns: empty state shows icon + headline + description + "Create Campaign" CTA
 CTA in empty state opens the create campaign modal
 Stats row shows all zeros (not hidden)
 With filter active but no matches: shows "No {status} campaigns" + "Clear filter" link
Summary Stats
 4 stat cards show correct computed values (total, active count, total budget, total spent)
 Values use proper currency formatting ($X,XXX)
 Stats update after creating/editing/deleting a campaign (page revalidation)
Status Filters
 All status pills render. Only statuses present in data appear (plus "All")
 Clicking a pill filters the grid instantly (client-side)
 Active pill is visually distinct (bg-primary text-white)
 Count badges are accurate
 On mobile: pills scroll horizontally
CRUD Operations
 Create: Click "Create Campaign" → modal opens → fill form → submit → modal closes → success toast → new card appears in grid
 Create (validation error): Submit with empty name → inline field error → submit button disabled
 Create (server error): Backend down → inline error banner in modal → error toast → modal stays open
 Edit: Click "Edit" on card → form appears → modify fields → Save → form closes → success toast → card updates
 Edit (validation error): Clear name → blur → inline error → Save button disabled
 Delete: Click "Delete" → confirmation modal opens → click "Delete" → modal closes → success toast → card removed
 Delete (cancel): Click "Delete" → confirmation modal → click "Cancel" or ESC → modal closes → no action taken
Toast Notifications
 Success toast fires on: create, update, delete
 Error toast fires on: create failure, update failure, delete failure
 Toasts auto-dismiss after 4s (success) / 6s (error)
 Close button dismisses immediately
 Multiple toasts stack without overlapping
 Toasts have correct icons and colors per type
Confirmation Modal
 Delete triggers custom modal (not window.confirm)
 Modal shows campaign name in description text
 ESC closes the modal
 Focus is trapped inside the modal
 Focus returns to the delete button after close
 "Deleting..." loading state appears on confirm button during action
Form Validation
 Blur out of required fields triggers inline error
 Entering valid data clears the error
 End date before start date shows error on blur
 Submit button disabled while client errors exist
 Server errors still display correctly
Visual / Card Design
 Cards have shadow-sm, round corners (rounded-xl), hover shadow lift
 Status badges show human-readable text with colored dot
 Budget progress bar is thicker with percentage label
 Date format is readable
 No inline green "Campaign updated" text — replaced by toast
Animations
 Card hover: subtle shadow increase + slight lift
 Modal open: fade-in + scale-up animation
 Toast slide-in from right (desktop) / top (mobile)
 Filter pill: color transition on click
 Set prefers-reduced-motion: reduce in OS → all animations disabled
Responsive
 Mobile (<640px): Single column grid, 2x2 stats, scrollable filter pills, toast at top-center
 Tablet (640–1024px): 2-column grid, 2x2 stats
 Desktop (1024px+): 3-column grid, 4-across stats, toast at bottom-right
Accessibility
 All modals use <dialog> with proper aria-labelledby / aria-describedby
 Toast container has role="status" and aria-live="polite"
 All form inputs have associated <label> elements
 Error messages are linked to inputs via aria-describedby
 Color contrast meets WCAG AA for all text on all backgrounds
 Keyboard navigation: Tab through all interactive elements, Enter/Space activate buttons
