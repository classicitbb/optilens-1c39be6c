import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyPublicCard,
  fetchStaffPublicCard,
  getPublicCardPath,
  saveStaffPublicCard,
  slugifyPublicCard,
  type StaffPublicCardDefaults,
  type StaffPublicCardDraft,
} from "@/features/staff-cards/staffPublicCards";
import { useToast } from "@/hooks/use-toast";

const toDraft = (card: StaffPublicCardDraft | null, defaults: StaffPublicCardDefaults) => card ?? emptyPublicCard(defaults);

export const StaffPublicCardEditorDialog = ({ open, onOpenChange, userId, defaults = {}, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  defaults?: StaffPublicCardDefaults;
  onSaved?: () => void;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const cardQuery = useQuery({
    queryKey: ["staff-public-card", userId],
    enabled: open && Boolean(userId),
    queryFn: () => fetchStaffPublicCard(userId),
  });
  const [draft, setDraft] = useState<StaffPublicCardDraft>(() => emptyPublicCard(defaults));

  useEffect(() => {
    if (open && !cardQuery.isLoading) setDraft(toDraft(cardQuery.data, defaults));
  }, [open, cardQuery.data, cardQuery.isLoading, defaults]);

  const save = useMutation({
    mutationFn: () => saveStaffPublicCard(userId, draft),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["staff-public-card", userId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: draft.is_published ? "Public card published" : "Networking card saved" });
      onSaved?.();
      onOpenChange(false);
    },
    onError: (error: Error) => toast({ title: "Could not save public card", description: error.message, variant: "destructive" }),
  });

  const set = <K extends keyof StaffPublicCardDraft>(key: K, value: StaffPublicCardDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setDisplayName = (value: string) => setDraft((current) => ({
    ...current,
    display_name: value,
    slug: current.slug === slugifyPublicCard(current.display_name) || !current.slug ? slugifyPublicCard(value) : current.slug,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Public networking card</DialogTitle>
          <DialogDescription>Only these fields become public when Publish is on. Private account and CRM data remain separate.</DialogDescription>
        </DialogHeader>
        {cardQuery.isLoading ? <div className="grid min-h-52 place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <Field label="Public name" required><Input value={draft.display_name} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} /></Field>
            <Field label="Public URL" hint={`classicvisions.net${getPublicCardPath(draft.slug || "your-name")}`}><Input value={draft.slug} onChange={(event) => set("slug", slugifyPublicCard(event.target.value))} maxLength={80} /></Field>
            <Field label="Title"><Input value={draft.title ?? ""} onChange={(event) => set("title", event.target.value)} placeholder="Sales Director" maxLength={160} /></Field>
            <Field label="Organization"><Input value={draft.organization_name ?? ""} onChange={(event) => set("organization_name", event.target.value)} maxLength={160} /></Field>
            <Field label="Public email"><Input type="email" value={draft.email ?? ""} onChange={(event) => set("email", event.target.value)} placeholder="name@classicvisions.net" /></Field>
            <Field label="Phone"><Input type="tel" value={draft.phone ?? ""} onChange={(event) => set("phone", event.target.value)} /></Field>
            <Field label="WhatsApp number" hint="Include country code"><Input type="tel" value={draft.whatsapp_phone ?? ""} onChange={(event) => set("whatsapp_phone", event.target.value)} placeholder="+1 246 555 1234" /></Field>
            <Field label="Photo URL"><Input type="url" value={draft.avatar_url ?? ""} onChange={(event) => set("avatar_url", event.target.value)} placeholder="https://…" /></Field>
            <Field label="LinkedIn URL"><Input type="url" value={draft.linkedin_url ?? ""} onChange={(event) => set("linkedin_url", event.target.value)} placeholder="https://linkedin.com/in/…" /></Field>
            <Field label="Website URL"><Input type="url" value={draft.website_url ?? ""} onChange={(event) => set("website_url", event.target.value)} placeholder="https://…" /></Field>
            <div className="sm:col-span-2"><Field label="Short bio"><Textarea value={draft.bio ?? ""} onChange={(event) => set("bio", event.target.value)} maxLength={600} placeholder="How you help customers and partners." /></Field></div>
            <div className="sm:col-span-2"><Field label="Skills" hint="Separate skills with commas"><Input value={draft.skills.join(", ")} onChange={(event) => set("skills", event.target.value.split(","))} placeholder="Optical dispensing, Account management, Lens technology" /></Field></div>
            <div className="sm:col-span-2 flex items-center justify-between rounded-xl border bg-muted/20 p-4">
              <div><Label htmlFor="publish-card">Publish this card</Label><p className="mt-1 text-xs text-muted-foreground">Anyone with the public link or QR code can see the contact details above.</p></div>
              <Switch id="publish-card" checked={draft.is_published} onCheckedChange={(checked) => set("is_published", checked)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={() => save.mutate()} disabled={cardQuery.isLoading || save.isPending}><Save className="mr-2 h-4 w-4" />{save.isPending ? "Saving…" : "Save card"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) => (
  <div className="grid gap-1.5"><Label>{label}{required ? " *" : ""}</Label>{children}{hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}</div>
);
