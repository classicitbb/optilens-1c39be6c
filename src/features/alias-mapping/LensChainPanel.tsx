import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CHAIN_STAGES, type StageCode, type StageStatus } from "./lensChain";
import { useLensChain } from "./useLensChain";

const SHOWN = 200;

const dot: Record<StageStatus, string> = {
  pass: "bg-emerald-500",
  fail: "bg-red-500",
  unknown: "bg-muted-foreground/30",
};
const statusText: Record<StageStatus, string> = { pass: "OK", fail: "Broken", unknown: "Not reported yet" };

type Filter = "all" | "ready" | StageCode;

const LensChainPanel = () => {
  const { chains, summary, isLoading, error } = useLensChain();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return chains.filter((c) =>
      (filter === "all" || (filter === "ready" ? c.cloudReady : c.firstBroken === filter))
      && (!q || `${c.alias.alias} ${c.alias.pricing_key} ${c.alias.style_description} ${c.alias.color_description}`.toLowerCase().includes(q)));
  }, [chains, filter, search]);

  if (error) return <p className="text-xs text-red-700">Could not load the chain: {error.message}</p>;
  if (isLoading) return <p className="text-xs text-muted-foreground">Checking every alias…</p>;

  const brokenStages = CHAIN_STAGES.filter((s) => s.source === "cloud" && summary.brokenAt[s.code] > 0);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-3">
      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} className="h-7 text-[11px]" onClick={() => setFilter("all")}>
          All ({summary.total})
        </Button>
        <Button size="sm" variant={filter === "ready" ? "default" : "outline"} className="h-7 text-[11px]" onClick={() => setFilter("ready")}>
          Ready in cvweb ({summary.cloudReady})
        </Button>
        {brokenStages.map((s) => (
          <Button key={s.code} size="sm" variant={filter === s.code ? "default" : "outline"} className="h-7 text-[11px]" onClick={() => setFilter(s.code)}>
            Broken at: {s.label} ({summary.brokenAt[s.code]})
          </Button>
        ))}
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter aliases…" className="h-8 text-xs w-56 ml-auto" />
      </div>

      <p className="text-[10px] text-muted-foreground shrink-0">
        Each alias is checked left to right; the first broken stage is the one to fix. Grey stages live only in Innovations
        and appear once the office reports them. Orders for an unpriced alias still go through at no charge, so
        "Ready in cvweb" is the bar for complete, not "orderable".
      </p>

      <div className="border border-border rounded overflow-auto flex-1 min-h-0">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-muted border-b border-border">
            <tr>
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Alias</th>
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Stages</th>
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Next step</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, SHOWN).map((c) => {
              const broken = CHAIN_STAGES.find((s) => s.code === c.firstBroken);
              return (
                <tr key={c.alias.alias} className="border-t border-border">
                  <td className="px-2 py-1.5">
                    <div className="font-medium">{c.alias.pricing_key.split("|")[0]?.trim()} · {c.alias.mf_type} · {c.alias.style_description}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {c.alias.color_description} · <span className="font-mono">{c.alias.alias}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      {CHAIN_STAGES.map((s) => (
                        <span
                          key={s.code}
                          role="img"
                          aria-label={`${s.label}: ${statusText[c.stages[s.code]]}`}
                          title={`${s.label}: ${statusText[c.stages[s.code]]}`}
                          className={`h-2.5 w-2.5 rounded-sm ${dot[c.stages[s.code]]}`}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    {broken ? (
                      <span className="text-red-700">{broken.hint}</span>
                    ) : (
                      <Badge variant="outline" className="text-[10px] border-emerald-400 text-emerald-700">
                        Ready in cvweb{c.pricedOn.length ? ` · ${c.pricedOn.join(", ")}` : ""}
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={3} className="text-center text-xs text-muted-foreground py-6">Nothing in this view.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {rows.length > SHOWN && (
        <p className="text-[10px] text-muted-foreground shrink-0">Showing the first {SHOWN} of {rows.length} — use the filter to narrow.</p>
      )}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0 flex-wrap">
        {CHAIN_STAGES.map((s, i) => (
          <span key={s.code}>{i + 1}. {s.label}{s.source === "innovations" ? " (Innovations)" : ""}</span>
        ))}
      </div>
    </div>
  );
};

export default LensChainPanel;
