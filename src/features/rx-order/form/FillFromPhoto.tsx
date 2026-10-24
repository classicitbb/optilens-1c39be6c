// "Fill from photo" on the portal form: the customer snaps or picks a picture of a
// prescription / order sheet, we read it (a short wait for one sheet) and the open
// form is filled in place, with anything hard to read marked for them to check.
// The original stays attached to the order through its capture job.
import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { captureJobs, createCaptureJob, readCapture } from "@/features/rx-capture/api";
import { ACCEPT, isAcceptedFile } from "@/features/rx-capture/files";
import { valuesFromOrder } from "./model";
import type { RxCatalog, RxFormValues } from "./types";

export function FillFromPhoto({
  accountId, accountName, hasEntries, catalog, onFilled, onError,
}: {
  accountId: number;
  accountName: string;
  /** Something is already typed: filling replaces it, so ask first. */
  hasEntries: boolean;
  catalog: RxCatalog;
  onFilled: (values: RxFormValues, jobId: string) => void;
  onError: (message: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!isAcceptedFile(file)) { onError("Choose a photo or a PDF of the sheet."); return; }
    if (hasEntries && !window.confirm("Reading a sheet replaces what you have entered so far. Continue?")) return;
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please sign in again.");
      const jobId = await createCaptureJob(file, accountId, auth.user.id);
      await readCapture(jobId);
      const { data, error } = await captureJobs().select("status, error, draft").eq("id", jobId).single();
      if (error) throw error;
      if (data.status !== "ready" || !data.draft) throw new Error(data.error || "Nothing could be read from that picture.");
      onFilled(valuesFromOrder({ ...data.draft, account: { id: accountId, name: accountName } }, catalog), jobId);
    } catch (e: any) {
      onError(e?.message ?? "That picture could not be read.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        {busy ? "Reading your sheet…" : "Fill from photo"}
      </Button>
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} />
    </>
  );
}
