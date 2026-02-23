# HYDRATION_FIX_PLAN.md
## Next.js Hydration Mismatch — Root Cause Analysis & Fix Plan

---

## A. Symptoms & Evidence

**Error:** `Recoverable Error: Hydration failed because the server rendered HTML didn't match the client`

**Stack trace origin:** `app/components/nav-client.tsx` → `Nav` → `RootLayout`

**Node mismatches reported:**

| Location | Server renders | Client renders |
|---|---|---|
| `GlassSurface` root `<div>` className | `glass-surface glass-surface--fallback …` | `glass-surface glass-surface--svg …` |
| Nav login area (`~line 140`) | `<span class="text-[var(--color-muted)]">...</span>` | `<a href="/login" …>Login</a>` |

The two mismatches are **causally linked**: `GlassSurface` is the structural root cause, but the nav's `!mounted` branch is also independently broken by a separate recent change.

---

## B. Root Cause Analysis

### Root Cause 1 — `GlassSurface.jsx`: `useState` lazy initializer runs synchronously on the client during React's first render pass

**File:** `apps/frontend/app/components/GlassSurface.jsx`
**Lines:** 40–56

```jsx
const [svgSupported] = useState(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  // ... reads navigator.userAgent, creates DOM element, checks CSS support
  const div = document.createElement('div');
  div.style.backdropFilter = `url(#${filterId})`;
  return div.style.backdropFilter !== '';
});
```

**Why this breaks hydration:**

`useState` lazy initializers execute **during the synchronous React render**, not inside a `useEffect`. This means:

- **On the server (SSR):** `typeof window === 'undefined'` is `true` → initializer returns `false` → `svgSupported = false`.
- **On the client (first render / hydration pass):** `typeof window` is `'object'` → the initializer runs its full browser-detection logic. On a modern Chrome desktop, `div.style.backdropFilter` is set successfully → initializer returns `true` → `svgSupported = true`.

React's hydration requires the **client's first synchronous render output to exactly match the server's HTML**. Because `svgSupported` differs between server and client on the first render, the class on line 147:

```jsx
className={`glass-surface ${svgSupported ? 'glass-surface--svg' : 'glass-surface--fallback'} ${className}`}
```

produces `glass-surface--fallback` on the server and `glass-surface--svg` on the client — a direct hydration mismatch.

**Connection to recent change:** The original code used `useState(false)` + `useEffect(() => setSvgSupported(supportsSVGFilters()), [])`. That was safe: the lazy initializer always returned `false` (matching SSR), and the state was upgraded to `true` only inside a `useEffect` (which runs post-hydration). The refactor moved the browser detection into the `useState` lazy initializer to satisfy `react-hooks/set-state-in-effect`, which eliminated the post-hydration defer and broke SSR/client parity.

---

### Root Cause 2 — `nav-client.tsx`: `useState` lazy initializer for `mounted` is always `true` on the client's first render

**File:** `apps/frontend/app/components/nav-client.tsx`
**Line:** 30

```tsx
const [mounted] = useState(() => typeof window !== 'undefined');
```

**Why this breaks hydration:**

- **On the server (SSR):** `typeof window` is `'undefined'` → `mounted = false`.
- **On the client (first render / hydration pass):** `typeof window` is `'object'` → `mounted = true`.

The branch at lines 125–146:

```tsx
{!mounted ? (
  <span className="text-[var(--color-muted)]">...</span>
) : user ? (
  <div>…Logout button…</div>
) : (
  <Link href="/login" …>Login</Link>
)}
```

- **Server** renders: `<span>...</span>` (because `mounted = false` server-side).
- **Client first render** (hydration pass): `mounted = true`, `user = null` (unauthenticated) → renders `<Link href="/login">Login</Link>` → which React renders as `<a href="/login">…</a>`.

The tag structure is different (`<span>` vs `<a>`), causing the hydration mismatch at the nav's login area.

**Connection to recent change:** The original code used `useState(false)` + `useEffect(() => setMounted(true), [])`. On the client's **first** render (hydration pass), `mounted` was still `false` — matching the server — and only upgraded to `true` after `useEffect` ran post-hydration. The refactor to a lazy initializer evaluates immediately during the first client render, making `mounted` diverge from the server output.

---

### Root Cause 3 — `LightPillar.jsx`: Same lazy initializer pattern (secondary risk)

**File:** `apps/frontend/app/components/landing/LightPillar.jsx`
**Lines:** 30–35

```jsx
const [webGLSupported, setWebGLSupported] = useState(() => {
  if (typeof document === 'undefined') return true; // SSR: defer to client
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  return Boolean(gl);
});
```

**Why this is risky:**

- **On SSR:** `typeof document === 'undefined'` → returns `true`.
- **On client first render:** runs WebGL detection. If WebGL is available → returns `true`. If not → returns `false`.

On a WebGL-capable browser, server (`true`) and client (`true`) agree — no mismatch. However, on any client without WebGL (certain VMs, old Safari, some mobile browsers), the client returns `false` while server returns `true`, causing a hydration mismatch in whatever JSX branches on `webGLSupported`. This is a **conditional / environment-dependent** hydration risk. The landing page may not trigger this currently, but it is structurally incorrect.

---

## C. Fix Strategy

### Option 1 (Preferred): Restore deterministic SSR-first render for both components

**Principle:** The first synchronous render on the client must match the server. Client-only capability detection must be deferred to `useEffect` (post-hydration). This is the canonical Next.js/React pattern.

---

#### Fix 1a — `GlassSurface.jsx`

**Approach:** Revert `svgSupported` to `useState(false)` and move the detection back into a `useEffect`.

**Exact change — `apps/frontend/app/components/GlassSurface.jsx`:**

Replace lines 38–56:
```jsx
// Detect SVG filter support once at mount via a lazy initializer so no
// setState-in-effect is needed. Returns false on the server (no window).
const [svgSupported] = useState(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  // ... browser detection ...
});
```

With:
```jsx
const [svgSupported, setSvgSupported] = useState(false);

useEffect(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const isFirefox = /Firefox/.test(navigator.userAgent);

  if (isWebkit || isFirefox) return; // stays false

  const div = document.createElement('div');
  div.style.backdropFilter = `url(#${filterId})`;
  if (div.style.backdropFilter !== '') {
    setSvgSupported(true);
  }
}, []); // empty deps: runs once after mount, post-hydration
```

**What the SSR baseline renders:** `glass-surface glass-surface--fallback` (always). After mount, `useEffect` fires, sets `svgSupported = true` on capable browsers, and React updates the class to `glass-surface--svg`. This is a client-side DOM mutation that happens after hydration, so React does not complain.

**Note on `react-hooks/set-state-in-effect`:** This pattern will re-trigger the lint error that prompted the original change. The correct resolution is to either:
- Add a targeted `// eslint-disable-next-line react-hooks/set-state-in-effect` on the specific `setSvgSupported(true)` line with an explanatory comment, OR
- Suppress the rule for this file at the rule level (scoped `/* eslint-disable react-hooks/set-state-in-effect */` at the top, with a comment explaining this is a deliberate post-hydration capability upgrade).

This is a legitimate exception: the setState is called in response to a browser capability check, not as a cascading data update, and no simpler SSR-safe alternative exists.

**`filterId` in dependency array:** `filterId` is derived from `useId()` which is stable per component instance. Add it to the `useEffect` deps array (`[filterId]`) to satisfy `exhaustive-deps`.

---

#### Fix 1b — `nav-client.tsx`

**Approach:** Revert `mounted` to `useState(false)` and restore the `useEffect(() => setMounted(true), [])` pattern.

**Exact change — `apps/frontend/app/components/nav-client.tsx`:**

Replace line 30:
```tsx
const [mounted] = useState(() => typeof window !== 'undefined');
```

With:
```tsx
const [mounted, setMounted] = useState(false);
```

And restore the removed effect (insert after `useBodyScrollLock`):
```tsx
useEffect(() => {
  setMounted(true);
}, []);
```

This re-introduces the `react-hooks/set-state-in-effect` lint error. Suppress it with:
```tsx
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setMounted(true);
}, []);
```

**Why this suppression is acceptable here:** This is a one-time, mount-only initialization. `mounted` is purely a client-side hydration guard that controls which tag structure renders. The effect runs once with no dependencies and causes no cascading updates. There is no SSR-safe alternative that avoids this pattern without restructuring the entire nav's conditional rendering.

**What the SSR baseline renders:** `<span class="text-[var(--color-muted)]">...</span>` (always, matching server). After mount, `mounted = true`, React re-renders, and the correct auth-aware content (`<Link>Login</Link>` or the user block) appears. A brief `...` placeholder is visible on first paint — this is the intended UX design (the original code also did this).

---

#### Fix 1c — `LightPillar.jsx` (preventive)

**Approach:** Revert `webGLSupported` to `useState(true)` (SSR-safe default: assume capable, let the effect correct it) and move the detection to `useEffect`.

**Exact change — `apps/frontend/app/components/landing/LightPillar.jsx`:**

Replace lines 29–35:
```jsx
const [webGLSupported, setWebGLSupported] = useState(() => {
  if (typeof document === 'undefined') return true;
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  return Boolean(gl);
});
```

With:
```jsx
const [webGLSupported, setWebGLSupported] = useState(true); // SSR default: assume capable
useEffect(() => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebGLSupported(false);
  }
}, []);
```

**Why `true` as SSR default:** The server assumes WebGL is supported. On non-WebGL clients, the effect runs post-hydration and sets `false`, causing the component to fall back to its CSS fallback — a brief flicker that is visually acceptable for a decorative canvas element.

**Why not `false` as SSR default:** If SSR returns `false` and the client first-renders `true` (capable browser), you get the same hydration mismatch as `GlassSurface`. Starting from `true` on both sides is safe as long as the fallback triggers post-hydration on incapable clients.

---

### Option 2 (Fallback): `dynamic(() => import(...), { ssr: false })` for `GlassSurface`

If the lint rule `react-hooks/set-state-in-effect` cannot be suppressed and Option 1 is rejected, use Next.js dynamic import with SSR disabled:

**File to change:** `apps/frontend/app/components/nav-client.tsx`

Replace:
```tsx
import GlassSurface from './GlassSurface';
```

With:
```tsx
import dynamic from 'next/dynamic';
const GlassSurface = dynamic(() => import('./GlassSurface'), { ssr: false });
```

**Drawback:** `GlassSurface` is used in the nav header which renders on every page. Disabling SSR for it means the nav glassmorphism effect is missing from the server-rendered HTML entirely — the nav will have no container element until the client hydrates and renders `GlassSurface`. This causes a **layout shift** (nav content appears then glass wrapper appears around it), which may be visually jarring.

**Mitigation for Option 2:** Provide a placeholder `<div>` in the `loading` prop of `dynamic()` that matches the glass surface dimensions exactly, so the nav layout is stable while the component loads.

**This option does NOT fix the `mounted`/nav-link mismatch in `nav-client.tsx`.** That requires Fix 1b regardless.

---

## D. Verification Checklist

After applying fixes:

1. **Dev server check:**
   ```bash
   pnpm dev
   ```
   - Open browser DevTools → Console
   - Hard-refresh any page containing the nav (e.g., `/`, `/marketplace`)
   - Confirm zero "Hydration failed" errors in the console
   - Confirm no React red overlay in development mode

2. **Production build check:**
   ```bash
   pnpm build && pnpm start
   ```
   - Hard-refresh with cache cleared (`Cmd+Shift+R` / `Ctrl+Shift+R`)
   - Confirm zero hydration errors in production console
   - Confirm `glass-surface--fallback` class is present in server-rendered HTML (visible in View Source)
   - Confirm class upgrades to `glass-surface--svg` after mount (visible in DevTools Elements panel after paint)

3. **Visual regression check for GlassSurface:**
   - On Chrome desktop: confirm glassmorphism effect renders correctly after ~16ms (one frame delay for `useEffect`)
   - On Safari: confirm `glass-surface--fallback` class remains (Safari excluded by browser detection)
   - Confirm no layout shift: the container dimensions should be identical between `--fallback` and `--svg` states (only CSS backdrop-filter behavior differs)

4. **Nav login link check:**
   - Logged-out state: confirm `<span>...</span>` appears briefly on first paint, then `<a href="/login">Login</a>` renders
   - Logged-in state: confirm user name + logout button renders after mount
   - Confirm no flash of wrong content (the `...` placeholder should be imperceptible on fast connections)

5. **LightPillar check (if Fix 1c applied):**
   - On a WebGL-capable browser: confirm no hydration errors, confirm 3D effect renders
   - On a WebGL-incapable browser/environment: confirm CSS fallback renders without errors

---

## E. Risk Notes

### Layout shift / visual flicker

**GlassSurface `--fallback` → `--svg` transition:**
- The `--fallback` class renders a plain frosted glass via CSS (`backdrop-filter: blur(...)`)
- The `--svg` class applies an SVG displacement filter for the chromatic aberration effect
- Both classes should occupy **identical dimensions** — no layout shift expected
- There will be a single-frame (~16ms) period where the fallback CSS renders before the `useEffect` fires and upgrades to SVG. On fast hardware this is imperceptible.
- To eliminate any flicker: add a CSS transition on the properties that change between states (e.g., `transition: backdrop-filter 0.1s ease`), or accept the current behavior which was identical before the refactor.

**NavClient `<span>...` → auth-aware content:**
- The `...` placeholder span occupies less horizontal space than the Login button or user block
- This will cause a brief CLS (Cumulative Layout Shift) in the nav on every page load
- **Mitigation already in place:** the `...` span uses `text-[var(--color-muted)]` styling, providing a subtle visual indication that content is loading. The width difference is small (3 chars vs "Login" button)
- To eliminate: add `min-width` to the placeholder span equal to the Login button's width, or use an `opacity: 0` placeholder that occupies the correct width

### `react-hooks/set-state-in-effect` lint rule

After applying Fix 1a and 1b, the lint rule will re-flag these files. The suppressions are **intentional and necessary** — these are the only two patterns in the codebase where `setState` inside `useEffect` is the correct hydration strategy. Document each suppression with a comment explaining:
1. Why this specific `setState` is post-hydration safe
2. Why no lazy initializer alternative exists without causing an SSR/client mismatch

If the lint rule is configured as `error` (blocking CI), add targeted per-line suppressions rather than file-wide disables.

### `ad-slot-grid.tsx` `setTimeout` deferral

The `setTimeout(() => applyQueryState(...), 0)` added for `react-hooks/set-state-in-effect` compliance does not cause hydration issues (the component is client-only and the URL sync effect runs post-mount). However, introducing a `0ms` timeout for URL state synchronization may cause a one-frame delay in search param–driven state updates. Monitor for any edge cases where the marketplace page initializes from URL parameters (e.g., deep links with `?mode=rag&q=...`).

---

## Summary: Files to Change

| File | Change |
|---|---|
| `apps/frontend/app/components/GlassSurface.jsx` | Revert `useState(lazy)` → `useState(false)` + `useEffect` with scoped lint suppress |
| `apps/frontend/app/components/nav-client.tsx` | Revert `useState(lazy)` → `useState(false)` + restore `useEffect(() => setMounted(true), [])` with scoped lint suppress |
| `apps/frontend/app/components/landing/LightPillar.jsx` | Revert `useState(lazy)` → `useState(true)` + restore `useEffect` capability check with scoped lint suppress |
