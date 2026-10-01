// A type-to-search picker where the field itself is the search box: click or Tab
// in and just type; the list narrows as you go, ArrowUp/Down moves through it,
// and Enter picks the highlighted match and moves on to the next field (so the
// whole lens can be chosen without the mouse). Escape or Tab away leaves the
// choice as it was.
import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { advanceFrom } from "../focus";
import { CONTROL, Field } from "../ui";

export interface ComboItem { id: string; n: string }

export function ComboBox({
  label, num, value, items, onPick, required = true, placeholder = "Type or choose…",
}: {
  label: string;
  /** Position shown before the label ("1 · Material / index"). */
  num?: number;
  value: string;
  items: ComboItem[];
  onPick: (id: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [typed, setTyped] = useState(false);
  const [active, setActive] = useState(0);

  const selected = items.find((i) => i.id === value);
  const q = typed ? query.trim().toLowerCase() : "";
  const filtered = q ? items.filter((i) => i.n.toLowerCase().includes(q)) : items;
  // Until the person types, the field shows the current choice; once they do, what they typed.
  const shown = typed ? query : selected?.n ?? "";

  const openList = () => {
    setOpen(true);
    setActive(Math.max(0, items.findIndex((i) => i.id === value)));
  };
  const close = () => { setOpen(false); setTyped(false); setQuery(""); };

  const pick = (item: ComboItem) => {
    onPick(item.id);
    close();
    // Move on once the choice has been applied (it can change the other lists).
    const el = input.current;
    setTimeout(() => advanceFrom(el), 0);
  };

  // Keep the highlighted option in view while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, open, listId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openList(); else setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) openList(); else setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      // Handled here, not by the form-wide Enter-to-advance.
      e.preventDefault();
      e.stopPropagation();
      if (open && filtered.length) pick(filtered[Math.min(active, filtered.length - 1)]);
      else if (!open || !typed) advanceFrom(input.current); // nothing to pick: just move on
    } else if (e.key === "Escape") {
      if (open) { e.preventDefault(); e.stopPropagation(); close(); }
    }
  };

  return (
    <Field label={num ? `${num} · ${label}` : label} required={required}>
      <div className="relative">
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && filtered.length ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={shown}
          className={cn(
            "flex w-full rounded-md border border-input bg-background pr-8 text-left placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            CONTROL,
          )}
          onFocus={(e) => { openList(); e.currentTarget.select(); }}
          onClick={() => { if (!open) openList(); }}
          onChange={(e) => { setQuery(e.target.value); setTyped(true); setOpen(true); setActive(0); }}
          onBlur={close}
          onKeyDown={onKeyDown}
        />
        <button
          type="button" tabIndex={-1} aria-hidden="true"
          // keep focus in the field; just toggle the list
          onMouseDown={(e) => { e.preventDefault(); if (open) close(); else { input.current?.focus(); openList(); } }}
          className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground"
        >
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
        </button>

        {open && (
          <ul
            id={listId} role="listbox" aria-label={`${label} options`}
            className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-auto rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md"
          >
            {filtered.length === 0 && <li className="px-2 py-2 text-xs text-muted-foreground">No matches</li>}
            {filtered.map((item, i) => (
              <li
                key={item.id} id={`${listId}-${i}`} role="option" aria-selected={item.id === value}
                // mouse down, not click: the field must not lose focus first
                onMouseDown={(e) => { e.preventDefault(); pick(item); }}
                onMouseMove={() => setActive(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5",
                  i === active && "bg-accent text-accent-foreground",
                )}
              >
                <Check className={cn("h-3.5 w-3.5 shrink-0", item.id === value ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{item.n}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Field>
  );
}
