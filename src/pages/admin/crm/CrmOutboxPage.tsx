import { useMemo, useState } from "react";
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

type StatusFilter = OutboxDraft["status"] | "all";

const CrmOutboxPage = () => {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("draft");
  const { data: drafts = [], isLoading } = useOutbox(statusFilter === "all" ? undefined : statusFilter);
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
          <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generateDue.isPending}>
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
      {!isLoading && drafts.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nothing here. Enrol contacts in a cadence from the pipeline, then “Generate Due Outreach”.
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
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [body, setBody] = useState(draft.body ?? "");
  const dirty = subject !== (draft.subject ?? "") || body !== (draft.body ?? "");
  const editable = draft.status === "draft" || draft.status === "approved";

  const save = async () => {
    await onUpdate({ id: draft.id, patch: { subject, body } });
    toast({ title: "Draft saved" });
  };

  const setStatus = async (status: OutboxDraft["status"]) => {
    await onUpdate({ id: draft.id, patch: { status, ...(status === "sent" ? { sent_at: new Date().toISOString() } : {}) } });
  };

  const waLink = () => {
    const phone = (contact?.phone ?? "").replace(/\D/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
  };
  const mailLink = () =>
    `mailto:${contact?.email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const markAndSend = async (href: string) => {
    if (dirty) await save();
    window.open(href, "_blank");
    await setStatus("sent");
    toast({ title: "Marked sent" });
  };

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
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="h-8 text-xs" disabled={!editable} />
        ) : null}
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="text-xs" disabled={!editable} />

        <div className="flex flex-wrap gap-1">
          {editable ? (
            <>
              {dirty ? (
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={save}>Save</Button>
              ) : null}
              {draft.status === "draft" ? (
                <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setStatus("approved")}>
                  <Check className="mr-1 h-3 w-3" /> Approve
                </Button>
              ) : null}
              {draft.channel === "whatsapp" ? (
                <Button size="sm" className="h-7 text-[11px]" onClick={() => markAndSend(waLink())} disabled={!contact?.phone}>
                  <Send className="mr-1 h-3 w-3" /> WhatsApp
                </Button>
              ) : (
                <>
                  <Button size="sm" className="h-7 text-[11px]" onClick={() => markAndSend(mailLink())} disabled={!contact?.email}>
                    <Send className="mr-1 h-3 w-3" /> Email
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={() => {
                      navigator.clipboard.writeText(`${subject ? subject + "\n\n" : ""}${body}`);
                      toast({ title: "Copied" });
                    }}
                  >
                    <Copy className="mr-1 h-3 w-3" /> Copy
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-muted-foreground" onClick={() => setStatus("rejected")}>
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              {draft.sent_at ? `Sent ${new Date(draft.sent_at).toLocaleString()}` : draft.status}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CrmOutboxPage;
