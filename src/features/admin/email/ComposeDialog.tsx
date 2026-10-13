import { useRef, useState } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fileToAttachment, type EmailAccount, type OutgoingAttachment } from "@/lib/emailBridge";
import { useSendEmail } from "./useEmail";
import { RecipientInput } from "./RecipientInput";
import { invalidRecipients } from "./recipients";
import { EMPTY_DRAFT, formatBytes, type ComposeDraft } from "./format";

const MAX_BYTES = 20 * 1024 * 1024;

export function ComposeDialog({
  draft,
  accounts,
  onClose,
}: {
  draft: ComposeDraft | null;
  accounts: EmailAccount[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const send = useSendEmail();
  // The page remounts this dialog (key) for every new draft.
  const [form, setForm] = useState<ComposeDraft>(draft ?? EMPTY_DRAFT);
  const fileInput = useRef<HTMLInputElement>(null);
  const from = accounts.find((account) => account.code === form.account) ?? accounts[0];
  const canSend = Boolean(from?.canSend);

  const totalBytes = form.attachments.reduce((sum, file) => sum + file.size, 0);
  const tooLarge = totalBytes > MAX_BYTES;
  const invalid = [...invalidRecipients(form.to), ...invalidRecipients(form.cc)];

  const handleSend = async () => {
    try {
      const attachments: OutgoingAttachment[] = await Promise.all(form.attachments.map(fileToAttachment));
      const result = await send.mutateAsync({
        account: from.code,
        to: form.to,
        cc: form.cc || undefined,
        subject: form.subject,
        text: form.text,
        reply_to_message_id: form.replyToMessageId,
        attachments,
      });
      toast({ title: "Sent", description: result.savedToSent ? "A copy is in Sent Items and the CRM history." : "Sent, but the copy could not be saved to Sent Items." });
      onClose();
    } catch (error) {
      toast({ title: "Not sent", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  return (
    <Dialog open={draft !== null} onOpenChange={(open) => { if (!open && !send.isPending) onClose(); }}>
      <DialogContent
        className="max-w-3xl grid-cols-[minmax(0,1fr)] gap-3"
        // Escape first closes an open recipient suggestion list.
        onEscapeKeyDown={(event) => { if ((event.target as HTMLElement | null)?.getAttribute?.("aria-expanded") === "true") event.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>{form.replyToMessageId ? "Reply" : "New mail"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2 text-sm">
          <div className="flex items-center gap-2 text-xs text-[hsl(var(--admin-muted-fg))]">
            <span className="w-14 shrink-0">From</span>
            <Select value={from?.code} onValueChange={(code) => setForm({ ...form, account: code })}>
              <SelectTrigger id="compose-from" className="h-8 min-w-0 flex-1 text-[hsl(var(--admin-content-fg))] sm:w-auto sm:min-w-64 sm:flex-none"><SelectValue /></SelectTrigger>
              <SelectContent>
                {accounts.map((account) => <SelectItem key={account.code} value={account.code}>{account.displayName} &lt;{account.address}&gt;</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="compose-to" className="w-14 shrink-0 text-xs text-[hsl(var(--admin-muted-fg))]">To</label>
            <RecipientInput id="compose-to" label="To" value={form.to} onChange={(to) => setForm((current) => ({ ...current, to }))} placeholder="Search CRM contacts or type an address" />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="compose-cc" className="w-14 shrink-0 text-xs text-[hsl(var(--admin-muted-fg))]">Cc</label>
            <RecipientInput id="compose-cc" label="Cc" value={form.cc} onChange={(cc) => setForm((current) => ({ ...current, cc }))} />
          </div>
          <Input id="compose-subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Add a subject" />
          <Textarea id="compose-body" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={14} className="font-[Calibri,'Segoe_UI',sans-serif] text-[15px]" />
          {form.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.attachments.map((file, index) => (
                <span key={`${file.name}-${index}`} className="inline-flex items-center gap-1 rounded border border-[hsl(var(--admin-border))] px-2 py-1 text-xs">
                  <Paperclip className="h-3 w-3" /> {file.name} <span className="text-[hsl(var(--admin-muted-fg))]">{formatBytes(file.size)}</span>
                  <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setForm({ ...form, attachments: form.attachments.filter((_, i) => i !== index) })}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {invalid.length > 0 && <p className="text-xs text-destructive">Fix or remove {invalid.length === 1 ? "this address" : "these addresses"}: {invalid.join(", ")}</p>}
          {tooLarge && <p className="text-xs text-destructive">Attachments total {formatBytes(totalBytes)}. The limit is 20 MB.</p>}
          {!canSend && <p className="text-xs text-destructive">{from ? `${from.address} can't send yet: its outgoing (SMTP) server isn't set on the bridge.` : "Connect a mailbox to send email."}</p>}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <input
              ref={fileInput}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setForm((current) => ({ ...current, attachments: [...current.attachments, ...files] }));
                e.target.value = "";
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
              <Paperclip className="mr-1 h-4 w-4" /> Attach file
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={send.isPending}>Discard</Button>
            <Button type="button" size="sm" onClick={handleSend} disabled={!canSend || tooLarge || invalid.length > 0 || send.isPending || !form.to.trim()}>
              <Send className="mr-1 h-4 w-4" /> {send.isPending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
