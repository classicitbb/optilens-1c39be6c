import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { helpdeskAttachmentQueryKeys } from "@/features/admin/helpdesk/hooks/useHelpdeskAttachments";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ContactPickerSelect from "@/components/admin/ContactPickerSelect";
import InlineDictationButton from "@/components/admin/InlineDictationButton";
import TidySuggestionChip from "@/components/admin/TidySuggestionChip";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useCreateHelpdeskTicket";
import { useToast } from "@/hooks/use-toast";
import { HelpdeskImageAttachments } from "@/components/account/HelpdeskImageAttachments";
import { uploadHelpdeskFiles } from "@/lib/helpdeskAttachments";
import { supabase } from "@/integrations/supabase/client";

interface TeamOption {
  id: string;
  name: string;
}

interface StageOption {
  id: string;
  name: string;
  is_closed: boolean;
}

interface TicketTypeOption {
  id: string;
  name: string;
}

interface PriorityOption {
  level: number;
  label: string;
}

interface CreateHelpdeskTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selects the initial stage (e.g. the kanban column the "+" was clicked in). */
  defaultStageId?: string;
  /** Pre-fills the form each time the dialog opens (e.g. a question raised from an order). */
  initialValues?: { title?: string; description?: string; contactId?: string; notifyContacts?: boolean };
  onCreated?: (ticketId: string) => void;
}

const EMPTY_TEAMS: TeamOption[] = [];
const EMPTY_STAGES: StageOption[] = [];
const EMPTY_TICKET_TYPES: TicketTypeOption[] = [];
const EMPTY_PRIORITIES: PriorityOption[] = [];

// ── localStorage helpers for "last two consistent creations" ──
const HISTORY_KEY = "helpdesk_create_history";

interface CreateSnapshot {
  teamId: string;
  stageId: string;
  priority: string;
  ticketTypeId: string;
}

function loadHistory(): CreateSnapshot[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as CreateSnapshot[]).slice(0, 2) : [];
  } catch { return []; }
}

function pushHistory(snapshot: CreateSnapshot) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([snapshot, ...loadHistory()].slice(0, 2)));
  } catch { /* storage unavailable: defaults just won't be remembered */ }
}

/** If the last two creations share the same value for a field, return it. */
function consistentDefault(field: keyof CreateSnapshot): string | undefined {
  const hist = loadHistory();
  if (hist.length < 2) return hist[0]?.[field] || undefined;
  return hist[0][field] === hist[1][field] ? hist[0][field] || undefined : undefined;
}

export default function CreateHelpdeskTicketDialog({ open, onOpenChange, defaultStageId, initialValues, onCreated }: CreateHelpdeskTicketDialogProps) {
  const initialTitle = initialValues?.title ?? "";
  const initialDescription = initialValues?.description ?? "";
  const initialContactId = initialValues?.contactId ?? "";
  const initialNotify = initialValues?.notifyContacts ?? false;
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const createTicket = useCreateHelpdeskTicket();
  const titleRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    teamId: "",
    stageId: "",
    priority: "1",
    contactId: "",
    ticketTypeId: "",
    dueDate: "",
    notifyContacts: false,
  });

  const { data: teams = EMPTY_TEAMS } = useQuery({
    queryKey: ["helpdesk", "teams", "options"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_teams").select("id,name").eq("is_active", true).order("name");
      if (error) throw error;
      return (data ?? []) as TeamOption[];
    },
  });

  const { data: stages = EMPTY_STAGES } = useQuery({
    queryKey: ["helpdesk", "stages", "options"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_ticket_stages").select("id,name,is_closed").order("sequence");
      if (error) throw error;
      return (data ?? []) as StageOption[];
    },
  });

  const { data: ticketTypes = EMPTY_TICKET_TYPES } = useQuery({
    queryKey: ["helpdesk", "ticket-types", "options"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_ticket_types").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as TicketTypeOption[];
    },
  });

  const { data: priorities = EMPTY_PRIORITIES } = useQuery({
    queryKey: ["helpdesk", "priorities"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_priorities").select("level,label").eq("is_active", true).order("level");
      if (error) throw error;
      return (data ?? []) as PriorityOption[];
    },
  });

  // Who a ticket reaches: a company contact means the whole account, a person
  // contact means that person only (see helpdesk_contact_recipients).
  const { data: audience } = useQuery({
    queryKey: ["helpdesk", "ticket-audience", form.contactId],
    enabled: open && !!form.contactId,
    queryFn: async () => {
      const [{ data: contact, error: contactError }, { data: recipients, error: recipientsError }] = await Promise.all([
        (supabase as any).from("contacts").select("is_company").eq("id", form.contactId).maybeSingle(),
        (supabase.rpc as any)("helpdesk_contact_recipients", { p_contact_id: form.contactId }),
      ]);
      if (contactError) throw contactError;
      if (recipientsError) throw recipientsError;
      return {
        isCompany: !!contact?.is_company,
        recipients: (recipients ?? []) as Array<{ email: string; name: string | null }>,
      };
    },
  });

  useEffect(() => {
    if (!open) return;

    setFiles([]);
    setForm({
      title: initialTitle,
      description: initialDescription,
      teamId: consistentDefault("teamId") ?? "",
      stageId: defaultStageId ?? consistentDefault("stageId") ?? stages.find((stage) => !stage.is_closed)?.id ?? "",
      priority: consistentDefault("priority") ?? (priorities.length > 0 ? String(priorities[0].level) : "1"),
      contactId: initialContactId,
      ticketTypeId: consistentDefault("ticketTypeId") ?? "",
      dueDate: "",
      notifyContacts: initialNotify,
    });
    const focusTimer = window.setTimeout(() => titleRef.current?.focus(), 80);
    return () => window.clearTimeout(focusTimer);
  }, [open, priorities, stages, defaultStageId, initialTitle, initialDescription, initialContactId, initialNotify]);

  const handleCreate = async () => {
    if (createTicket.isPending) return;
    if (!form.title.trim()) {
      toast({ title: "Ticket title is required", variant: "destructive" });
      titleRef.current?.focus();
      return;
    }

    try {
      const ticketId = await createTicket.mutateAsync({
        title: form.title,
        description: form.description,
        teamId: form.teamId || null,
        stageId: form.stageId || null,
        priority: Number(form.priority),
        ownerUserId: user?.id ?? null,
        partnerContactId: form.contactId || null,
        ticketTypeId: form.ticketTypeId || null,
        deadline: form.dueDate ? new Date(`${form.dueDate}T00:00:00`).toISOString() : null,
        sourceChannel: "manual",
        notifyContact: !!form.contactId && form.notifyContacts,
      });
      pushHistory({ teamId: form.teamId, stageId: form.stageId, priority: form.priority, ticketTypeId: form.ticketTypeId });
      onCreated?.(ticketId);
      if (files.length) {
        // The ticket exists already; report a failed upload without losing it.
        try {
          await uploadHelpdeskFiles(ticketId, files);
          qc.invalidateQueries({ queryKey: helpdeskAttachmentQueryKeys.list(ticketId) });
        } catch (uploadError) {
          toast({ title: "Ticket created, but attachments failed", description: (uploadError as Error).message, variant: "destructive" });
          onOpenChange(false);
          return;
        }
      }
      toast({ title: "Ticket created" });
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Unable to create ticket", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-tool admin-overlay-surface max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-center text-sm font-medium">Create Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select
              value={form.ticketTypeId || "__none"}
              onValueChange={(value) => {
                const ticketTypeId = value === "__none" ? "" : value;
                const typeName = ticketTypes.find((type) => type.id === ticketTypeId)?.name ?? "";
                setForm((current) => ({
                  ...current,
                  ticketTypeId,
                  title: !current.title.trim() && typeName ? typeName : current.title,
                  description: !current.description.trim() && typeName ? typeName : current.description,
                }));
              }}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">No type</SelectItem>
                {ticketTypes.map((type) => <SelectItem key={type.id} value={type.id} className="text-xs">{type.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Title *</Label>
            <div className="relative">
              <Input ref={titleRef} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ticket title" className="h-8 pr-10 text-xs" />
              <InlineDictationButton ariaLabel="Dictate ticket title" position="center" trimTrailingPeriod onValueChange={(title) => setForm((current) => ({ ...current, title }))} vocabulary="Classic Visions, Helpdesk, ticket, customer, Innovations, ERP, lens" />
            </div>
            <TidySuggestionChip kind="title" value={form.title} onApply={(title) => setForm((current) => ({ ...current, title }))} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Contact</Label>
            <ContactPickerSelect value={form.contactId} onValueChange={(contactId) => setForm((current) => ({ ...current, contactId }))} placeholder="Contact" />
            {form.contactId && audience ? (
              <p className="text-[11px] text-muted-foreground">
                {audience.isCompany
                  ? "Whole account: every contact and portal user of this company can see it."
                  : "Only this person can see it; colleagues at their company cannot."}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="helpdesk-notify-contacts"
                checked={form.notifyContacts}
                disabled={!form.contactId}
                onCheckedChange={(checked) => setForm((current) => ({ ...current, notifyContacts: checked === true }))}
              />
              <Label htmlFor="helpdesk-notify-contacts" className="text-xs">Notify contact{audience?.isCompany ? "s" : ""} by email</Label>
            </div>
            {form.contactId && form.notifyContacts && audience ? (
              <p className="text-[11px] text-muted-foreground">
                {audience.recipients.length
                  ? `Emails ${audience.recipients.map((recipient) => recipient.name || recipient.email).join(", ")}. The title goes in the subject; details stay behind sign-in.`
                  : "No email address on file for this contact, so no email will be sent."}
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <div className="relative">
              <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Brief description" className="min-h-[96px] pb-9 pr-11 text-xs" />
              <InlineDictationButton ariaLabel="Dictate ticket description" onValueChange={(description) => setForm((current) => ({ ...current, description }))} vocabulary="Classic Visions, Helpdesk, ticket, customer, Innovations, ERP, lens" />
              <TidySuggestionChip value={form.description} onApply={(description) => setForm((current) => ({ ...current, description }))} className="absolute bottom-1.5 left-2 z-10" />
            </div>
          </div>

          <HelpdeskImageAttachments key={String(open)} ticketId="" attachments={[]} onFilesChange={setFiles} disabled={createTicket.isPending} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Team</Label>
              <Select value={form.teamId || "__none"} onValueChange={(value) => setForm((current) => ({ ...current, teamId: value === "__none" ? "" : value }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">No team</SelectItem>
                  {teams.map((team) => <SelectItem key={team.id} value={team.id} className="text-xs">{team.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select value={form.priority} onValueChange={(priority) => setForm((current) => ({ ...current, priority }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => <SelectItem key={priority.level} value={String(priority.level)} className="text-xs">{priority.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Initial Stage</Label>
              <Select value={form.stageId || "__none"} onValueChange={(value) => setForm((current) => ({ ...current, stageId: value === "__none" ? "" : value }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">No stage</SelectItem>
                  {stages.map((stage) => <SelectItem key={stage.id} value={stage.id} className="text-xs">{stage.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} className="h-8 text-xs" />
            </div>
          </div>

          {/* aria-disabled, not disabled: a disabled focused button drops focus to <body>, which a parent dialog treats as a dismiss. */}
          <Button size="sm" className="h-9 w-full text-xs" onClick={() => void handleCreate()} aria-disabled={createTicket.isPending}>
            {createTicket.isPending ? "Creating…" : "Create Ticket"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
