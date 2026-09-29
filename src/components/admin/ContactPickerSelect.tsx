import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
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
 * Searchable contact picker (popover combobox). Searches the whole contacts table
 * server-side, so any company or individual can be found, not just the first page.
 * Shows companies first, then individuals.
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

  // The selected contact may not be in the current result page; load it for the trigger label.
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
  };

  const companies = contacts.filter((c) => c.is_company);
  const individuals = contacts.filter((c) => !c.is_company);

  const renderItem = (c: ContactOption) => (
    <button
      key={c.id}
      type="button"
      onClick={() => pick(c.id)}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:outline-none"
    >
      <Check className={cn("h-3 w-3 shrink-0", value === c.id ? "opacity-100" : "opacity-0")} />
      <span className="truncate">{contactLabel(c)}</span>
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring",
            className,
          )}
        >
          <span className={cn("truncate", !(value && selected) && "text-muted-foreground")}>
            {value && selected ? contactLabel(selected) : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-1" align="start">
        <div className="relative px-1 pb-1">
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="h-7 text-xs"
          />
          {isFetching && <Loader2 className="absolute right-3 top-1.5 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="max-h-72 overflow-y-auto">
          <button
            type="button"
            onClick={() => pick("")}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
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
