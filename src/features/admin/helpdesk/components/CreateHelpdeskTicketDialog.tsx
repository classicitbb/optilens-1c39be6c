import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ContactPickerSelect from "@/components/admin/ContactPickerSelect";
import InlineDictationButton from "@/components/admin/InlineDictationButton";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useCreateHelpdeskTicket";
import { useToast } from "@/hooks/use-toast";
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
}

const EMPTY_TEAMS: TeamOption[] = [];
const EMPTY_STAGES: StageOption[] = [];
const EMPTY_TICKET_TYPES: TicketTypeOption[] = [];
const EMPTY_PRIORITIES: PriorityOption[] = [];

export default function CreateHelpdeskTicketDialog({ open, onOpenChange }: CreateHelpdeskTicketDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const createTicket = useCreateHelpdeskTicket();
  const titleRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    teamId: "",
    stageId: "",
    priority: "1",
    contactId: "",
    ticketTypeId: "",
    dueDate: "",
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

  useEffect(() => {
    if (!open) return;

    setForm({
      title: "",
      description: "",
      teamId: "",
      stageId: stages.find((stage) => !stage.is_closed)?.id ?? "",
      priority: priorities.length > 0 ? String(priorities[0].level) : "1",
      contactId: "",
      ticketTypeId: "",
      dueDate: "",
    });
    const focusTimer = window.setTimeout(() => titleRef.current?.focus(), 80);
    return () => window.clearTimeout(focusTimer);
  }, [open, priorities, stages]);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast({ title: "Ticket title is required", variant: "destructive" });
      titleRef.current?.focus();
      return;
    }

    try {
      await createTicket.mutateAsync({
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
      });
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
            <Input ref={titleRef} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ticket title" className="h-8 text-xs" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Contact</Label>
            <ContactPickerSelect value={form.contactId} onValueChange={(contactId) => setForm((current) => ({ ...current, contactId }))} placeholder="Contact" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <div className="relative">
              <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Brief description" className="min-h-[96px] pr-11 text-xs" />
              <InlineDictationButton ariaLabel="Dictate ticket description" onValueChange={(description) => setForm((current) => ({ ...current, description }))} vocabulary="Classic Visions, Helpdesk, ticket, customer, Innovations, ERP, lens" />
            </div>
          </div>

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

          <Button size="sm" className="h-9 w-full text-xs" onClick={() => void handleCreate()} disabled={createTicket.isPending}>
            {createTicket.isPending ? "Creating…" : "Create Ticket"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
