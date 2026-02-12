

## Consolidate Header Actions into a Profile Dropdown

Currently, when a user is logged in, the header shows Cart, Orders, Profile, and Sign Out (plus Admin for admins) as separate buttons. This crowds the header, especially on smaller screens.

### Approach

Consolidate **Orders**, **Admin** (if applicable), **Profile**, and **Sign Out** into a single **Profile dropdown menu**. The **Cart** button stays visible since it's a primary action.

### What the header will look like (logged in):

```text
[Logo]   Store | Knowledge Base | Products | About        [Cart] [Profile ▾]
```

Clicking the Profile button opens a dropdown with:
- Profile
- Orders
- Admin (only if user is admin)
- Separator
- Sign Out

### Technical Details

**File: `src/components/Header.tsx`**

- Import `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator` from the existing `@/components/ui/dropdown-menu`
- Replace the 3-4 separate buttons (Orders, Profile, Admin, Sign Out) with a single `DropdownMenu` component
- The trigger will be a ghost button showing the User icon and "Profile" text (or just the icon on small screens)
- Each menu item will use `Link` for navigation items (Profile, Orders, Admin) and an `onClick` handler for Sign Out
- Cart button remains outside the dropdown as a standalone action

