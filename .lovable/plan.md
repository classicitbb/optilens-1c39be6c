

# Enhanced User Management and Profile Improvements

## Overview
Upgrade the admin Users page into a full user management hub with email display, password reset capability, and improved search. Add role display to the user Profile page and quick-access admin buttons in the Header.

## Changes

### 1. Edge Function: `admin-user-management`
Create a new edge function that uses the Supabase Admin API (service role key) to:
- **List users with emails**: Calls `auth.admin.listUsers()` to return user IDs and emails so the admin table can display actual email addresses instead of truncated UUIDs.
- **Send password reset**: Calls `auth.admin.generateLink({ type: 'recovery', email })` or `resetPasswordForEmail` to trigger a password reset email for a given user.

This is required because the client-side SDK cannot access other users' emails or trigger password resets on their behalf.

### 2. Update `useAdminUsers` hook
- Call the new edge function to fetch user emails and merge them into the existing profile+role data.
- Add a `resetPassword` mutation that calls the edge function's reset endpoint.

### 3. Enhance `UsersPage.tsx`
- **Email column**: Display actual user emails (fetched via edge function).
- **Search/filter**: Add a search input to filter users by name, email, or role.
- **Password reset button**: A key icon per row that triggers a password reset email. Shows a confirmation toast.
- **Better layout**: Add column headers for Email, and a search bar at the top.
- **Created date**: Show when the user account was created (from auth data).

### 4. Update Profile page (`Profile.tsx`)
- **Role badge**: Fetch the current user's role via `useUserRole` and display it as a colored badge below the email info section (read-only).
- **Admin button**: If the user has an admin role, show a button/link to "/admin" in the profile card.
- **Change password**: Add a "Change Password" section where the user can request a password reset email sent to their own address using `supabase.auth.resetPasswordForEmail()`.

### 5. Header admin access improvements
- Change the Admin link visibility from `isAdmin` to `hasAccess` so that operators and viewers with roles can also see it (they already have access via AdminProtectedRoute).

## Technical Details

### Edge Function Structure (`supabase/functions/admin-user-management/index.ts`)

```text
POST /admin-user-management
Body: { action: "list-users" | "reset-password", email?: string }

- "list-users": Returns array of { id, email, created_at } from auth.admin.listUsers()
- "reset-password": Sends password reset email for the given email address
```

The function validates the caller is an authenticated admin by checking their role in the `user_roles` table before proceeding.

### Profile Role Display
Uses the existing `useUserRole` hook. The role badge uses the same color scheme as the admin Users page (red for admin, blue for operator, gray for viewer). Displayed as a read-only badge next to the email.

### Password Reset Flow (Self-Service on Profile)
Calls `supabase.auth.resetPasswordForEmail(user.email)` which sends a magic link. No edge function needed for self-service -- only admin-triggered resets for other users require the edge function.

### Header Change
```typescript
// Before: only admins see the link
{isAdmin && <Link to="/admin">Admin</Link>}

// After: anyone with a role sees the link  
{hasAccess && <Link to="/admin">Admin</Link>}
```

## Files Changed

| File | Action |
|------|--------|
| `supabase/functions/admin-user-management/index.ts` | Create -- edge function for listing auth users and triggering password resets |
| `src/hooks/useAdminUsers.ts` | Edit -- integrate edge function for emails and password reset mutation |
| `src/pages/admin/UsersPage.tsx` | Edit -- add email column, search, password reset button |
| `src/pages/Profile.tsx` | Edit -- add role badge, admin link, and change password section |
| `src/components/Header.tsx` | Edit -- change admin link from `isAdmin` to `hasAccess` |

