# Bonus 6: Fix All ESLint Warnings ⭐

**Difficulty:** Easy

---

## Goal

Run `pnpm lint` and fix all remaining TypeScript/ESLint errors and warnings throughout the codebase.

---

## Key Issues to Fix

- Replace `any` types with proper types
- Remove unused variables and imports
- Fix function signatures
- Add missing type annotations
- Remove deprecated code

---

## Files with Issues

- [`apps/backend/src/utils/helpers.ts`](../../apps/backend/src/utils/helpers.ts)
- [`apps/frontend/lib/utils.ts`](../../apps/frontend/lib/utils.ts)
- [`apps/frontend/lib/api.ts`](../../apps/frontend/lib/api.ts)

---s

## Verification

```bash
pnpm lint
# Should pass with no errors or warnings
```

---

## What We're Looking For

Candidates who:

- Understand TypeScript best practices
- Write clean, type-safe code
- Pay attention to code quality
- Can work with existing linting rules

---

[← Back to Bonus Challenges](../README.md)
