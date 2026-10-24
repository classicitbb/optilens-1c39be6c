import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { searchContacts, type ContactSearchResult } from "../hooks/useLeadActions";

interface LinkContactDialogProps {
  open: boolean;
  leadName: string;
  onOpenChange: (open: boolean) => void;
  onSelect: (contact: ContactSearchResult) => void;
  /** Injected for tests. */
  search?: (term: string) => Promise<ContactSearchResult[]>;
}

/** Searchable, keyboard-operable contact picker: type, arrow keys, Enter. */
const LinkContactDialog = ({ open, leadName, onOpenChange, onSelect, search = searchContacts }: LinkContactDialogProps) => {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ContactSearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [active, setActive] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) {
      setTerm("");
      setResults([]);
      setStatus("idle");
      return;
    }
    if (term.trim().length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    const id = ++requestId.current;
    setStatus("loading");
    const handle = setTimeout(() => {
      search(term)
        .then((rows) => {
          if (id !== requestId.current) return;
          setResults(rows);
          setActive(0);
          setStatus("idle");
        })
        .catch(() => {
          if (id === requestId.current) setStatus("error");
        });
    }, 200);
    return () => clearTimeout(handle);
  }, [term, open, search]);

  const label = (contact: ContactSearchResult) =>
    [contact.name, contact.business_name && contact.business_name !== contact.name ? contact.business_name : null]
      .filter(Boolean)
      .join(" · ") || "(unnamed contact)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link existing contact</DialogTitle>
          <DialogDescription>
            Find the CRM contact for “{leadName}”. The names can differ; the link is remembered for future searches.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="link-contact-search">Search contacts</Label>
          <Input
            id="link-contact-search"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="link-contact-results"
            aria-activedescendant={results[active] ? `link-contact-${results[active].id}` : undefined}
            value={term}
            autoFocus
            autoComplete="off"
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                onSelect(results[active]);
              }
            }}
            placeholder="Name or business name"
          />
          <div aria-live="polite" className="text-[11px] text-muted-foreground min-h-4">
            {status === "loading" ? "Searching…" : null}
            {status === "error" ? "Contact search failed. Try again." : null}
            {status === "idle" && term.trim().length >= 2 && results.length === 0 ? "No contacts found." : null}
          </div>
          <ul id="link-contact-results" role="listbox" aria-label="Matching contacts" className="max-h-56 overflow-y-auto space-y-1">
            {results.map((contact, i) => (
              <li
                key={contact.id}
                id={`link-contact-${contact.id}`}
                role="option"
                aria-selected={i === active}
              >
                <Button
                  type="button"
                  variant={i === active ? "secondary" : "ghost"}
                  className="w-full justify-start h-auto py-1.5 text-xs text-left whitespace-normal"
                  onClick={() => onSelect(contact)}
                >
                  <span>
                    {label(contact)}
                    {contact.city ? <span className="text-muted-foreground"> — {contact.city}</span> : null}
                    {contact.is_customer || contact.linked_customer_id != null ? (
                      <span className="text-muted-foreground"> (customer)</span>
                    ) : null}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LinkContactDialog;
