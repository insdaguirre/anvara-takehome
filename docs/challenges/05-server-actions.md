# Challenge 5: Dashboards with Server Actions

**Difficulty:** ⭐⭐⭐ Hard

## Overview

Build fully functional dashboards for both **publishers** and **sponsors** using **Next.js Server Actions** for all data mutations. This challenge tests your understanding of modern Next.js patterns for form handling and data updates.

## Your Task

Implement dashboards that allow:

- **Publishers** to create, edit, and delete their ad slots
- **Sponsors** to create, edit, and delete their campaigns

## What You'll Build

Two complete dashboards with create, edit, and delete functionality:

- **Publisher Dashboard**: Manage ad slots
- **Sponsor Dashboard**: Manage campaigns

You'll need to create Server Actions files and update the existing dashboard pages.

## Requirements

### Feature Requirements

Both dashboards must implement:

1. ✅ **Display items** - Show all campaigns (sponsors) or ad slots (publishers)
2. ✅ **Create item** - Form to add new campaigns/ad slots
3. ✅ **Edit item** - Update existing campaigns/ad slots
4. ✅ **Delete item** - Remove campaigns/ad slots
5. ✅ **Loading states** - Show pending state during mutations
6. ✅ **Error handling** - Display validation and server errors
7. ✅ **Success feedback** - Confirm successful operations

### Technical Requirements

1. ✅ Use **Server Actions** for all mutations (create, update, delete)
2. ✅ Use `useFormState` for form state management
3. ✅ Use `useFormStatus` for pending states
4. ✅ Call `revalidatePath()` to refresh data after mutations
5. ✅ Implement proper validation
6. ✅ Handle errors gracefully

## What are Server Actions?

Server Actions are asynchronous functions that run on the server but can be called directly from Client Components. They're marked with the `'use server'` directive.

### Key Benefits

- No need to create API routes
- Type-safe function calls
- Built-in CSRF protection
- Works with progressive enhancement
- Automatic cache revalidation via `revalidatePath()`

## Implementation Hints

### Where to Start

Look for TODO comments in:

- `apps/frontend/app/dashboard/publisher/` - Publisher dashboard
- `apps/frontend/app/dashboard/sponsor/` - Sponsor dashboard

You'll need to:

1. Create Server Action files (`actions.ts`) with the `'use server'` directive
2. Implement create/update/delete functions that call your backend API
3. Build forms that use these actions
4. Add loading and error states with React hooks
5. Revalidate paths after mutations

### Server Actions Pattern

Server Actions should:

- Accept `prevState` and `formData` parameters
- Validate input and return field-specific errors
- Get authentication from cookies (`next/headers`)
- Call backend API endpoints with proper auth headers
- Use `revalidatePath()` to refresh data
- Return `{ success?: boolean, error?: string, fieldErrors?: Record<string, string> }`

### React Hooks for Forms

Use these React hooks:

- **`useFormState(action, initialState)`** - Track form state and errors across submissions
- **`useFormStatus()`** - Get pending state inside form components (for loading buttons)

### Authentication Pattern

Server Actions run on the server and can access cookies:

```typescript
import { cookies } from 'next/headers';

const cookieStore = await cookies();
const sessionCookie = cookieStore.get('better-auth-session');
```

You'll need to pass this cookie to your backend API in the request headers.

### Data Revalidation

After mutations, tell Next.js to refresh cached data:

```typescript
import { revalidatePath } from 'next/cache';

// After successful create/update/delete:
revalidatePath('/dashboard/publisher');
```

## Testing

### Publisher Dashboard Test Flow

1. Log in as `publisher@example.com` / `password`
2. Click "Create Ad Slot" button
3. Fill form and submit - should see new ad slot appear
4. Click "Edit" on an ad slot - form should populate with existing data
5. Modify and save - should see updated data
6. Click "Delete" - should confirm and remove ad slot
7. Test validation - submit empty form, should see error messages
8. Check loading states - submit buttons should show "Saving..." during operations

### Sponsor Dashboard Test Flow

1. Log in as `sponsor@example.com` / `password`
2. Test create/edit/delete campaigns following same pattern as above
3. Verify only your campaigns can be modified

### Verification with Prisma Studio

```bash
pnpm --filter @anvara/backend db:studio
```

- Open http://localhost:5555
- Browse `AdSlot` and `Campaign` tables
- Verify CRUD operations are reflected in the database
- Check that `publisherId`/`sponsorId` fields are set correctly

## Verification Checklist

### Publisher Dashboard

- [x] Can view all ad slots
- [x] Can create new ad slot with form
- [x] Can edit existing ad slot
- [x] Can delete ad slot with confirmation
- [x] Loading states display during operations ("Saving...", "Deleting...")
- [x] Validation errors show for empty/invalid fields
- [x] Forms close after successful submission
- [x] Data refreshes automatically after mutations
- [x] Server errors display correctly

### Sponsor Dashboard

- [x] Can view all campaigns
- [x] Can create new campaign
- [x] Can edit existing campaign
- [x] Can delete campaign
- [x] Date inputs work correctly
- [x] Budget validation works
- [x] All CRUD operations refresh data properly

### Both Dashboards

- [x] Proper authentication (redirects if not logged in)
- [x] No console errors
- [x] Form state managed correctly with `useFormState`
- [x] Submit buttons show pending state with `useFormStatus`
- [x] Error messages are user-friendly
- [x] Success feedback is clear

## Resources

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [useFormState Hook](https://react.dev/reference/react-dom/hooks/useFormState)
- [useFormStatus Hook](https://react.dev/reference/react-dom/hooks/useFormStatus)
- [revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath)
- [Server Actions Best Practices](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#best-practices)

## Concepts Tested

- ✅ Next.js Server Actions
- ✅ Form handling with `useFormState`
- ✅ Pending states with `useFormStatus`
- ✅ Cache revalidation with `revalidatePath`
- ✅ Progressive enhancement
- ✅ Client/Server boundary understanding
- ✅ Form validation patterns
- ✅ Error handling and user feedback
- ✅ Authentication with cookies

## Congratulations! 🎉

You've completed all 5 core challenges! Now move on to:

→ **[Bonus Challenges](../bonus-challenges/README.md)** (Optional)  
→ **[Submission Guide](../submission.md)**

---

[← Back to Challenges](README.md)
