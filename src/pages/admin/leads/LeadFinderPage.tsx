import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles, Save, ExternalLink, Star, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useLeadFinder } from "@/features/admin/leads/hooks/useLeadFinder";
import { useSaveLeadToCrm } from "@/features/admin/leads/hooks/useLeadActions";
import type { LeadRecord, LeadScoreFactor } from "@/features/admin/leads/types";
import { useToast } from "@/hooks/use-toast";

const EXAMPLE_BRIEFS = [
  "Independent opticians in Bridgetown that look like they would buy premium progressives",
  "Eye clinics in Trinidad with an active website and steady patient reviews",
  "Optical retailers across the Eastern Caribbean that are not part of a chain",
];

const FACTOR_ORDER: LeadScoreFactor[] = [
  "firmographic_fit",
  "role_likelihood",
  "procurement_readiness",
  "digital_maturity",
  "engagement_recency",
  "geography_fit",
  "catalog_match",
];

const scoreBand = (score: number) => {
  if (score >= 75) return { label: "Strong fit", className: "bg-red-500/10 text-red-600 border-red-300" };
  if (score >= 45) return { label: "Possible fit", className: "bg-amber-500/10 text-amber-700 border-amber-300" };
  return { label: "Weak fit", className: "bg-sky-500/10 text-sky-700 border-sky-300" };
};

const EMPTY_REASON_GUIDANCE: Record<string, string> = {
  no_providers_configured:
    "No lead data providers are configured. Add a Google Places or Firecrawl credential in /admin/leads/settings, then search again.",
  provider_failures:
    "Every configured provider failed. Check the provider trace below for the error, then verify credentials and quotas.",
  no_matches:
    "The providers returned nothing for this brief. Try naming the business type and place more plainly, or widen the area.",
  no_qualified_matches:
    "Results came back, but none were individual businesses matching your brief — mostly directories or listicles. See what was filtered out below, then try a more specific brief.",
};

const formatFactorLabel = (factor: string) =>
  factor
    .split("_")
    .map((token) => token[0].toUpperCase() + token.slice(1))
    .join(" ");

const hostOf = (website: string | null) => {
  if (!website) return null;
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return website;
  }
};

const LeadFinderPage = () => {
  const [brief, setBrief] = useState("");
  const [overrideScores, setOverrideScores] = useState<Record<string, string>>({});
  const finder = useLeadFinder();
  const saveLead = useSaveLeadToCrm();
  const { toast } = useToast();

  const leads = finder.data?.leads ?? [];
  const diagnostics = finder.data?.diagnostics ?? null;

  const scoreForSave = (lead: LeadRecord) => {
    const override = overrideScores[lead.id];
    if (override !== undefined && override !== "") return Number(override);
    return lead.score;
  };

  const emptyStateMessage = useMemo(() => {
    if (finder.isPending || !finder.data || leads.length > 0) return null;
    const reason = diagnostics?.emptyReason;
    if (reason && EMPTY_REASON_GUIDANCE[reason]) return EMPTY_REASON_GUIDANCE[reason];
    return "No leads found for this brief.";
  }, [finder.isPending, finder.data, leads.length, diagnostics?.emptyReason]);

  const runSearch = async (searchBrief: string) => {
    const trimmed = searchBrief.trim();
    if (!trimmed) return;
    try {
      await finder.mutateAsync({ brief: trimmed });
    } catch (e: any) {
      toast({
        title: "Search failed",
        description: e?.message || "Unable to run lead search right now.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!finder.data?.warning) return;
    toast({ title: "Search provider unavailable", description: finder.data.warning });
  }, [finder.data?.warning, toast]);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Lead Finder" icon={Sparkles} />

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="lead-brief" className="text-sm">Describe the leads you want</Label>
            <Textarea
              id="lead-brief"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void runSearch(brief);
                }
              }}
              placeholder="e.g. independent opticians in Bridgetown that look like they would buy premium progressives"
              className="min-h-[72px] text-sm resize-none"
            />
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-muted-foreground">
                Plain English. Business type, place, and anything that makes a lead worth your time.
              </p>
              <Button size="sm" className="h-8 text-xs" onClick={() => void runSearch(brief)} disabled={finder.isPending || !brief.trim()}>
                <Search className="h-3 w-3 mr-1" />
                {finder.isPending ? "Finding leads..." : "Find leads"}
              </Button>
            </div>
          </div>

          {!finder.data && !finder.isPending ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {EXAMPLE_BRIEFS.map((example) => (
                <Button
                  key={example}
                  variant="outline"
                  size="sm"
                  className="h-auto py-1 px-2 text-[11px] font-normal text-muted-foreground whitespace-normal text-left"
                  onClick={() => {
                    setBrief(example);
                    void runSearch(example);
                  }}
                >
                  {example}
                </Button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {finder.data?.warning ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {finder.data.warning}
        </div>
      ) : null}

      {diagnostics?.plan?.interpretation ? (
        <Card className="bg-muted/30">
          <CardContent className="pt-4 space-y-2 text-xs">
            <p className="font-medium inline-flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> What I searched for
            </p>
            <p className="text-muted-foreground">{diagnostics.plan.interpretation}</p>
            {diagnostics.plan.searchQueries.length > 0 ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {diagnostics.plan.searchQueries.map((planned) => (
                  <Badge key={planned} variant="outline" className="text-[10px] font-normal">{planned}</Badge>
                ))}
              </div>
            ) : null}
            {!diagnostics.plan.aiPlanned ? (
              <p className="text-amber-700">
                AI interpretation unavailable ({diagnostics.aiStatus.error ?? "unknown"}) — your brief was searched verbatim.
              </p>
            ) : null}
            <p className="text-muted-foreground">
              {diagnostics.candidatesFound} result{diagnostics.candidatesFound === 1 ? "" : "s"} found · {diagnostics.qualifiedCount} qualified as businesses
            </p>
          </CardContent>
        </Card>
      ) : null}

      {leads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {leads.map((lead) => {
            const effectiveScore = scoreForSave(lead);
            const band = scoreBand(effectiveScore);
            const host = hostOf(lead.website);

            return (
              <div key={lead.id} className="border rounded p-2.5 space-y-1.5 text-xs">
                <div className="flex justify-between gap-2 items-start">
                  <p className="font-medium leading-snug">{lead.name}</p>
                  <Badge className={`${band.className} shrink-0`}>{effectiveScore}</Badge>
                </div>

                <p className="text-muted-foreground">
                  {[lead.city, lead.country].filter(Boolean).join(", ") || "Location unknown"}
                </p>

                {lead.fit_reason ? <p className="text-muted-foreground italic leading-snug">{lead.fit_reason}</p> : null}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {lead.google_rating != null ? (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3" /> {lead.google_rating} ({lead.google_reviews_count ?? 0})
                    </span>
                  ) : null}
                  {host ? (
                    <a
                      href={lead.website!}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> {host}
                    </a>
                  ) : null}
                  <span>{band.label}</span>
                </div>

                <div className="pt-1 flex gap-2">
                  <Drawer>
                    <DrawerTrigger asChild>
                      <Button size="sm" variant="outline" className="h-7 text-[11px]">Why this score</Button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <DrawerHeader>
                        <DrawerTitle>{lead.name} · Score review</DrawerTitle>
                      </DrawerHeader>
                      <div className="px-4 pb-2 space-y-3 text-sm max-h-[55vh] overflow-y-auto">
                        {lead.fit_reason ? (
                          <div className="border rounded p-2">
                            <p className="font-medium">AI fit assessment · {lead.ai_intent_score ?? lead.score}</p>
                            <p className="text-muted-foreground">{lead.fit_reason}</p>
                          </div>
                        ) : null}
                        {FACTOR_ORDER.map((factor) => {
                          const factorData = lead.lead_score_breakdown?.[factor];
                          return (
                            <div key={factor} className="border rounded p-2">
                              <p className="font-medium">{formatFactorLabel(factor)} · {factorData?.points ?? 0} pts</p>
                              <ul className="list-disc ml-4 text-muted-foreground">
                                {(factorData?.evidence ?? ["No evidence returned for this factor."]).map((line) => (
                                  <li key={line}>{line}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                        <div className="space-y-1">
                          <Label htmlFor={`override-${lead.id}`}>Human override score (0-100)</Label>
                          <Input
                            id={`override-${lead.id}`}
                            value={overrideScores[lead.id] ?? ""}
                            onChange={(e) => setOverrideScores((prev) => ({ ...prev, [lead.id]: e.target.value }))}
                            placeholder={`Model score ${lead.score}`}
                            className="h-8"
                          />
                        </div>
                      </div>
                      <DrawerFooter>
                        <DrawerClose asChild><Button variant="outline">Done</Button></DrawerClose>
                      </DrawerFooter>
                    </DrawerContent>
                  </Drawer>
                  <Button
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={async () => {
                      try {
                        await saveLead.mutateAsync({ ...lead, score: effectiveScore });
                        toast({ title: "Saved to CRM", description: `${lead.name} saved with opportunity + note.` });
                      } catch (e: any) {
                        toast({ title: "Save failed", description: e?.message || "Could not save lead.", variant: "destructive" });
                      }
                    }}
                  >
                    <Save className="h-3 w-3 mr-1" /> Save to CRM
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {emptyStateMessage ? (
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">{emptyStateMessage}</p>
          </CardContent>
        </Card>
      ) : null}

      {diagnostics ? (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground">
              <ChevronDown className="h-3 w-3 mr-1" /> Provider trace
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="bg-muted/30">
              <CardContent className="pt-4 space-y-2 text-[11px]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                  <p>Google Places: {diagnostics.providerStatus.googlePlacesConfigured ? "configured" : "not configured"}</p>
                  <p>Firecrawl Search: {diagnostics.providerStatus.firecrawlSearchConfigured ? "configured" : "not configured"}</p>
                  <p>
                    AI: {diagnostics.providerStatus.aiConfigured
                      ? `planner ${diagnostics.aiStatus.plannerUsed ? "ok" : "skipped"} · qualifier ${diagnostics.aiStatus.qualifierUsed ? "ok" : "skipped"}`
                      : "not configured"}
                  </p>
                </div>
                {diagnostics.aiStatus.error ? <p className="text-amber-700">AI error: {diagnostics.aiStatus.error}</p> : null}
                {Object.entries(diagnostics.providerTelemetry).map(([provider, outcome]) => (
                  <p key={provider}>
                    {provider}: attempted={String(outcome.attempted)} · results={outcome.resultCount} · latency={outcome.latencyMs}ms · error={outcome.errorCode ?? "none"}
                  </p>
                ))}
                {diagnostics.rejected.length > 0 ? (
                  <div className="space-y-1 pt-1">
                    <p className="font-medium">Filtered out ({diagnostics.rejected.length} shown)</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                      {diagnostics.rejected.map((item, idx) => (
                        <li key={`${item.name}-${idx}`}>{item.name} — {item.reason}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
    </div>
  );
};

export default LeadFinderPage;
