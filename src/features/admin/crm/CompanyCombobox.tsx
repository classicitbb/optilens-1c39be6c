import { useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

/** Editable selection: typing stays in the field, Enter chooses the first match. */
export function CompanyCombobox({ companies, value, onChange }: {
  companies: { id: string; name: string }[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const selected = companies.find((company) => company.id === value);
  const options = [{ id: "", name: "None" }, ...companies].filter((company) =>
    company.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const choose = (company: { id: string }) => {
    onChange(company.id || null);
    setOpen(false);
    setQuery("");
    input.current?.focus();
  };
  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); setQuery(""); setActive(0); }}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Input ref={input} role="combobox" aria-label="Parent Company" aria-expanded={open}
            aria-controls={`${id}-list`} aria-autocomplete="list"
            aria-activedescendant={open && options[active] ? `${id}-${active}` : undefined}
            autoComplete="off" className="h-7 pr-7 text-xs"
            placeholder={open ? "Type to search companies…" : "None"}
            value={open ? query : selected?.name ?? ""}
            onClick={() => { if (!open) { setQuery(""); setActive(0); setOpen(true); } }}
            onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                if (!open) { setOpen(true); setQuery(""); setActive(0); }
                else setActive((index) => Math.max(0, Math.min(options.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
              } else if (event.key === "Enter" && open) {
                event.preventDefault();
                if (options[active]) choose(options[active]);
              } else if (event.key === "Escape" && open) {
                event.preventDefault(); event.stopPropagation(); setOpen(false); setQuery("");
              } else if (event.key === "Tab") { setOpen(false); setQuery(""); }
            }} />
          <ChevronDown aria-hidden className="pointer-events-none absolute right-2 top-1.5 h-4 w-4 opacity-50" />
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-[var(--radix-popover-anchor-width)] p-1"
        onOpenAutoFocus={(event) => event.preventDefault()} onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => { if (event.target === input.current) event.preventDefault(); }}>
        <div id={`${id}-list`} role="listbox" aria-label="Companies" className="max-h-64 overflow-y-auto">
          {options.map((company, index) => (
            <div key={company.id} id={`${id}-${index}`} role="option" aria-selected={index === active}
              className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs ${index === active ? "bg-accent text-accent-foreground" : ""}`}
              ref={(element) => { if (open && index === active) element?.scrollIntoView({ block: "nearest" }); }}
              onMouseEnter={() => setActive(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(company)}>
              <Check className={`h-3 w-3 ${company.id === (value ?? "") ? "" : "opacity-0"}`} />{company.name}
            </div>
          ))}
          {!options.length && <p role="status" className="p-2 text-xs text-muted-foreground">No companies found.</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
