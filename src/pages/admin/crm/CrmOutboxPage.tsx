import { useMemo, useState } from "react";
import { Link } from "react-router";
import { parseContactEmails } from "@/lib/contactEmails";
import { outreachLink } from "@/features/admin/crm/outreachJourney";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { OutreachConfirmButton } from "@/features/admin/crm/OutreachConfirmButton";
import { Check, Copy, Inbox, Mail, MessageCircle, RefreshCw, Send, X } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContacts } from "@/hooks/useContacts";
import { useGenerateDueSteps, useOutbox, useUpdateOutbox, type OutboxDraft } from "@/features/admin/crm/hooks/useCadences";
import { useToast } from "@/hooks/use-toast";
import { checkOutreachDraft } from "../../../../supabase/functions/_shared/crm/outreachGate";

type StatusFilter = OutboxDraft["status"] | "all";

const CrmOutboxPage = () => {
  const { toast } = useToast();
  const { canEdit } = useAdminRole();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("draft");
  const { data: drafts = [], isLoading, error: loadError } = useOutbox(statusFilter === "all" ? undefined : statusFilter);
  const { data: contacts = [] } = useContacts();
  const update = useUpdateOutbox();
  const generateDue = useGenerateDueSteps();

  const contactMap = useMemo(() => {
    const m = new Map<string, { name: string; email: string; phone: string }>();
    for (const c of contacts) m.set(c.id, { name: c.business_name || c.name, email: c.email, phone: c.phone });
    return m;
  }, [contacts]);

  const handleGenerate = async () => {
    try {
      const n = await generateDue.mutateAsync();
      toast({ title: n ? `Prepared ${n} due step${n === 1 ? "" : "s"}` : "Nothing due right now" });
    } catch (e: any) {
      toast({ title: "Unable to generate", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Outreach Outbox" icon={Inbox}>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft" className="text-xs">Drafts</SelectItem>
              <SelectItem value="approved" className="text-xs">Approved</SelectItem>
              <SelectItem value="sent" className="text-xs">Sent</SelectItem>
              <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
              <SelectItem value="all" className="text-xs">All</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={handleGenerate} disabled={!canEdit || generateDue.isPending}>
            <RefreshCw className="mr-1 h-4 w-4" /> Generate Due Outreach
          </Button>
        </div>
      </AdminPageHeader>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {drafts.map((d) => (
          <OutboxCard key={d.id} draft={d} contact={contactMap.get(d.contact_id)} onUpdate={update.mutateAsync} />
        ))}
      </div>

      {isLoading ? <p className="text-xs text-muted-foreground">Loading outbox…</p> : null}
      {loadError && <p role="alert" className="text-sm text-destructive">Unable to load outreach: {loadError.message}</p>}
      {!isLoading && !loadError && drafts.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No messages in this view. <Link to="/admin/crm/dashboard" className="underline">Start guided outreach</Link> to prepare a reviewed email for a contact. Existing cadence drafts can still be prepared with “Generate Due Outreach”.
        </p>
      ) : null}
    </div>
  );
};

interface OutboxCardProps {
  draft: OutboxDraft;
  contact?: { name: string; email: string; phone: string };
  onUpdate: (args: { id: string; patch: Partial<OutboxDraft> }) => Promise<unknown>;
}

const OutboxCard = ({ draft, contact, onUpdate }: OutboxCardProps) => {
  const { toast } = useToast();
  const { canEdit } = useAdminRole();
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [body, setBody] = useState(draft.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = subject !== (draft.subject ?? "") || body !== (draft.body ?? "");
  const editable = canEdit && (draft.status === "draft" || draft.status === "approved");
  const gate = useMemo(
    () => (editable ? checkOutreachDraft({ subject, body }, draft.channel === "whatsapp" ? "whatsapp" : "email") : null),
    [editable, subject, body, draft.channel],
  );

  const save = async () => {
    await onUpdate({ id: draft.id, patch: { subject, body, status: "draft" } });
    toast({ title: "Draft saved" });
  };

  const setStatus = async (status: OutboxDraft["status"]) => {
    await onUpdate({ id: draft.id, patch: { status, subject, body, ...(status === "sent" ? { sent_at: new Date().toISOString() } : {}) } });
  };
  const act = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const waLink = () => {
    const phone = (contact?.phone ?? "").replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
  };
  const mailLink = () =>
    `mailto:${parseContactEmails(contact?.email ?? "").map(encodeURIComponent).join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const readyToSend = draft.generated_by !== "practice" && draft.status === "approved" && !dirty && gate?.ok;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1 truncate">
            {draft.channel === "whatsapp" ? <MessageCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            {contact?.name ?? "Unknown contact"}
          </span>
          <Badge variant={draft.status === "sent" ? "default" : draft.status === "rejected" ? "destructive" : "outline"}>
            {draft.status}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {draft.channel === "email" ? (
          <Input aria-label="Email subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="h-8 text-xs" disabled={!editable || busy} />
        ) : null}
        <Textarea aria-label="Outreach message" value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="text-xs" disabled={!editable || busy} />
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        {draft.generated_by === "practice" && <p className="text-sm font-medium">Practice draft. Rehearse in guided outreach; this message cannot be sent from Outbox.</p>}
        <Button variant="link" size="sm" asChild><Link to={`${outreachLink(draft.contact_id, draft.generated_by === "practice")}&draft=${encodeURIComponent(draft.id)}`}>Continue in guided outreach</Link></Button>

        {gate && !gate.ok ? (
          <ul className="space-y-0.5 rounded border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-900 dark:text-amber-200" aria-label="Draft quality warnings">
            {gate.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        ) : null}

        <fieldset disabled={busy} className="flex flex-wrap gap-1">
          {editable ? (
            <>
              {dirty ? (
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => void act(save)}>Save</Button>
              ) : null}
              {draft.status === "draft" || dirty ? (
                <Button size="sm" variant="outline" className="h-7 text-[11px]" disabled={!gate?.ok} onClick={() => void act(async () => { await setStatus("approved"); })}>
                  <Check className="mr-1 h-3 w-3" /> Approve
                </Button>
              ) : null}
              {draft.channel === "whatsapp" ? (
                <Button size="sm" className="h-7 text-[11px]" onClick={() => window.open(waLink(), "_blank", "noopener,noreferrer")} disabled={!contact?.phone || !readyToSend}>
                  <Send className="mr-1 h-3 w-3" /> WhatsApp
                </Button>
              ) : (
                <>
                  <Button size="sm" className="h-7 text-[11px]" onClick={() => { window.location.href = mailLink(); }} disabled={!contact?.email || !readyToSend}>
                    <Send className="mr-1 h-3 w-3" /> Open email app
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={() => void act(async () => {
                      await navigator.clipboard.writeText(`${subject ? subject + "\n\n" : ""}${body}`);
                      toast({ title: "Copied" });
                    })}
                  >
                    <Copy className="mr-1 h-3 w-3" /> Copy
                  </Button>
                </>
              )}
              {readyToSend && <OutreachConfirmButton size="sm" variant="outline" className="h-7 text-[11px]" title="Record this message as sent?" description="Confirm that you actually sent this message outside the CRM. Opening a composer does not send it." confirmLabel="Yes, record the send" onConfirm={() => void act(async () => {
                await setStatus("sent"); toast({ title: "Send recorded" });
              })}>I sent it — record send</OutreachConfirmButton>}
              <Button aria-label="Reject outreach draft" size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-muted-foreground" onClick={() => void act(async () => { await setStatus("rejected"); })}>
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {draft.sent_at ? `Sent ${new Date(draft.sent_at).toLocaleString()}` : draft.status}
            </span>
          )}
        </fieldset>
        {editable && <p className="text-[11px] text-muted-foreground">Opening a composer does not mark this message sent. Confirm the send after sending it.</p>}
      </CardContent>
    </Card>
  );
};

export default CrmOutboxPage;
