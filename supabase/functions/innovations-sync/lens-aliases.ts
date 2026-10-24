// The office reconciliation feed sends removed aliases as deliberately minimal
// tombstones. They must never pass through an upsert: the target table has
// required catalogue columns and a previously unknown alias is not catalogue
// data we are allowed to invent.

type SupabaseResult = { data?: unknown; error?: { message?: string } | null };
type LensAliasTable = {
  upsert: (rows: Record<string, unknown>[], options: { onConflict: string; ignoreDuplicates: boolean }) => Promise<SupabaseResult>;
  update: (row: Record<string, unknown>) => { eq: (column: string, value: string) => { select: (columns: string) => Promise<SupabaseResult>; }; };
};
type LensAliasSupabase = { from: (table: "innovations_lens_aliases") => LensAliasTable; };
export function isInactiveLensAliasTombstone(row: Record<string, unknown>): boolean { return row.is_active === false; }
export async function upsertActiveLensAliases(supabase: LensAliasSupabase, rows: Record<string, unknown>[]): Promise<SupabaseResult> {
  return await supabase.from("innovations_lens_aliases").upsert(rows, { onConflict: "alias", ignoreDuplicates: false });
}
export async function deactivateLensAlias(supabase: LensAliasSupabase, row: Record<string, unknown>): Promise<{ updated: boolean; missing: boolean; error: { message?: string } | null }> {
  const result = await supabase.from("innovations_lens_aliases")
    .update({ is_active: false, synced_at: row.synced_at }).eq("alias", String(row.alias)).select("alias");
  if (result.error) return { updated: false, missing: false, error: result.error };
  const matches = Array.isArray(result.data) ? result.data : [];
  return { updated: matches.length > 0, missing: matches.length === 0, error: null };
}
