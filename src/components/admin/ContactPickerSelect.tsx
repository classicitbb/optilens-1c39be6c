import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ContactOption {
  id: string;
  name: string;
  is_company: boolean;
  parent_id: string | null;
  business_name: string | null;
  email: string | null;
}

interface ContactPickerSelectProps {
  value: string;
  onValueChange: (contactId: string) => void;
  className?: string;
  placeholder?: string;
  /** When set, only show contacts that belong to this company (parent_id = companyId or id = companyId) */
  companyId?: string | null;
}

/**
 * Contact picker with company constraint.
 * Shows companies first, then individuals grouped under their company.
 */
const ContactPickerSelect = ({
  value,
  onValueChange,
  className,
  placeholder = "Contact",
  companyId,
}: ContactPickerSelectProps) => {
  const [search, setSearch] = useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ["helpdesk-contact-picker", companyId],
    queryFn: async () => {
      let query = (supabase as any)
        .from("contacts")
        .select("id,name,is_company,parent_id,business_name,email")
        .eq("is_archived", false)
        .order("is_company", { ascending: false })
        .order("name")
        .limit(500);

      if (companyId) {
        // Show the company itself + all contacts under it
        query = query.or(`id.eq.${companyId},parent_id.eq.${companyId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ContactOption[];
    },
  });

  const filtered = useMemo(() => {
    if (!search) return contacts;
    const s = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        (c.business_name && c.business_name.toLowerCase().includes(s)) ||
        (c.email && c.email.toLowerCase().includes(s))
    );
  }, [contacts, search]);

  // Group: companies first, then individuals
  const companies = filtered.filter((c) => c.is_company);
  const individuals = filtered.filter((c) => !c.is_company);

  return (
    <Select value={value || "__none"} onValueChange={(v) => onValueChange(v === "__none" ? "" : v)}>
      <SelectTrigger className={cn("h-8 text-xs", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 pb-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="h-7 text-xs"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <SelectItem value="__none" className="text-xs">No contact</SelectItem>
        {companies.length > 0 && (
          <>
            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Companies</div>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                🏢 {c.name}
              </SelectItem>
            ))}
          </>
        )}
        {individuals.length > 0 && (
          <>
            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Individuals</div>
            {individuals.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-xs">
                {c.name}{c.business_name ? ` — ${c.business_name}` : ""}
              </SelectItem>
            ))}
          </>
        )}
        {filtered.length === 0 && (
          <div className="px-2 py-2 text-xs text-muted-foreground text-center">No contacts found</div>
        )}
      </SelectContent>
    </Select>
  );
};

export default ContactPickerSelect;
