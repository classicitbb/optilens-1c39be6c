// Retention purge for Rx captures: originals and their extracted text are kept 24
// months (decision 2026-10-01, long enough to cover remake disputes), then removed.
//
//   POST            purge everything past its `purge_after`
//   POST ?dryRun=1  report what would go, delete nothing
//
// Called daily by pg_cron (migration 20261001161000) with the shared token held in
// `rx_capture_settings`. There is no browser caller, so no CORS. A row is deleted
// only after its files are gone, so a storage failure is retried the next day
// rather than leaving files nobody can find.
import { createClient } from "npm:@supabase/supabase-js@2";

const BATCH = 200;

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });

const sameToken = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json(500, { error: "Not configured" });
  const db = createClient(url, key);

  const presented = req.headers.get("x-rx-purge-token") ?? "";
  const { data: settings } = await db.from("rx_capture_settings").select("purge_token").eq("id", true).maybeSingle();
  const expected = (settings as { purge_token?: string } | null)?.purge_token ?? "";
  if (!presented || !expected || !sameToken(presented, expected)) return json(401, { error: "Unauthorized" });

  const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";
  const now = new Date().toISOString();
  let rows = 0;
  let files = 0;
  let failed = 0;

  for (;;) {
    const { data: due, error } = await db.from("rx_capture_jobs")
      .select("id, storage_path, extra_paths").lt("purge_after", now).order("purge_after").limit(BATCH);
    if (error) return json(500, { error: "Could not list due captures", detail: error.message });
    if (!due?.length) break;

    if (dryRun) {
      // a dry run cannot page by deleting, so count one batch's worth and stop
      rows += due.length;
      files += due.reduce((n, j) => n + (j.storage_path ? 1 : 0) + ((j.extra_paths as string[] | null)?.length ?? 0), 0);
      break;
    }

    const gone: string[] = [];
    for (const job of due) {
      const paths = [job.storage_path, ...((job.extra_paths as string[] | null) ?? [])].filter((p): p is string => !!p);
      if (paths.length) {
        const { error: rmErr } = await db.storage.from("rx-captures").remove(paths);
        if (rmErr) { failed += 1; continue; }
        files += paths.length;
      }
      gone.push(job.id);
    }
    if (gone.length) {
      const { error: delErr } = await db.from("rx_capture_jobs").delete().in("id", gone);
      if (delErr) return json(500, { error: "Could not delete captures", detail: delErr.message, rows, files });
      rows += gone.length;
    }
    // nothing could be removed this pass: stop rather than loop on the same rows
    if (!gone.length || due.length < BATCH) break;
  }

  return json(200, { dryRun, rows, files, failed });
});
