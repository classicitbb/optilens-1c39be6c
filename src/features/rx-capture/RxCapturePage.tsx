// Staff capture: choose the customer, drop / pick / paste photos or documents of
// prescription sheets, and each becomes a draft Rx order to review in the form
// (with the original beside it). No voice, no queue to manage — a list of what was
// captured and what state it is in.
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerAccounts } from "@/hooks/useCustomerAccounts";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import RxForm from "@/features/rx-order/form/RxForm";
import { ACCEPT, extensionFor, isAcceptedFile, filesFromClipboard } from "./files";

interface Job {
  id: string;
  account_id: number | null;
  storage_path: string;
  file_name: string | null;
  mime_type: string;
  status: "queued" | "processing" | "ready" | "failed";
  error: string | null;
  draft: Record<string, unknown> | null;
  quote_id: string | null;
  created_at: string;
}

const jobs = () => supabase.from("rx_capture_jobs" as never) as any;

export default function RxCapturePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: accounts = [] } = useCustomerAccounts();
  const [accountId, setAccountId] = useState<number | null>(null);
  const [busy, setBusy] = useState(0);
  const [reviewing, setReviewing] = useState<Job | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const { data: list = [] } = useQuery<Job[]>({
    queryKey: ["rx-capture-jobs"],
    queryFn: async () => {
      const { data, error } = await jobs().select("*").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data as Job[];
    },
    // keep polling only while something is still being read
    refetchInterval: (q) => ((q.state.data as Job[] | undefined)?.some((j) => j.status === "queued" || j.status === "processing") ? 3000 : false),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["rx-capture-jobs"] });

  const upload = useCallback(async (files: File[]) => {
    if (!user) return;
    if (accountId === null) { toast({ title: "Choose the customer first", variant: "destructive" }); return; }
    const ok = files.filter(isAcceptedFile);
    if (ok.length < files.length) toast({ title: "Only photos and PDFs can be captured", description: `${files.length - ok.length} file(s) skipped.`, variant: "destructive" });
    setBusy((n) => n + ok.length);
    await Promise.all(ok.map(async (file) => {
      try {
        const path = `${user.id}/${crypto.randomUUID()}.${extensionFor(file)}`;
        const up = await supabase.storage.from("rx-captures").upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        const { data, error } = await jobs()
          .insert({ account_id: accountId, storage_path: path, file_name: file.name || null, mime_type: file.type })
          .select("id").single();
        if (error) throw error;
        void refresh();
        // reading happens in the background; the list shows its progress
        supabase.functions.invoke("rx-capture-extract", { body: { jobId: data.id } }).finally(refresh);
      } catch (e: any) {
        toast({ title: "Could not upload", description: e?.message, variant: "destructive" });
      } finally {
        setBusy((n) => n - 1);
      }
    }));
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accountId, toast]);

  // Ctrl+V anywhere on the page
  useEffect(() => {
    if (reviewing) return;
    const onPaste = (e: ClipboardEvent) => {
      const files = filesFromClipboard(e.clipboardData);
      if (files.length) { e.preventDefault(); void upload(files); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [upload, reviewing]);

  const remove = async (job: Job) => {
    await supabase.storage.from("rx-captures").remove([job.storage_path]);
    await jobs().delete().eq("id", job.id);
    void refresh();
  };

  if (reviewing) return <Review job={reviewing} accountName={accounts.find((a) => a.id === reviewing.account_id)?.name} onBack={() => { setReviewing(null); void refresh(); }} />;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4">
      <header>
        <h1 className="text-base font-semibold">Rx capture</h1>
        <p className="text-xs text-muted-foreground">Photograph or scan a prescription sheet. We read it into a draft order for you to check.</p>
      </header>

      <label className="block space-y-1.5 text-xs font-semibold">
        Customer
        <select
          className="h-9 w-full rounded-md border bg-background px-2 text-sm font-normal"
          value={accountId ?? ""} onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Choose a customer…</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.account_number ? ` · ${a.account_number}` : ""}</option>)}
        </select>
      </label>

      <div
        role="button" tabIndex={0} aria-disabled={accountId === null}
        onClick={() => accountId !== null && input.current?.click()}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && accountId !== null) input.current?.click(); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); void upload(Array.from(e.dataTransfer.files)); }}
        className={`flex flex-col items-center gap-1 rounded-xl border-2 border-dashed px-6 py-10 text-center text-sm ${accountId === null ? "opacity-50" : "cursor-pointer hover:bg-muted/40"}`}
      >
        {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
        <b>Drop photos or PDFs here</b>
        <span className="text-xs text-muted-foreground">or click to choose · or paste with Ctrl+V · phones: opens the camera</span>
      </div>
      <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { void upload(Array.from(e.target.files ?? [])); e.target.value = ""; }} />

      <section aria-label="Captures" className="space-y-2">
        {list.length === 0 && <p className="text-xs text-muted-foreground">Nothing captured yet.</p>}
        {list.map((j) => (
          <div key={j.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-xs">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <b className="block truncate">{accounts.find((a) => a.id === j.account_id)?.name ?? "—"}</b>
              <span className="text-muted-foreground">{new Date(j.created_at).toLocaleString()} · {j.file_name ?? "pasted image"}</span>
              {j.status === "failed" && <span className="block text-destructive">{j.error}</span>}
              {j.quote_id && <span className="block text-emerald-700">Saved as a draft order</span>}
            </div>
            {(j.status === "queued" || j.status === "processing") && <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Reading…</span>}
            {j.status === "ready" && <Button size="sm" className="h-7 text-xs" onClick={() => setReviewing(j)}>{j.quote_id ? "Open" : "Review"}</Button>}
            {j.status === "failed" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setReviewing(j)}>Open blank</Button>}
            <button type="button" aria-label="Delete this capture" title="Delete" className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => remove(j)}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}

/** The original beside the form; the form opens with what was read, flagged where unsure. */
function Review({ job, accountName, onBack }: { job: Job; accountName?: string; onBack: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(job.quote_id);
  const { data: quote } = useQuery({
    queryKey: ["rx-capture-review-quote", job.quote_id],
    enabled: !!job.quote_id,
    queryFn: async () => {
      const { data, error } = await (supabase.from("quotes") as any).select("id, rx_payload, notes_internal").eq("id", job.quote_id).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    let live = true;
    supabase.storage.from("rx-captures").createSignedUrl(job.storage_path, 3600).then(({ data }) => { if (live) setUrl(data?.signedUrl ?? null); });
    return () => { live = false; };
  }, [job.storage_path]);

  // First open: what was read. After it has been saved once: the saved quote, so edits are not lost.
  const prefill = job.quote_id
    ? quote?.rx_payload ?? null
    : job.draft ? { ...job.draft, account: job.account_id === null ? null : { id: job.account_id, name: accountName ?? "" } } : null;
  const waiting = !!job.quote_id && !quote;

  return (
    <div className="p-3">
      <Button variant="ghost" size="sm" className="mb-2 h-7 gap-1.5 text-xs" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> Captures</Button>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="xl:sticky xl:top-3 xl:self-start">
          <div className="max-h-[85vh] overflow-auto rounded-lg border bg-muted/30">
            {!url ? <p className="p-6 text-xs text-muted-foreground">Loading the original…</p>
              : job.mime_type === "application/pdf"
                ? <iframe title="Original" src={url} className="h-[85vh] w-full" />
                : <img src={url} alt="The captured sheet" className="w-full" />}
          </div>
          {url && <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11px] underline">Open the original in a new tab</a>}
        </div>
        {waiting ? <p className="p-6 text-xs text-muted-foreground">Opening the draft…</p> : (
          <RxForm
            quoteId={job.quote_id}
            surface="admin"
            lockedAccountId={job.account_id}
            prefill={prefill ?? undefined}
            prefillBanner={job.draft && !job.quote_id ? "Read from the captured sheet. Fields marked amber were hard to read — check them against the original." : undefined}
            onQuoteCreated={async ({ quoteId: id }) => {
              setQuoteId(id);
              await jobs().update({ quote_id: id }).eq("id", job.id);
            }}
            onStartAnother={onBack}
          />
        )}
      </div>
      {quoteId && <p className="mt-2 text-[11px] text-muted-foreground">Saved as a draft order — it autosaves as you correct it.</p>}
    </div>
  );
}
