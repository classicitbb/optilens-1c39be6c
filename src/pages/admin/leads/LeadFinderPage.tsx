import { useEffect, useMemo, useState } from "react";
import { Search, MapPinned, Sparkles, Save, Globe2, ActivitySquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerClose, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useLeadFinder } from "@/features/admin/leads/hooks/useLeadFinder";
import { useSaveLeadToCrm } from "@/features/admin/leads/hooks/useLeadActions";
import type { LeadRecord, LeadScoreFactor } from "@/features/admin/leads/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CARIBBEAN_COUNTRIES = ["Barbados", "Trinidad and Tobago", "Jamaica", "Saint Lucia", "Guyana"];
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
  if (score >= 75) return { label: "Hot", className: "bg-red-500/10 text-red-600 border-red-300" };
  if (score >= 45) return { label: "Warm", className: "bg-amber-500/10 text-amber-700 border-amber-300" };
  return { label: "Cold", className: "bg-sky-500/10 text-sky-700 border-sky-300" };
};

const EMPTY_REASON_GUIDANCE: Record<"no_providers_configured" | "provider_failures" | "no_matches", string> = {
  no_providers_configured: "No lead data providers are configured yet. Add provider API keys in /admin/leads/settings, then run search again.",
  provider_failures: "Configured providers failed to return data. Check provider credentials/quotas and retry.",
  no_matches: "No businesses matched this search. Broaden your region or intent, or relax filters like rating/reviews.",
};

const formatFactorLabel = (factor: string) =>
  factor
    .split("_")
    .map((token) => token[0].toUpperCase() + token.slice(1))
    .join(" ");

const LeadFinderPage = () => {
  const [query, setQuery] = useState("optical store");
  const [country, setCountry] = useState("Barbados");
  const [city, setCity] = useState("Bridgetown");
  const [globalSearch, setGlobalSearch] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [autopilotMode, setAutopilotMode] = useState<"manual" | "autopilot">("autopilot");
  const [productCategories, setProductCategories] = useState("single vision, progressive");
  const [marginTiers, setMarginTiers] = useState("premium");
  const [existingCustomerProfile, setExistingCustomerProfile] = useState("independent optometrists");
  const [manualExclusions, setManualExclusions] = useState("");
  const [minRating, setMinRating] = useState("3.5");
  const [minReviews, setMinReviews] = useState("10");
  const [hasWebsiteOnly, setHasWebsiteOnly] = useState(false);
  const [overrideScores, setOverrideScores] = useState<Record<string, string>>({});
  const finder = useLeadFinder();
  const saveLead = useSaveLeadToCrm();
  const { toast } = useToast();

  const leads = finder.data?.leads ?? [];
  const diagnostics = finder.data?.diagnostics ?? null;

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if ((lead.google_rating ?? 0) < Number(minRating)) return false;
      if ((lead.google_reviews_count ?? 0) < Number(minReviews)) return false;
      if (hasWebsiteOnly && !lead.website) return false;
      return true;
    });
  }, [leads, minRating, minReviews, hasWebsiteOnly]);

  const smartBatch = useMemo(() => [...filteredLeads].sort((a, b) => b.score - a.score).slice(0, 20), [filteredLeads]);
  const displayLeads = smartBatch.length > 0 ? smartBatch : filteredLeads;

  const scoreForSave = (lead: LeadRecord) => {
    const override = overrideScores[lead.id];
    if (override !== undefined && override !== "") return Number(override);
    return lead.score;
  };

  const emptyStateMessage = useMemo(() => {
    if (finder.isPending) return null;
    if (!finder.data) return null;
    if (displayLeads.length > 0) return null;
    const reason = diagnostics?.emptyReason;
    if (reason && EMPTY_REASON_GUIDANCE[reason]) return EMPTY_REASON_GUIDANCE[reason];
    return "No leads found. Try adjusting your search criteria.";
  }, [finder.isPending, finder.data, displayLeads.length, diagnostics?.emptyReason]);

  const runSearch = async () => {
    try {
      await finder.mutateAsync({ query, country, cities: [city], globalSearch, mode: autopilotMode });
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
      <AdminPageHeader
        title="Lead Finder"
        icon={Sparkles}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Search & Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search intent" className="h-8 text-xs" />
            <Select value={country} onValueChange={setCountry} disabled={globalSearch}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                {CARIBBEAN_COUNTRIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="h-8 text-xs" disabled={globalSearch} />
            <Input value={productCategories} onChange={(e) => setProductCategories(e.target.value)} placeholder="Product categories" className="h-8 text-xs" />
            <Button className="h-8 text-xs" onClick={runSearch} disabled={finder.isPending}><Search className="h-3 w-3 mr-1" />{finder.isPending ? "Searching..." : "Run Search"}</Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-8 gap-2">
            <Input value={marginTiers} onChange={(e) => setMarginTiers(e.target.value)} className="h-8 text-xs" placeholder="Margin tiers" />
            <Input value={existingCustomerProfile} onChange={(e) => setExistingCustomerProfile(e.target.value)} className="h-8 text-xs" placeholder="Existing customer profile" />
            <Input value={manualExclusions} onChange={(e) => setManualExclusions(e.target.value)} className="h-8 text-xs" placeholder="Exclusions" />
            <Input value={minRating} onChange={(e) => setMinRating(e.target.value)} className="h-8 text-xs" placeholder="Min rating" />
            <Input value={minReviews} onChange={(e) => setMinReviews(e.target.value)} className="h-8 text-xs" placeholder="Min reviews" />
            <div className="flex items-center gap-2 h-8"><Switch checked={hasWebsiteOnly} onCheckedChange={setHasWebsiteOnly} id="has-website" /><Label htmlFor="has-website" className="text-[11px]">Has Website only</Label></div>
            <div className="flex items-center gap-2 h-8"><Switch checked={showMap} onCheckedChange={setShowMap} id="map-toggle" /><Label htmlFor="map-toggle" className="text-[11px]">Map Toggle</Label></div>
            <div className="flex items-center gap-2 h-8"><Switch checked={autopilotMode === "autopilot"} onCheckedChange={(checked) => setAutopilotMode(checked ? "autopilot" : "manual")} id="autopilot-toggle" /><Label htmlFor="autopilot-toggle" className="text-[11px] inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> Autopilot</Label></div>
            <div className="flex items-center gap-2 h-8"><Switch checked={globalSearch} onCheckedChange={setGlobalSearch} id="global-toggle" /><Label htmlFor="global-toggle" className="text-[11px] inline-flex items-center gap-1"><Globe2 className="h-3 w-3" /> Global search</Label></div>
          </div>

          <p className="text-xs inline-flex items-center gap-1 text-muted-foreground"><MapPinned className="h-4 w-4" /> {showMap ? "Map mode enabled (pins integration next)." : "Card mode enabled."}</p>

          <Card className="bg-muted/30">
            <CardContent className="pt-4 space-y-2 text-xs">
              <p className="font-medium inline-flex items-center gap-1"><ActivitySquare className="h-3.5 w-3.5" /> Real-time provider trace</p>
              <p>Mode: <span className="font-medium">{diagnostics?.mode ?? autopilotMode}</span></p>
              <p>Scope: <span className="font-medium">{globalSearch ? "Global" : `${country} / ${city}`}</span></p>
              <p>Resolved Query: <span className="font-medium">{diagnostics?.queryEcho.query ?? query}</span></p>
              {diagnostics?.planner?.selectedIntent ? (
                <p>Top Intent: <span className="font-medium">{diagnostics.planner.selectedIntent.searchIntent}</span> ({diagnostics.planner.selectedIntent.score})</p>
              ) : null}
              {diagnostics?.planner?.selectedIntent?.whySuggested?.length ? (
                <div className="space-y-1">
                  <p className="font-medium">Why this was suggested</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {diagnostics.planner.selectedIntent.whySuggested.map((reason, idx) => <li key={`${reason}-${idx}`}>{reason}</li>)}
                  </ul>
                </div>
              ) : null}
              {diagnostics?.planner?.selectedIntent?.historicalPerformance ? (
                <div className="space-y-1">
                  <p className="font-medium">Historical performance of similar leads</p>
                  <p>Sample Size: <span className="font-medium">{diagnostics.planner.selectedIntent.historicalPerformance.sampleSize}</span></p>
                  <p>Win Rate: <span className="font-medium">{(diagnostics.planner.selectedIntent.historicalPerformance.winRate * 100).toFixed(1)}%</span></p>
                  <p>CAC Proxy: <span className="font-medium">{diagnostics.planner.selectedIntent.historicalPerformance.cacProxy?.toFixed(2) ?? "—"}</span></p>
                  <p>Avg Won Deal Size: <span className="font-medium">{diagnostics.planner.selectedIntent.historicalPerformance.avgDealSize ?? "—"}</span></p>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-1">
                {(diagnostics?.providersUsed ?? []).map((p) => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}
              </div>
              {diagnostics ? (
                <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                  <p>Google: {diagnostics.providerStatus.googlePlacesConfigured ? "configured" : "not configured"}</p>
                  <p>Facebook: {diagnostics.providerStatus.facebookGraphConfigured ? "configured" : "not configured"}</p>
                  <p>Instagram: {diagnostics.providerStatus.instagramGraphConfigured ? "configured" : "not configured"}</p>
                  <p>WhatsApp: {diagnostics.providerStatus.whatsappBusinessSignalsConfigured ? "configured" : "not configured"}</p>
                  <p>Yellow Pages: {diagnostics.providerStatus.yellowPagesConfigured ? "configured" : "not configured"}</p>
                  <p>Bing: {diagnostics.providerStatus.bingConfigured ? "configured" : "not configured"}</p>
                  <p>Yahoo: {diagnostics.providerStatus.yahooConfigured ? "configured" : "not configured"}</p>
                </div>
                <div className="space-y-1">
                  {Object.entries(diagnostics.providerTelemetry).map(([provider, outcome]) => (
                    <p key={provider} className="text-[11px]">
                      {provider}: attempted={String(outcome.attempted)} · results={outcome.resultCount} · latency={outcome.latencyMs}ms · error={outcome.errorCode ?? "none"}
                    </p>
                  ))}
                </div>
                </>
              ) : (
                <p className="text-muted-foreground">Run search to display live provider diagnostics.</p>
              )}
            </CardContent>
          </Card>

          {finder.data?.warning ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {finder.data.warning}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {displayLeads.map((lead) => {
              const effectiveScore = scoreForSave(lead);
              const band = scoreBand(effectiveScore);

              return (
                <div key={lead.id} className="border rounded p-2 space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <p className="font-medium truncate">{lead.name}</p>
                    <Badge className={band.className}>{band.label} · {effectiveScore}</Badge>
                  </div>
                  <p className="text-muted-foreground">{lead.city || "—"}, {lead.country || "—"}</p>
                  <p>Google: {lead.google_rating ?? "—"} ({lead.google_reviews_count ?? 0})</p>
                  <p>IG/FB: {lead.instagram_handle || lead.facebook_page ? "Active" : "Unknown"}</p>
                  <div className="pt-1 flex gap-2">
                    <Drawer>
                      <DrawerTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-[11px]">Score Breakdown</Button>
                      </DrawerTrigger>
                      <DrawerContent>
                        <DrawerHeader>
                          <DrawerTitle>{lead.name} · Explainable score review</DrawerTitle>
                        </DrawerHeader>
                        <div className="px-4 pb-2 space-y-3 text-sm max-h-[55vh] overflow-y-auto">
                          {FACTOR_ORDER.map((factor) => {
                            const factorData = lead.lead_score_breakdown?.[factor];
                            return (
                              <div key={factor} className="border rounded p-2">
                                <p className="font-medium">{formatFactorLabel(factor)} · {factorData?.points ?? 0} pts</p>
                                <ul className="list-disc ml-4 text-muted-foreground">
                                  {(factorData?.evidence ?? ["No evidence returned for this factor."]).map((line) => <li key={line}>{line}</li>)}
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
            {emptyStateMessage ? <p className="text-xs text-muted-foreground">{emptyStateMessage}</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadFinderPage;
