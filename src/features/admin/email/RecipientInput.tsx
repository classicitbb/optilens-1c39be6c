import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { parseContactEmails } from "@/lib/contactEmails";
import { cn } from "@/lib/utils";
import { useContactSearch, type ContactSuggestion } from "./useEmail";
import { hasRecipient, initials, isEmailAddress, joinRecipients, splitRecipients } from "./recipients";

type Option = { contact: ContactSuggestion; address: string; first: boolean; last: boolean; multi: boolean };

function contactLabel(contact: ContactSuggestion) {
  return contact.name || contact.business_name || "";
}

// One row per address, so a contact with several emails shows them grouped
// under its name and each is picked with the same keys as any other row.
function toOptions(contacts: ContactSuggestion[], value: string): Option[] {
  return contacts.flatMap((contact) => {
    const addresses = parseContactEmails(contact.email).filter((address) => isEmailAddress(address) && !hasRecipient(value, address));
    return addresses.map((address, index) => ({ contact, address, first: index === 0, last: index === addresses.length - 1, multi: addresses.length > 1 }));
  });
}

export function RecipientInput({
  id,
  value,
  onChange,
  placeholder,
  label,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Display names for addresses picked from the CRM in this draft.
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(text), 200);
    return () => window.clearTimeout(timer);
  }, [text]);

  const { data: contacts = [], isFetching } = useContactSearch(term);
  const options = useMemo(() => (term.trim().length >= 2 ? toOptions(contacts, value) : []), [contacts, term, value]);
  const showList = open && text.trim().length >= 2 && (options.length > 0 || !isFetching);
  const recipients = splitRecipients(value);

  const add = (addresses: string[]) => {
    if (addresses.length) onChange(joinRecipients([...recipients, ...addresses]));
  };

  const remove = (address: string) => onChange(joinRecipients(recipients.filter((item) => item !== address)));

  const commitText = () => {
    add(splitRecipients(text));
    setText("");
  };

  const pick = (option: Option) => {
    setNames((current) => ({ ...current, [option.address.toLowerCase()]: contactLabel(option.contact) }));
    add([option.address]);
    setText("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!options.length) return;
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (showList && options[active]) pick(options[active]);
      else commitText();
    } else if (event.key === "," || event.key === ";") {
      event.preventDefault();
      commitText();
    } else if (event.key === "Tab" && text.trim()) {
      if (showList && options[active]) {
        event.preventDefault();
        pick(options[active]);
      } else commitText();
    } else if (event.key === "Backspace" && !text && recipients.length) {
      event.preventDefault();
      remove(recipients[recipients.length - 1]);
    } else if (event.key === "Escape" && showList) {
      // ComposeDialog keeps itself open while aria-expanded is true.
      setOpen(false);
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      <div
        className="flex min-h-9 w-full cursor-text flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus-within:border-[hsl(var(--admin-muted-fg))]"
        onClick={() => inputRef.current?.focus()}
      >
        {recipients.map((address) => {
          const valid = isEmailAddress(address);
          const name = names[address.toLowerCase()];
          return (
            <span
              key={address}
              title={valid ? address : `${address} is not a valid email address`}
              className={cn(
                "inline-flex max-w-full items-center gap-1 rounded border px-2 py-0.5 text-xs",
                valid ? "border-[hsl(var(--admin-border))]" : "border-destructive text-destructive",
              )}
            >
              <span className="truncate">{name || address}</span>
              <button type="button" aria-label={`Remove ${address}`} onClick={(event) => { event.stopPropagation(); remove(address); }}>
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-label={label}
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && options[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={text}
          placeholder={recipients.length ? undefined : placeholder}
          className="min-w-32 flex-1 bg-transparent py-0.5 outline-none placeholder:text-muted-foreground focus-visible:shadow-none"
          onChange={(event) => {
            const next = event.target.value;
            // Pasted lists: keep whatever follows the last separator as the text being typed.
            const match = next.match(/^(.*[,;\n])\s*([^,;\n]*)$/s);
            if (match) {
              add(splitRecipients(match[1]));
              setText(match[2]);
            } else setText(next);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            commitText();
          }}
        />
      </div>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-[hsl(var(--admin-border))] bg-popover py-1 text-popover-foreground shadow-md"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-xs text-[hsl(var(--admin-muted-fg))]">
              No CRM contact matches. Press Enter to add {isEmailAddress(text.trim()) ? text.trim() : "the address"} as typed.
            </li>
          ) : (
            options.map((option, index) => {
              const tags = (option.contact.contact_tag_links ?? []).map((link) => link.contact_tags?.name).filter(Boolean) as string[];
              const name = contactLabel(option.contact);
              return (
                <li
                  key={`${option.contact.id}-${option.address}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  aria-label={`${name}, ${option.address}`}
                  className={cn("flex cursor-pointer items-center gap-2 px-3 py-1.5", index === active && "bg-accent text-accent-foreground", option.multi && !option.last && "pb-0.5")}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pick(option)}
                >
                  {option.first ? (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--admin-border))] text-[11px] font-semibold">{initials(name)}</span>
                  ) : (
                    <span className="w-7 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    {option.first && (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate font-medium">{name}</span>
                        {option.contact.business_name && option.contact.business_name !== name && (
                          <span className="truncate text-xs text-[hsl(var(--admin-muted-fg))]">{option.contact.business_name}</span>
                        )}
                      </span>
                    )}
                    <span className="block truncate text-xs text-[hsl(var(--admin-muted-fg))]">{option.address}</span>
                  </span>
                  {option.first && (
                    <span className="flex shrink-0 gap-1">
                      {option.contact.linked_customer_id ? <span className="rounded border border-[hsl(var(--admin-border))] px-1 text-[10px]">Account #{option.contact.linked_customer_id}</span> : null}
                      {tags.slice(0, 2).map((tag) => <span key={tag} className="rounded border border-[hsl(var(--admin-border))] px-1 text-[10px]">{tag}</span>)}
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
