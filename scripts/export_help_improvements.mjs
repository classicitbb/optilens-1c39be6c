#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from("help_feedback")
  .select("created_at, feedback_type, suggestion_text, page_slug, article_id")
  .eq("feedback_type", "suggestion")
  .not("suggestion_text", "is", null)
  .order("created_at", { ascending: false })
  .limit(200);

if (error) {
  console.error(error.message);
  process.exit(1);
}

for (const row of data ?? []) {
  console.log(`- [${row.created_at}] article=${row.article_id} page=${row.page_slug ?? "n/a"}`);
  console.log(`  ${String(row.suggestion_text).replace(/\n/g, "\n  ")}`);
}
