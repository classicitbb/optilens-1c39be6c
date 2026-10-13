import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { EmailAccount, EmailSignature } from "@/lib/emailBridge";
import { useSignatureMutations, useSignatures } from "./useEmail";
import { EmailEditor } from "./EmailEditor";
import { sanitizeEmailHtml } from "./emailHtml";
import { SignaturePreview } from "./SignaturePreview";

type Draft = { id?: number; name: string; html: string; isDefault: boolean; mode: "formatted" | "html" };

// Layouts the formatted editor can't hold (Doc Studio signatures are tables).
const needsHtmlMode = (html: string) => /<(table|td|div[^>]*style)/i.test(html);

/** Saved signatures for one mailbox; compose picks the default automatically. Owner or admin only. */
export function SignatureManager({ account }: { account: EmailAccount }) {
  const { toast } = useToast();
  const { data: signatures = [], isError } = useSignatures(account.code);
  const { save, remove } = useSignatureMutations(account.code);
  const [draft, setDraft] = useState<Draft | null>(null);
  // Remounts the formatted editor when switching back from HTML.
  const [editorKey, setEditorKey] = useState(0);

  const edit = (signature?: EmailSignature) => {
    const html = signature?.body_html ?? "";
    setDraft({ id: signature?.signature_id, name: signature?.name ?? "", html, isDefault: signature ? signature.is_default : signatures.length === 0, mode: needsHtmlMode(html) ? "html" : "formatted" });
    setEditorKey((key) => key + 1);
  };

  const run = async (label: string, action: () => Promise<unknown>) => {
    try {
      await action();
      toast({ title: label });
      return true;
    } catch (error) {
      toast({ title: "That didn't work", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
      return false;
    }
  };

  if (isError) return <p className="text-xs text-[hsl(var(--admin-muted-fg))]">Signatures need the latest office bridge update.</p>;

  return (
    <section className="grid gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--admin-muted-fg))]">Signatures</h3>
      {!draft ? (
        <>
          {signatures.length ? (
            <ul className="grid gap-1">
              {signatures.map((signature) => (
                <li key={signature.signature_id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate">{signature.name} {signature.is_default ? <Badge variant="secondary" className="ml-1">Default</Badge> : null}</span>
                  <span className="flex shrink-0">
                    <Button size="sm" variant="ghost" className="h-7" aria-label={`Edit ${signature.name}`} onClick={() => edit(signature)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7" aria-label={`Delete ${signature.name}`}
                      onClick={() => run("Signature deleted", () => remove.mutateAsync(signature.signature_id))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[hsl(var(--admin-muted-fg))]">No signatures yet. The default one is added to every new email from this mailbox.</p>
          )}
          <Button size="sm" variant="outline" className="justify-self-start" onClick={() => edit()}><Plus className="mr-1 h-4 w-4" /> New signature</Button>
        </>
      ) : (
        <form
          className="grid gap-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const saved = await run(draft.id ? "Signature saved" : "Signature added", () =>
              save.mutateAsync({ signature_id: draft.id, name: draft.name, html: sanitizeEmailHtml(draft.html), is_default: draft.isDefault }));
            if (saved) setDraft(null);
          }}
        >
          <Input id="signature-name" aria-label="Signature name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name, e.g. Standard" />
          <div className="flex gap-1 text-xs" role="tablist" aria-label="Signature editor">
            {(["formatted", "html"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={draft.mode === mode}
                className={cn("rounded px-2 py-1", draft.mode === mode ? "bg-[hsl(var(--admin-accent))]/10 font-semibold" : "text-[hsl(var(--admin-muted-fg))]")}
                onClick={() => {
                  setDraft({ ...draft, mode });
                  if (mode === "formatted") setEditorKey((key) => key + 1);
                }}
              >
                {mode === "formatted" ? "Formatted" : "HTML (paste from Doc Studio)"}
              </button>
            ))}
          </div>
          {draft.mode === "formatted" ? (
            <>
              {needsHtmlMode(draft.html) ? <p className="text-xs text-[hsl(var(--admin-muted-fg))]">This signature uses a table layout, which only the HTML tab keeps. Editing here simplifies it.</p> : null}
              <EmailEditor key={editorKey} initialHtml={draft.html} onChange={(html) => setDraft((current) => (current ? { ...current, html } : current))} label="Signature" placeholder="Name, title, phone…" compact />
            </>
          ) : (
            <>
              <Textarea id="signature-html" aria-label="Signature HTML" value={draft.html} onChange={(e) => setDraft({ ...draft, html: e.target.value })} rows={6} className="font-mono text-xs" />
              <SignaturePreview html={draft.html} />
            </>
          )}
          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={draft.isDefault} onCheckedChange={(checked) => setDraft({ ...draft, isDefault: checked === true })} />
            Default for {account.address}
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={!draft.name.trim() || !draft.html.replace(/<[^>]*>/g, "").trim() && !/<img/i.test(draft.html) || save.isPending}>Save signature</Button>
          </div>
        </form>
      )}
    </section>
  );
}
