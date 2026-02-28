import { useMemo, useState } from "react";
import { Search, MapPinned, Sparkles, Save, Globe2, ActivitySquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useLeadFinder } from "@/features/admin/leads/hooks/useLeadFinder";
import { useSaveLeadToCrm } from "@/features/admin/leads/hooks/useLeadActions";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CARIBBEAN_COUNTRIES = ["Barbados", "Trinidad and Tobago", "Jamaica", "Saint Lucia", "Guyana"];

const scoreBand = (score: number) => {
  if (score >= 75) return { label: "Hot", className: "bg-red-500/10 text-red-600 border-red-300" };
  if (score >= 45) return { label: "Warm", className: "bg-amber-500/10 text-amber-700 border-amber-300" };
  return { label: "Cold", className: "bg-sky-500/10 text-sky-700 border-sky-300" };
};

const LeadFinderPage = () => {
  const [query, setQuery] = useState("optical store");
  const [country, setCountry] = useState("Barbados");
  const [city, setCity] = useState("Bridgetown");
  const [globalSearch, setGlobalSearch] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [minRating, setMinRating] = useState("3.5");
  const [minReviews, setMinReviews] = useState("10");
  const [hasWebsiteOnly, setHasWebsiteOnly] = useState(false);
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

  const runSearch = async () => {
    const providerDiagnosticsSummary = {
      mode: globalSearch ? "global" : "country_city",
      query,
      country: globalSearch ? null : country,
      city: globalSearch ? null : city,
    };

    try {
      await supabase.from("lead_events" as any).insert({
        event_type: "search_executed",
        provider_diagnostics_summary: providerDiagnosticsSummary,
      } as any);
    } catch {
      // silently ignore
    }

    try {
      const result = await finder.mutateAsync({ query, country, cities: [city], globalSearch });
      try {
        await supabase.from("lead_events" as any).insert({
          event_type: "result_rendered",
          provider_diagnostics_summary: {
            ...providerDiagnosticsSummary,
            providers_used: result.diagnostics?.providersUsed ?? [],
            provider_status: result.diagnostics?.providerStatus ?? null,
            results_count: result.leads.length,
            fetched_at: result.diagnostics?.fetchedAt ?? null,
          },
        } as any);
      } catch {
        // silently ignore
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not run lead search.";
      toast({
        title: "Search blocked or failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Lead Finder" icon={Search}>
        <div className="flex gap-2">
          <Button size="sm" onClick={runSearch} disabled={finder.isPending}>Find 50 Leads</Button>
          <Button size="sm" variant="outline" onClick={runSearch} disabled={finder.isPending}>
            <Sparkles className="h-4 w-4 mr-1" /> Smart Batch
          </Button>
        </div>
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Search + Map Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Google Places / FB / Instagram search" />
            <Select value={country} onValueChange={setCountry} disabled={globalSearch}>
              <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                {CARIBBEAN_COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City/Town" disabled={globalSearch} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
            <div>
              <Label className="text-[11px]">Min Rating</Label>
              <Input value={minRating} onChange={(e) => setMinRating(e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[11px]">Min Reviews</Label>
              <Input value={minReviews} onChange={(e) => setMinReviews(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="flex items-center gap-2 h-8">
              <Switch checked={hasWebsiteOnly} onCheckedChange={setHasWebsiteOnly} id="has-website" />
              <Label htmlFor="has-website" className="text-[11px]">Has Website only</Label>
            </div>
            <div className="flex items-center gap-2 h-8">
              <Switch checked={showMap} onCheckedChange={setShowMap} id="map-toggle" />
              <Label htmlFor="map-toggle" className="text-[11px]">Map Toggle</Label>
            </div>
            <div className="flex items-center gap-2 h-8">
              <Switch checked={globalSearch} onCheckedChange={setGlobalSearch} id="global-toggle" />
              <Label htmlFor="global-toggle" className="text-[11px] inline-flex items-center gap-1"><Globe2 className="h-3 w-3" /> Global search</Label>
            </div>
          </div>

          <p className="text-xs inline-flex items-center gap-1 text-muted-foreground"><MapPinned className="h-4 w-4" /> {showMap ? "Map mode enabled (pins integration next)." : "Card mode enabled."}</p>

          <Card className="bg-muted/30">
            <CardContent className="pt-4 space-y-2 text-xs">
              <p className="font-medium inline-flex items-center gap-1"><ActivitySquare className="h-3.5 w-3.5" /> Real-time provider trace</p>
              <p>Mode: <span className="font-medium">{diagnostics?.mode ?? (globalSearch ? "global" : "country_city")}</span></p>
              <p>Query: <span className="font-medium">{query}</span></p>
              <p>Scope: <span className="font-medium">{globalSearch ? "Global" : `${country} / ${city}`}</span></p>
              <div className="flex flex-wrap gap-1">
                {(diagnostics?.providersUsed ?? []).map((p) => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}
              </div>
              {diagnostics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                  <p>Google: {diagnostics.providerStatus.googlePlacesConfigured ? "configured" : "not configured"}</p>
                  <p>Facebook: {diagnostics.providerStatus.facebookGraphConfigured ? "configured" : "not configured"}</p>
                  <p>Instagram: {diagnostics.providerStatus.instagramGraphConfigured ? "configured" : "not configured"}</p>
                  <p>Yellow Pages: {diagnostics.providerStatus.yellowPagesConfigured ? "configured" : "not configured"}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">Run search to display live provider diagnostics.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {displayLeads.map((lead) => {
              const band = scoreBand(lead.score);
              return (
                <div key={lead.id} className="border rounded p-2 space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <p className="font-medium truncate">{lead.name}</p>
                    <Badge className={band.className}>{band.label} · {lead.score}</Badge>
                  </div>
                  <p className="text-muted-foreground">{lead.city || "—"}, {lead.country || "—"}</p>
                  <p>Google: {lead.google_rating ?? "—"} ({lead.google_reviews_count ?? 0})</p>
                  <p>IG/FB: {lead.instagram_handle || lead.facebook_page ? "Active" : "Unknown"}</p>
                  <div className="pt-1 flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-[11px]">Enrich & Preview</Button>
                    <Button
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={async () => {
                        try {
                          await saveLead.mutateAsync(lead);
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
            {!finder.isPending && displayLeads.length === 0 ? <p className="text-xs text-muted-foreground">No leads match current filters.</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadFinderPage;
