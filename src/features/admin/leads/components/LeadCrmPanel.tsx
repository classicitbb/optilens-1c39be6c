import { useState } from "react";
import { Link2, Save, Undo2, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ConnectionStrength, LeadFollowUp, LeadRecord } from "../types";
import type { ContactSearchResult } from "../hooks/useLeadActions";
import LinkContactDialog from "./LinkContactDialog";

export interface StaffOption { user_id: string; name: string }

export interface LeadCrmPanelProps {
  lead: LeadRecord;
  staff: StaffOption[];
  currentUserId: string | null;
  busy: boolean;
  /** Set once this lead has been saved in this session. */
  saved: { createdContact: boolean; taskCreated: boolean } | null;
  onLinkContact: (contact: ContactSearchResult) => Promise<void> | void;
  onMarkCustomer: () => Promise<void> | void;
  onClearLink: () => Promise<void> | void;
  onSave: (input: { contactId: string | null; connectionStrength: ConnectionStrength; followUp: LeadFollowUp }) => Promise<void> | void;
  searchContacts?: (term: string) => Promise<ContactSearchResult[]>;
}

const STRENGTH_LABELS: Record<ConnectionStrength, string> = {
  unclassified: "Unclassified",
  strong: "Strong",
  not_strong: "Not strong",
};

const BASIS_LABELS = { confirmed_link: "Linked by you", name_location: "Name + city", website: "Website" } as const;

const LeadCrmPanel = ({
  lead, staff, currentUserId, busy, saved, onLinkContact, onMarkCustomer, onClearLink, onSave, searchContacts,
}: LeadCrmPanelProps) => {
  const crm = lead.crm;
  const [strength, setStrength] = useState<ConnectionStrength>("unclassified");
  const [needsFollowUp, setNeedsFollowUp] = useState(false);
  const [ownerId, setOwnerId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!crm) return null;

  const unavailable = crm.status === "unavailable";
  const persisted = crm.match?.confirmed === true || crm.customerSource === "manual_mark";
  const idPrefix = `crm-${lead.id}`;
  const effectiveOwner = ownerId || currentUserId || "";
  const saveLabel = crm.match ? "Save to contact" : "Save to CRM";

  const handleSave = () =>
    onSave({
      contactId: crm.match?.contactId ?? null,
      connectionStrength: strength,
      followUp: { needsFollowUp, ownerId: effectiveOwner || null, dueDate: needsFollowUp && dueDate ? dueDate : null },
    });

  return (
    <div className="border-t pt-2 mt-1 space-y-2" data-testid={`crm-panel-${lead.id}`}>
      {unavailable ? (
        <p role="alert" className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] text-amber-800">
          CRM matching is unavailable, so this lead can&apos;t be saved yet — it could duplicate an existing contact. Search again once it recovers.
        </p>
      ) : null}

      {crm.isCurrentCustomer ? (
        <Badge variant="outline" className="border-emerald-300 text-emerald-700">
          Current customer{crm.customerSource === "manual_mark" ? " (marked by you)" : ""}
        </Badge>
      ) : null}

      {crm.match ? (
        <p className="text-[11px]">
          <span className="font-medium">CRM: {crm.match.contactName}</span>
          {crm.match.businessName && crm.match.businessName !== crm.match.contactName ? ` · ${crm.match.businessName}` : ""}
          <span className="text-muted-foreground"> — {BASIS_LABELS[crm.match.basis]}. {crm.match.reason}</span>
        </p>
      ) : null}

      {!crm.match && crm.suggestions.length > 0 ? (
        <div className="text-[11px] space-y-1">
          <p className="font-medium">Possible matches — review, nothing is linked yet</p>
          <ul className="space-y-1">
            {crm.suggestions.map((suggestion) => (
              <li key={suggestion.contactId} className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground">
                  {suggestion.contactName}
                  {suggestion.isCustomer ? " (customer)" : ""} — {suggestion.reason}
                </span>
                <Button
                  type="button" size="sm" variant="outline" className="h-6 text-[10px] shrink-0"
                  disabled={busy}
                  onClick={() => onLinkContact({
                    id: suggestion.contactId, name: suggestion.contactName, business_name: suggestion.businessName,
                    city: null, is_customer: suggestion.isCustomer, linked_customer_id: null,
                  })}
                >
                  Link
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy || unavailable} onClick={() => setPickerOpen(true)}>
          <Link2 className="h-3 w-3 mr-1" /> Link existing contact
        </Button>
        {!crm.isCurrentCustomer ? (
          <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" disabled={busy || unavailable} onClick={() => void onMarkCustomer()}>
            <UserCheck className="h-3 w-3 mr-1" /> Mark current customer
          </Button>
        ) : null}
        {persisted ? (
          <Button type="button" size="sm" variant="ghost" className="h-7 text-[11px]" disabled={busy} onClick={() => void onClearLink()}>
            <Undo2 className="h-3 w-3 mr-1" /> {crm.customerSource === "manual_mark" ? "Unmark customer" : "Unlink contact"}
          </Button>
        ) : null}
      </div>

      <fieldset className="space-y-2 text-[11px]" disabled={busy}>
        <legend className="sr-only">Relationship review</legend>
        <div className="flex items-center gap-2">
          <label htmlFor={`${idPrefix}-strength`} className="font-medium">Connection strength</label>
          <select
            id={`${idPrefix}-strength`}
            className="h-7 rounded border bg-background px-1 text-[11px]"
            value={strength}
            onChange={(e) => setStrength(e.target.value as ConnectionStrength)}
          >
            {(Object.keys(STRENGTH_LABELS) as ConnectionStrength[]).map((value) => (
              <option key={value} value={value}>{STRENGTH_LABELS[value]}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            id={`${idPrefix}-follow`}
            type="checkbox"
            checked={needsFollowUp}
            onChange={(e) => setNeedsFollowUp(e.target.checked)}
          />
          <label htmlFor={`${idPrefix}-follow`} className="font-medium">Needs follow-up</label>
        </div>
        {needsFollowUp ? (
          <div className="flex flex-wrap items-center gap-2 pl-5">
            <label htmlFor={`${idPrefix}-owner`}>Owner</label>
            <select
              id={`${idPrefix}-owner`}
              className="h-7 rounded border bg-background px-1 text-[11px]"
              value={effectiveOwner}
              onChange={(e) => setOwnerId(e.target.value)}
            >
              {effectiveOwner && !staff.some((member) => member.user_id === effectiveOwner) ? (
                <option value={effectiveOwner}>Me</option>
              ) : null}
              {staff.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.name}{member.user_id === currentUserId ? " (me)" : ""}
                </option>
              ))}
            </select>
            <label htmlFor={`${idPrefix}-due`}>Due</label>
            <Input id={`${idPrefix}-due`} type="date" className="h-7 w-36 text-[11px]" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        ) : null}
      </fieldset>

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" className="h-7 text-[11px]" disabled={busy || unavailable} onClick={() => void handleSave()}>
          <Save className="h-3 w-3 mr-1" /> {busy ? "Saving…" : saveLabel}
        </Button>
        {saved ? (
          <span role="status" className="text-[11px] text-emerald-700">
            Saved{saved.createdContact ? " — new contact created" : ""}{saved.taskCreated ? " with follow-up task" : ""}.
          </span>
        ) : null}
      </div>

      <LinkContactDialog
        open={pickerOpen}
        leadName={lead.name}
        onOpenChange={setPickerOpen}
        search={searchContacts}
        onSelect={async (contact) => {
          setPickerOpen(false);
          await onLinkContact(contact);
        }}
      />
    </div>
  );
};

export default LeadCrmPanel;
