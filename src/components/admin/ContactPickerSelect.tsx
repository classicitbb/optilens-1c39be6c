import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ContactOption {
  id: string;
  name: string;
  is_company: boolean;
  parent_id: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
}

interface ContactPickerSelectProps {
  value: string;
  onValueChange: (contactId: string) => void;
  className?: string;
  placeholder?: string;
  /** When set, only show contacts that belong to this company (parent_id = companyId or id = companyId) */
  companyId?: string | null;
}

const COLUMNS = "id,name,is_company,parent_id,business_name,email,phone";

const contactLabel = (c: ContactOption) =>
  c.is_company ? `🏢 ${c.name}` : `${c.name}${c.business_name ? ` — ${c.business_name}` : ""}`;

/**
 * Searchable contact picker (combobox). The field itself is the search box: click
 * or tab into it and start typing. Searches the whole contacts table server-side,
 * so any company or individual can be found, not just the first page.
 * Shows companies first, then individuals. Arrow keys + Enter pick from the list.
 */
const ContactPickerSelect = ({
  value,
  onValueChange,
  className,
  placeholder = "Contact",
  companyId,
}: ContactPickerSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  // Index into [“No contact”, ...results]; -1 means nothing highlighted yet.
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data: contacts = [], isFetching } = useQuery({
    queryKey: ["helpdesk-contact-picker", companyId, debounced],
    enabled: open,
    queryFn: async () => {
      let query = (supabase as any)
        .from("contacts")
        .select(COLUMNS)
        .eq("is_archived", false)
        .order("is_company", { ascending: false })
        .order("name")
        .limit(50);

      if (companyId) {
        // Show the company itself + all contacts under it
        query = query.or(`id.eq.${companyId},parent_id.eq.${companyId}`);
      }
      if (debounced) {
        const term = `%${debounced.replace(/[%_,()]/g, " ")}%`;
        query = query.or(`name.ilike.${term},business_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ContactOption[];
    },
  });

  // The selected contact may not be in the current result page; load it for the field label.
  const { data: selected } = useQuery({
    queryKey: ["helpdesk-contact-picker-selected", value],
    enabled: !!value,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("contacts").select(COLUMNS).eq("id", value).maybeSingle();
      if (error) throw error;
      return (data ?? null) as ContactOption | null;
    },
  });

  const pick = (id: string) => {
    onValueChange(id);
    setOpen(false);
    setSearch("");
    setActiveIndex(-1);
  };

  const companies = contacts.filter((c) => c.is_company);
  const individuals = contacts.filter((c) => !c.is_company);
  // Same order the list renders in: “No contact”, companies, then individuals.
  const optionIds = ["", ...companies.map((c) => c.id), ...individuals.map((c) => c.id)];

  useEffect(() => {
    if (activeIndex < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-option-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActiveIndex((index) => (index < 0 ? (optionIds.length > 1 ? 1 : 0) : Math.min(index + 1, optionIds.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (open) setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (e.key === "Enter" && open) {
      // Typed a search and pressed Enter without arrowing: take the top result.
      const target = activeIndex >= 0 ? optionIds[activeIndex] : search.trim() ? optionIds[1] : undefined;
      if (target !== undefined) {
        e.preventDefault();
        e.stopPropagation();
        pick(target);
      }
    }
  };

  const renderItem = (c: ContactOption) => {
    const index = optionIds.indexOf(c.id);
    return (
      <button
        key={c.id}
        type="button"
        data-option-index={index}
        onClick={() => pick(c.id)}
        className={cn(
          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:outline-none",
          activeIndex === index && "bg-accent text-accent-foreground",
        )}
      >
        <Check className={cn("h-3 w-3 shrink-0", value === c.id ? "opacity-100" : "opacity-0")} />
        <span className="truncate">{contactLabel(c)}</span>
      </button>
    );
  };

  const selectedLabel = value && selected ? contactLabel(selected) : "";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setActiveIndex(-1);
      }}
    >
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative">
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            autoComplete="off"
            value={open ? search : selectedLabel}
            placeholder={open ? selectedLabel || "Search contacts…" : placeholder}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveIndex(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className={cn(
              "h-8 w-full rounded-md border border-input bg-background px-3 py-2 pr-14 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring",
              className,
            )}
          />
          {isFetching && open && <Loader2 className="pointer-events-none absolute right-8 top-2 h-4 w-4 animate-spin text-muted-foreground" />}
          <button
            type="button"
            tabIndex={-1}
            aria-label={open ? "Close contact list" : "Open contact list"}
            // Keep focus in the field; otherwise its focus handler would reopen the list we just closed.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (open) {
                setOpen(false);
              } else {
                inputRef.current?.focus();
                setOpen(true);
              }
            }}
            className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center"
          >
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-1"
        align="start"
        // Keep focus in the field so typing continues uninterrupted.
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (anchorRef.current?.contains(e.target as Node)) e.preventDefault();
        }}
      >
        <div ref={listRef} className="max-h-72 overflow-y-auto">
          <button
            type="button"
            data-option-index={0}
            onClick={() => pick("")}
            className={cn(
              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground",
              activeIndex === 0 && "bg-accent text-accent-foreground",
            )}
          >
            <Check className={cn("h-3 w-3 shrink-0", !value ? "opacity-100" : "opacity-0")} />
            No contact
          </button>
          {companies.length > 0 && (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Companies</div>
              {companies.map(renderItem)}
            </>
          )}
          {individuals.length > 0 && (
            <>
              <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Individuals</div>
              {individuals.map(renderItem)}
            </>
          )}
          {!isFetching && contacts.length === 0 && (
            <div className="px-2 py-2 text-xs text-muted-foreground text-center">No contacts found</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ContactPickerSelect;
