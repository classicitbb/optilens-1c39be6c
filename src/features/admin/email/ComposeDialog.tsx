import { useRef, useState } from "react";
import { ChevronDown, ChevronRight, Paperclip, Send, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fileToAttachment, type EmailAccount, type OutgoingAttachment } from "@/lib/emailBridge";
import { useSendEmail, useSignatures } from "./useEmail";
import { EmailEditor } from "./EmailEditor";
import { buildOutgoingEmail, textToHtml } from "./emailHtml";
import { SignaturePreview } from "./SignaturePreview";
import { RecipientInput } from "./RecipientInput";
import { invalidRecipients } from "./recipients";
import { EMPTY_DRAFT, formatBytes, type ComposeDraft } from "./format";

const MAX_BYTES = 20 * 1024 * 1024;

const NO_SIGNATURE = "none";

export function ComposeDialog({
  draft,
  accounts,
  onClose,
  onManageSignatures,
}: {
  draft: ComposeDraft | null;
  accounts: EmailAccount[];
  onClose: () => void;
  onManageSignatures: (account: EmailAccount) => void;
}) {
  const { toast } = useToast();
  const send = useSendEmail();
  // The page remounts this dialog (key) for every new draft.
  const [form, setForm] = useState<ComposeDraft>(draft ?? EMPTY_DRAFT);
  const [initialBody] = useState(() => textToHtml(draft?.text ?? ""));
  const [bodyHtml, setBodyHtml] = useState(initialBody);
  const [showQuoted, setShowQuoted] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const from = accounts.find((account) => account.code === form.account) ?? accounts[0];
  const canSend = Boolean(from?.canSend);

  // Each mailbox has its own signatures; its default is picked until the user chooses another.
  const { data: signatures = [] } = useSignatures(from?.code);
  const [signatureChoice, setSignatureChoice] = useState<{ account: string; id: string } | null>(null);
  const signatureId = signatureChoice && signatureChoice.account === from?.code
    ? signatureChoice.id
    : String(signatures.find((signature) => signature.is_default)?.signature_id ?? NO_SIGNATURE);
  const signature = signatures.find((item) => String(item.signature_id) === signatureId) ?? null;

  const totalBytes = form.attachments.reduce((sum, file) => sum + file.size, 0);
  const tooLarge = totalBytes > MAX_BYTES;
  const invalid = [...invalidRecipients(form.to), ...invalidRecipients(form.cc)];

  const handleSend = async () => {
    try {
      const attachments: OutgoingAttachment[] = await Promise.all(form.attachments.map(fileToAttachment));
      const body = buildOutgoingEmail({ bodyHtml, signatureHtml: signature?.body_html, quoted: form.quoted });
      const result = await send.mutateAsync({
        account: from.code,
        to: form.to,
        cc: form.cc || undefined,
        subject: form.subject,
        text: body.text,
        html: body.html,
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
        className="max-h-[94vh] max-w-3xl grid-cols-[minmax(0,1fr)] gap-3 overflow-y-auto"
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
          <EmailEditor initialHtml={initialBody} onChange={setBodyHtml} label="Message" placeholder="Write your message. Select text to format it." assist
            footer={signature ? <SignaturePreview html={signature.body_html} variant="inline" /> : null} />
          {signatures.length > 0 || from?.canManage ? (
            <div className="grid gap-1.5">
              <div className="flex items-center gap-2 text-xs text-[hsl(var(--admin-muted-fg))]">
                <span className="w-14 shrink-0">Signature</span>
                <Select
                  value={signatureId}
                  onValueChange={(id) => {
                    if (id === "manage") onManageSignatures(from);
                    else setSignatureChoice({ account: from.code, id });
                  }}
                >
                  <SelectTrigger id="compose-signature" className="h-8 w-auto min-w-40 text-[hsl(var(--admin-content-fg))]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SIGNATURE}>No signature</SelectItem>
                    {signatures.map((item) => (
                      <SelectItem key={item.signature_id} value={String(item.signature_id)}>{item.name}{item.is_default ? " (default)" : ""}</SelectItem>
                    ))}
                    {from?.canManage ? <SelectItem value="manage">Manage signatures…</SelectItem> : null}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          {form.quoted.trim() ? (
            <div className="text-xs">
              <button type="button" className="inline-flex items-center gap-1 text-[hsl(var(--admin-muted-fg))] hover:text-[hsl(var(--admin-content-fg))]" aria-expanded={showQuoted} onClick={() => setShowQuoted((value) => !value)}>
                {showQuoted ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                {form.replyToMessageId ? "Original message" : "Forwarded message"}
              </button>
              {showQuoted ? <div className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap border-l-2 border-[hsl(var(--admin-border))] pl-3 font-[Calibri,'Segoe_UI',sans-serif] text-[13px] text-[hsl(var(--admin-muted-fg))]">{form.quoted.trim()}</div> : null}
            </div>
          ) : null}
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
