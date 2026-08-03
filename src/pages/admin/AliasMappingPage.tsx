import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLenses } from "@/hooks/useLenses";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, ChevronDown, ChevronRight, Link2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import {
  buildAliasIndex,
  diagnoseMissingGroup,
  groupByStyle,
  matchLens,
  MISSING_REASON_TEXT,
  type LensMatch,
  type MatchableAlias,
  type MissingReason,
} from "@/features/alias-mapping/aliasMatching";

// Alias mapping curation (INNOVA_INTEGRATION_ARCHITECTURE.md §2.2).
//
// Our priced lens rows use header naming on two axes: a lenstype like "Endless
// Steady" covers several Innovations sub-designs, and an option like "TGNS"
// covers eight colours. Innovations aliases are fully specified. So one CV row
// maps to many aliases, and this screen is where a human curates that fan-out.
//
// The matching rules live in features/alias-mapping/aliasMatching.ts; this file
// is the review surface for them. Proposals arrive pre-ticked so they can be
// seen, but they are NOT counted as pending changes until the operator either
// edits a row or presses "Confirm all matched" — nothing reaches
// lens_alias_map without a deliberate Save.

interface MapRow { id: string; lens_id: string; innovations_alias: string; is_primary: boolean; confirmed_at: string | null }

interface AliasSyncRun { status: string; received: number; upserted: number; failed: number; dry_run: boolean; started_at: string }
interface AliasSyncRequest { id: string; status: string; requested_at: string; finished_at: string | null }

const ALIAS_ENTITY = "lens_aliases";
const PAGE = 1000; // PostgREST caps every response at 1000 rows regardless of .limit()
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString() : "—");

type StatusFilter = "matched" | "needs_decision" | "mapped" | "stale" | "no_match";

const AliasMappingPage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: lenses = [] } = useLenses();
  // ?lens=<name> deep link from the catalog's ALIAS column / lens dialog.
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("lens") ?? "");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("matched");
  const [expanded, setExpanded] = useState<string | null>(null);
  // lens_id -> the aliases the operator has settled on. Absent = untouched, so
  // the row still shows its proposal (or its saved set) without being pending.
  const [picked, setPicked] = useState<Record<string, string[]>>({});

  const { data: aliases = [], isLoading: aliasesLoading } = useQuery<MatchableAlias[]>({
    queryKey: ["innovations-lens-aliases"],
    queryFn: async () => {
      const all: MatchableAlias[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await (supabase.from("innovations_lens_aliases") as any)
          .select("alias, style_code, style_description, material_description, color_description, color_code, mf_type, pricing_key")
          .eq("is_active", true)
          .order("alias")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data?.length) break;
        all.push(...(data as MatchableAlias[]));
        if (data.length < PAGE) break;
      }
      return all;
    },
  });

  const { data: existing = [] } = useQuery<MapRow[]>({
    queryKey: ["lens-alias-map-all"],
    queryFn: async () => {
      const all: MapRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await (supabase.from("lens_alias_map") as any)
          .select("id, lens_id, innovations_alias, is_primary, confirmed_at")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data?.length) break;
        all.push(...(data as MapRow[]));
        if (data.length < PAGE) break;
      }
      return all;
    },
  });

  // Sync controls. The cloud cannot call into the office, so "Sync aliases"
  // queues a request in innovations_sync_requests and the OptiLens Local agent
  // claims it on its next poll. "Recheck" is the other half: when the push has
  // already run locally, it pulls in what landed without a page reload.
  const { data: syncState, refetch: refetchSyncState } = useQuery({
    queryKey: ["lens-alias-sync-state"],
    queryFn: async () => {
      const [runRes, reqRes] = await Promise.all([
        (supabase.from("innovations_sync_runs") as any)
          .select("status, received, upserted, failed, dry_run, started_at")
          .eq("entity", ALIAS_ENTITY)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        (supabase.from("innovations_sync_requests") as any)
          .select("id, status, requested_at, finished_at")
          .contains("entities", [ALIAS_ENTITY])
          .order("requested_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        lastRun: (runRes.data ?? null) as AliasSyncRun | null,
        lastRequest: (reqRes.data ?? null) as AliasSyncRequest | null,
      };
    },
  });

  const pendingRequest = syncState?.lastRequest
    && (syncState.lastRequest.status === "pending" || syncState.lastRequest.status === "claimed");

  const requestSync = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from("innovations_sync_requests") as any)
        .insert({ entities: [ALIAS_ENTITY], status: "pending" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lens-alias-sync-state"] });
      toast({
        title: "Alias sync requested",
        description: "OptiLens Local will run it on its next check. Use Recheck once it reports done.",
      });
    },
    onError: (e: any) => toast({ title: "Could not request the alias sync", description: e.message, variant: "destructive" }),
  });

  const [isRechecking, setIsRechecking] = useState(false);
  const recheck = async () => {
    setIsRechecking(true);
    try {
      const [aliasResult] = await Promise.all([
        qc.refetchQueries({ queryKey: ["innovations-lens-aliases"] }).then(
          () => qc.getQueryData<MatchableAlias[]>(["innovations-lens-aliases"]) ?? []),
        qc.refetchQueries({ queryKey: ["lens-alias-map-all"] }),
        refetchSyncState(),
      ]);
      toast({
        title: "Alias catalog rechecked",
        description: aliasResult.length
          ? `${aliasResult.length} alias${aliasResult.length === 1 ? "" : "es"} in the cloud catalog.`
          : "Still nothing in the cloud catalog — the local push has not landed yet.",
      });
    } catch (e: any) {
      toast({ title: "Could not recheck", description: e.message, variant: "destructive" });
    } finally {
      setIsRechecking(false);
    }
  };

  const confirmedByLens = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const row of existing) {
      if (!row.confirmed_at) continue;
      const list = m.get(row.lens_id) ?? [];
      list.push(row.innovations_alias);
      m.set(row.lens_id, list);
    }
    return m;
  }, [existing]);

  const mappedAliases = useMemo(() => new Set(existing.map((m) => m.innovations_alias)), [existing]);
  const aliasIndex = useMemo(() => buildAliasIndex(aliases), [aliases]);

  // A confirmed alias that is no longer in the active catalogue was deactivated
  // (or dropped) upstream. Left alone it just vanishes from the customer's
  // colour list silently, so it gets its own tab.
  const activeAliasSet = useMemo(() => new Set(aliases.map((a) => a.alias)), [aliases]);

  interface Row {
    lens: any;
    match: LensMatch;
    confirmed: string[];
    stale: string[];
    status: StatusFilter;
    missing: MissingReason | null;
  }

  const rows = useMemo<Row[]>(() => {
    return lenses
      .filter((l: any) => l.is_active)
      .map((l: any) => {
        const match = matchLens(l, aliasIndex.groups);
        const confirmed = confirmedByLens.get(l.id) ?? [];
        const stale = aliases.length ? confirmed.filter((a) => !activeAliasSet.has(a)) : [];
        const status: StatusFilter = stale.length
          ? "stale"
          : confirmed.length
            ? "mapped"
            : !match.group.length
              ? "no_match"
              : match.proposed.length
                ? "matched"
                : "needs_decision";
        return {
          lens: l,
          match,
          confirmed,
          stale,
          status,
          missing: status === "no_match" ? diagnoseMissingGroup(l, aliasIndex) : null,
        };
      })
      .sort((a, b) => a.lens.name.localeCompare(b.lens.name));
  }, [lenses, aliasIndex, confirmedByLens, activeAliasSet, aliases.length]);

  // A deep-linked lens can sit in any tab, so jump to the one holding it rather
  // than showing an empty "Matched" list.
  const deepLink = searchParams.get("lens");
  const jumpedRef = useRef(false);
  useEffect(() => {
    if (!deepLink || jumpedRef.current || !rows.length) return;
    const target = rows.find((r) => r.lens.name === deepLink);
    if (!target) return;
    jumpedRef.current = true;
    setStatusFilter(target.status);
    setExpanded(target.lens.id);
  }, [deepLink, rows]);

  // Why the unmatched lenses are unmatched — a coverage gap, not a naming one.
  const missingBreakdown = useMemo(() => {
    const out: Record<MissingReason, number> = { style_absent: 0, material_absent: 0, combination_absent: 0 };
    for (const row of rows) if (row.missing) out[row.missing]++;
    return out;
  }, [rows]);

  const counts = useMemo(() => ({
    matched: rows.filter((r) => r.status === "matched").length,
    needs_decision: rows.filter((r) => r.status === "needs_decision").length,
    mapped: rows.filter((r) => r.status === "mapped").length,
    stale: rows.filter((r) => r.status === "stale").length,
    no_match: rows.filter((r) => r.status === "no_match").length,
  }), [rows]);

  const filtered = rows.filter((r) =>
    r.status === statusFilter
    && (!search || r.lens.name.toLowerCase().includes(search.toLowerCase())));

  const unusedAliasCount = aliases.filter((a) => !mappedAliases.has(a.alias)).length;

  // What a row shows ticked: the operator's edit, else the saved set, else the
  // proposal. Only the first of those counts as a pending change.
  const shownFor = (row: Row) =>
    picked[row.lens.id]
    ?? (row.confirmed.length ? row.confirmed : row.match.proposed.map((a) => a.alias));

  const isEdited = (row: Row) => {
    const edit = picked[row.lens.id];
    if (!edit) return false;
    return [...edit].sort().join("|") !== [...row.confirmed].sort().join("|");
  };

  const togglePick = (row: Row, alias: string) => {
    const current = shownFor(row);
    setPicked((p) => ({
      ...p,
      [row.lens.id]: current.includes(alias) ? current.filter((a) => a !== alias) : [...current, alias],
    }));
  };
  const setAll = (lensId: string, aliasList: string[]) => setPicked((p) => ({ ...p, [lensId]: aliasList }));

  const editedRows = rows.filter(isEdited);

  /** Commit every visible proposal into the pending set, ready for one Save. */
  const acceptAllMatched = () => {
    const next = { ...picked };
    for (const row of filtered) {
      if (row.status !== "matched") continue;
      next[row.lens.id] = row.match.proposed.map((a) => a.alias);
    }
    setPicked(next);
    const n = filtered.filter((r) => r.status === "matched").length;
    toast({
      title: `${n} lens${n === 1 ? "" : "es"} staged`,
      description: "Review the ticked colours, then Save to write them.",
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let linked = 0;
      let unlinked = 0;
      for (const row of editedRows) {
        const lensId = row.lens.id;
        const want = picked[lensId] ?? [];
        const have = row.confirmed;
        const toAdd = want.filter((a) => !have.includes(a));
        const toRemove = have.filter((a) => !want.includes(a));

        if (toRemove.length) {
          const { error } = await (supabase.from("lens_alias_map") as any)
            .delete().eq("lens_id", lensId).in("innovations_alias", toRemove);
          if (error) throw error;
          unlinked += toRemove.length;
        }
        if (toAdd.length) {
          const { error } = await (supabase.from("lens_alias_map") as any).upsert(
            toAdd.map((alias) => ({
              lens_id: lensId,
              innovations_alias: alias,
              // Records WHICH of our options produced this link, so the mapping
              // stays auditable rather than being a bare list of alias codes.
              lens_option_id: row.match.optionId,
              is_primary: false,
              match_confidence: row.match.kind === "exact" ? 1 : row.match.kind ? 0.8 : null,
              confirmed_by: user?.id ?? null,
              confirmed_at: new Date().toISOString(),
            })),
            { onConflict: "lens_id,innovations_alias" },
          );
          if (error) throw error;
          linked += toAdd.length;
        }
        // Exactly one primary per lens (partial unique index), so clear then set.
        if (want.length) {
          const primary = [...want].sort()[0];
          await (supabase.from("lens_alias_map") as any)
            .update({ is_primary: false }).eq("lens_id", lensId).neq("innovations_alias", primary);
          const { error: pErr } = await (supabase.from("lens_alias_map") as any)
            .update({ is_primary: true }).eq("lens_id", lensId).eq("innovations_alias", primary);
          if (pErr) throw pErr;
        }
      }
      return { linked, unlinked, lenses: editedRows.length };
    },
    onSuccess: ({ linked, unlinked, lenses: n }) => {
      toast({
        title: "Colour mappings saved",
        description: `${n} lens${n === 1 ? "" : "es"} — ${linked} colour${linked === 1 ? "" : "s"} enabled`
          + (unlinked ? `, ${unlinked} disabled.` : "."),
      });
      setPicked({});
      qc.invalidateQueries({ queryKey: ["lens-alias-map-all"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const visibleMatched = filtered.filter((r) => r.status === "matched").length;

  return (
    // AdminLayout's <main> is a min-h-0 flex column with overflow-hidden, so
    // claiming flex-1 here lets the table own the leftover height and scroll
    // inside itself — controls and filters stay put instead of scrolling away.
    <div className="p-4 flex flex-1 min-h-0 flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap shrink-0">
        <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Innovations Alias Mapping
        </h1>
        <Badge variant="outline" className="text-[10px]">
          {aliasesLoading ? "loading…" : `${aliases.length} aliases synced`}
        </Badge>
        <Badge variant="outline" className="text-[10px]">{counts.mapped} lenses mapped</Badge>
        <Badge variant="outline" className="text-[10px]">{unusedAliasCount} aliases unused</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter lenses…" className="h-8 text-xs w-56" />
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => void recheck()} disabled={isRechecking}>
            <RefreshCw className={`h-3.5 w-3.5 ${isRechecking ? "animate-spin" : ""}`} />
            Recheck
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => requestSync.mutate()}
            disabled={requestSync.isPending || !!pendingRequest}
          >
            {(requestSync.isPending || pendingRequest) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {pendingRequest ? "Sync requested…" : "Sync aliases"}
          </Button>
          {statusFilter === "matched" && visibleMatched > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={acceptAllMatched}>
              <Sparkles className="h-3.5 w-3.5" />
              Confirm all matched ({visibleMatched})
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={!editedRows.length || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Save ({editedRows.length})
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {([
          ["matched", `Matched (${counts.matched})`],
          ["needs_decision", `Needs a decision (${counts.needs_decision})`],
          ["mapped", `Mapped (${counts.mapped})`],
          ...(counts.stale ? [["stale", `Deactivated upstream (${counts.stale})`]] as [StatusFilter, string][] : []),
          ["no_match", `No Innovations match (${counts.no_match})`],
        ] as [StatusFilter, string][]).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={statusFilter === value ? "default" : "outline"}
            className="h-7 text-[11px]"
            onClick={() => { setStatusFilter(value); setExpanded(null); }}
          >
            {label}
          </Button>
        ))}
      </div>

      {statusFilter === "stale" && counts.stale > 0 && (
        <p className="text-[10px] text-red-700 shrink-0">
          These lenses have confirmed colours that are no longer in the active alias catalogue — deactivated
          upstream, or dropped from the push. The Rx order form silently stops offering them, so re-pick the
          colours here or ask the office why they left the feed.
        </p>
      )}

      {statusFilter === "no_match" && counts.no_match > 0 && (
        <p className="text-[10px] text-muted-foreground shrink-0">
          Nothing here can be mapped until the alias feed carries it — these are missing from the{" "}
          <strong className="text-foreground">synced catalogue</strong>, which is narrower than the Innovations lens
          database itself. <strong className="text-foreground">{missingBreakdown.style_absent}</strong> use a lens design
          no alias mentions, <strong className="text-foreground">{missingBreakdown.material_absent}</strong> a material no
          alias mentions, and <strong className="text-foreground">{missingBreakdown.combination_absent}</strong> a
          combination that never appears together. Known examples: Innovations carries 1.60 Index, and lists Endless
          under Single&nbsp;Vision, Endless&nbsp;Off by working distance and Endless&nbsp;Plus as a progressive — none of
          which reach us. Widening the optilens-local export is what unblocks these, not renaming anything here.
        </p>
      )}

      {aliases.length === 0 && !aliasesLoading && (
        <div className="shrink-0 text-xs text-muted-foreground border border-dashed border-border rounded p-6 text-center space-y-1">
          <p>
            No aliases synced yet. Run the catalog push from optilens-local (Sync → lens_aliases), or use
            <strong className="text-foreground"> Sync aliases</strong> to queue that push for the office agent.
          </p>
          <p>
            Already ran it locally? <strong className="text-foreground">Recheck</strong> pulls in whatever has landed.
          </p>
        </div>
      )}

      {(syncState?.lastRun || syncState?.lastRequest) && (
        <p className="text-[10px] text-muted-foreground shrink-0">
          {syncState.lastRun && (
            <>
              Last alias push: <strong className="text-foreground">{fmt(syncState.lastRun.started_at)}</strong>
              {syncState.lastRun.dry_run ? " (dry run)" : ""}
              {" · "}{syncState.lastRun.upserted}/{syncState.lastRun.received} upserted
              {syncState.lastRun.failed ? ` · ${syncState.lastRun.failed} failed` : ""}
            </>
          )}
          {syncState.lastRun && syncState.lastRequest ? " — " : ""}
          {syncState.lastRequest && (
            <>
              Last request: <strong className="text-foreground capitalize">{syncState.lastRequest.status}</strong>
              {" · "}{fmt(syncState.lastRequest.finished_at ?? syncState.lastRequest.requested_at)}
              {pendingRequest && " — waiting for the office agent to pick it up"}
            </>
          )}
        </p>
      )}

      <div className="border border-border rounded overflow-auto flex-1 min-h-0">
        <table className="w-full text-xs">
          {/* Opaque, not bg-muted/60 — rows scroll underneath it. */}
          <thead className="sticky top-0 z-10 bg-muted border-b border-border">
            <tr>
              <th className="w-8 px-2 py-1.5" />
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">CV Lens</th>
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Our option</th>
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Innovations group</th>
              <th className="text-center px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Colours</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((row) => {
              const { lens, match, confirmed } = row;
              const open = expanded === lens.id;
              const shown = shownFor(row);
              const edited = isEdited(row);
              return [
                <tr
                  key={lens.id}
                  className={`border-t border-border hover:bg-muted/30 ${match.group.length ? "cursor-pointer" : ""}`}
                  onClick={() => match.group.length && setExpanded(open ? null : lens.id)}
                >
                  <td className="px-2 py-1.5 text-center text-muted-foreground">
                    {match.group.length ? (open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />) : null}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="font-medium">{lens.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {lens.material?.name} · {lens.mftype?.name} · {lens.lenstype?.name}
                      {lens.finishtype?.name ? ` · ${lens.finishtype.name}` : ""}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    {match.optionName || <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-2 py-1.5">
                    {match.group.length ? (
                      <>
                        {match.group[0].material_description} · {match.group[0].mf_type} · {match.group[0].style_description}
                        <span className="text-[10px] text-muted-foreground"> · {match.group.length} colours available</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        {row.missing ? MISSING_REASON_TEXT[row.missing](lens) : "No Innovations group."}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    {row.stale.length > 0 && (
                      <Badge variant="outline" className="mr-1 text-[10px] border-red-400 text-red-700">
                        {row.stale.length} gone
                      </Badge>
                    )}
                    {shown.length > 0 ? (
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${edited ? "border-amber-400 text-amber-700"
                          : confirmed.length ? "" : "border-emerald-400 text-emerald-700"}`}
                      >
                        {shown.length}{edited ? " unsaved" : confirmed.length ? "" : " proposed"}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>,
                open && match.group.length ? (
                  <tr key={`${lens.id}-detail`} className="border-t border-border bg-muted/20">
                    <td />
                    <td colSpan={4} className="px-2 py-2">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] text-muted-foreground">
                          {match.reason
                            ?? "No colour in this group matches our option — tick the ones we sell."}
                        </span>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] ml-auto"
                          onClick={(e) => { e.stopPropagation(); setAll(lens.id, match.group.map((a) => a.alias)); }}>
                          Select all
                        </Button>
                        {match.proposed.length > 0 && (
                          <Button size="sm" variant="outline" className="h-6 text-[10px]"
                            onClick={(e) => { e.stopPropagation(); setAll(lens.id, match.proposed.map((a) => a.alias)); }}>
                            Just the match
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-6 text-[10px]"
                          onClick={(e) => { e.stopPropagation(); setAll(lens.id, []); }}>
                          Clear
                        </Button>
                      </div>
                      {/* Split by Innovations style code — a CV lenstype header
                          covers several sub-designs, and we sell some but not
                          always all of them. */}
                      {groupByStyle(match.group).map((style) => {
                        const on = style.aliases.filter((a) => shown.includes(a.alias)).length;
                        return (
                          <div key={style.styleCode} className="mb-2 last:mb-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-semibold text-foreground">
                                {style.styleDescription} · style {style.styleCode}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{on}/{style.aliases.length} enabled</span>
                              <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const ids = style.aliases.map((a) => a.alias);
                                  setAll(lens.id, on === style.aliases.length
                                    ? shown.filter((a) => !ids.includes(a))
                                    : [...new Set([...shown, ...ids])]);
                                }}>
                                {on === style.aliases.length ? "none" : "all"}
                              </Button>
                            </div>
                            <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
                              {style.aliases.map((a) => {
                                const ticked = shown.includes(a.alias);
                                const isProposed = match.proposed.some((p) => p.alias === a.alias);
                                return (
                                  <label
                                    key={a.alias}
                                    className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-background cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Checkbox checked={ticked} onCheckedChange={() => togglePick(row, a.alias)} />
                                    <span className="flex-1 min-w-0">
                                      <span className="block truncate">{a.color_description}</span>
                                      <span className="block text-[10px] text-muted-foreground font-mono">
                                        {a.color_code} · {a.alias}
                                      </span>
                                    </span>
                                    {isProposed && !confirmed.length && (
                                      <Badge variant="outline" className="text-[9px] shrink-0 border-emerald-400 text-emerald-700">
                                        match
                                      </Badge>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </td>
                  </tr>
                ) : null,
              ];
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                {aliasesLoading ? "Loading the alias catalog…" : "Nothing in this view."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 200 && <p className="text-[10px] text-muted-foreground shrink-0">Showing the first 200 of {filtered.length} — use the filter to narrow.</p>}
      <p className="text-[10px] text-muted-foreground max-w-3xl shrink-0">
        Our lens rows use header naming: an option like "TGNS" covers every TGNS colour, and a lens type like
        "Endless Steady" covers its Innovations sub-designs. Green ticks are the proposed match — review them,
        then "Confirm all matched" and Save. Ticking a colour enables it as a choice on the Rx order form; the
        lowest alias becomes the default when no colour is chosen. Unticking a saved colour removes that link.
      </p>
    </div>
  );
};

export default AliasMappingPage;
