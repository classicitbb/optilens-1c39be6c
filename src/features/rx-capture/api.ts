// The capture round trip, shared by the staff capture page and the portal form's
// "Fill from photo": upload the original, record the job, ask the edge function
// to read it. Everything else (what to do with the draft) belongs to the caller.
import { supabase } from "@/integrations/supabase/client";
import { extensionFor } from "./files";

// the table is new and not yet in the generated types
export const captureJobs = () => supabase.from("rx_capture_jobs" as never) as any;

/** Upload `file` and create its job row. Returns the job id. */
export async function createCaptureJob(file: File, accountId: number, userId: string): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const up = await supabase.storage.from("rx-captures").upload(path, file, { contentType: file.type });
  if (up.error) throw up.error;
  const { data, error } = await captureJobs()
    .insert({ account_id: accountId, storage_path: path, file_name: file.name || null, mime_type: file.type })
    .select("id").single();
  if (error) throw error;
  return data.id as string;
}

/** Ask the edge function to read the job. Resolves when it is done; throws with the reason if it could not. */
export async function readCapture(jobId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("rx-capture-extract", { body: { jobId } });
  if (!error) return;
  // the function answers with { error } and a status; surface its words, not the transport's
  let message = error.message;
  try { message = (await (error as any).context?.json?.())?.error ?? message; } catch { /* keep the transport message */ }
  throw new Error(message);
}
