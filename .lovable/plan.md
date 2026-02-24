

## Shorten the Dialog Header Band with Arrow Navigation

### Current State
The AddonFormDialog header shows chevron buttons flanking the title: `[<] Edit Add-On [>]`. There is no record count indicator.

### Proposed Change
Replace the current layout with a compact header matching the reference screenshot pattern:

```text
Edit Add-On                          1 / 24  < >
```

**File:** `src/components/admin/AddonFormDialog.tsx` (lines 230-247)

- Move the title to the left as a standalone element
- On the right side, show a compact record indicator: `{currentIndex + 1} / {total}` followed by `<` and `>` arrow buttons
- Use smaller, minimal ghost buttons for the arrows (matching the screenshot style -- simple bordered arrow buttons)
- The arrows navigate previous/next as before, disabled at boundaries
- When there is no navigation context (new add-on or no `addons` list), hide the navigation cluster entirely

### Technical Detail

Replace the `DialogHeader` content (lines 230-247) with:

```tsx
<DialogHeader>
  <div className="flex items-center justify-between">
    <DialogTitle className="text-sm font-semibold" style={{ color: "hsl(215 30% 15%)" }}>
      {addon ? "Edit Add-On" : "New Add-On"}
    </DialogTitle>
    {addon && onNavigate && addons && (
      <div className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(215 15% 50%)" }}>
        <span>{currentIndex + 1} / {addons.length}</span>
        <Button type="button" variant="outline" size="icon" className="h-6 w-6"
          disabled={!canGoPrev || isPending}
          onClick={() => canGoPrev && handleNavigate(addons[currentIndex - 1])}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" variant="outline" size="icon" className="h-6 w-6"
          disabled={!canGoNext || isPending}
          onClick={() => canGoNext && handleNavigate(addons[currentIndex + 1])}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    )}
  </div>
</DialogHeader>
```

Only one file is modified: `src/components/admin/AddonFormDialog.tsx`.

