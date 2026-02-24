

## Skip Unsaved-Changes Prompt When Operator Hasn't Manually Edited

### Problem
When navigating between add-ons, the unsaved changes dialog appears even when the operator hasn't touched any fields -- for example when data refreshes or calculations change. The user wants: if there are no **manual** edits, just auto-save (commit) and move to the next record silently.

### Solution
Track whether the user has **manually** interacted with the form using a `userEdited` ref flag. Only show the unsaved-changes prompt when this flag is true **and** cost > 0. Otherwise, silently save and navigate.

### Changes in `src/components/admin/AddonFormDialog.tsx`

1. **Add a `userEdited` ref** (next to `initialFormRef`):
   ```ts
   const userEditedRef = useRef(false);
   ```

2. **Reset the flag** when the dialog opens or the addon changes (inside the existing `useEffect` that sets `initialFormRef`):
   ```ts
   useEffect(() => {
     if (open) {
       userEditedRef.current = false;
       const timer = setTimeout(() => { initialFormRef.current = JSON.stringify(form); }, 0);
       return () => clearTimeout(timer);
     }
   }, [open, addon]);
   ```

3. **Mark as user-edited** in the `set` helper (the function all manual field changes go through):
   ```ts
   const set = (key: keyof AddonFormData, value: any) => {
     userEditedRef.current = true;
     setForm((f) => ({ ...f, [key]: value }));
   };
   ```

4. **Update `handleNavigate`** to use `userEditedRef` instead of `isDirty()`:
   ```ts
   const handleNavigate = (target: Addon) => {
     if (userEditedRef.current && isDirty() && form.cost > 0) {
       setPendingNavTarget(target);
       setUnsavedDialogOpen(true);
     } else if (userEditedRef.current && isDirty()) {
       // User edited but cost is 0 -- silently save and go
       const assignments = getAssignments();
       onSubmit(form, assignments);
       setTimeout(() => onNavigate?.(target), 100);
     } else {
       onNavigate?.(target);
     }
   };
   ```

   This means:
   - **No manual edits** -- skip straight to next, no prompt, no save
   - **Manual edits + cost > 0** -- show the unsaved changes dialog
   - **Manual edits + cost = 0** -- silently save and navigate

### Files modified
| File | Change |
|------|--------|
| `src/components/admin/AddonFormDialog.tsx` | Add `userEditedRef`, set it in `set()`, reset on open, use in `handleNavigate` |

