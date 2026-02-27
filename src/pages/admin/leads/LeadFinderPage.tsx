import { useMemo, useState } from "react";
import { Search, MapPinned, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useLeadFinder } from "@/features/admin/leads/hooks/useLeadFinder";

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
  const finder = useLeadFinder();

  const leads = finder.data ?? [];
  const smartBatch = useMemo(() => [...leads].sort((a, b) => b.score - a.score).slice(0, 20), [leads]);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Lead Finder" icon={Search}>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => finder.mutate({ query, country, cities: [city] })}
            disabled={finder.isPending}
          >
            Find 50 Leads
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => finder.mutate({ query, country, cities: [city] })}
            disabled={finder.isPending}
          >
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
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                {CARIBBEAN_COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City/Town" />
          </div>

          <p className="text-xs inline-flex items-center gap-1 text-muted-foreground"><MapPinned className="h-4 w-4" /> Map toggle to be added next with Google Maps pins.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {(smartBatch.length > 0 ? smartBatch : leads).map((lead) => {
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
                  <div className="pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-[11px]">Enrich & Preview</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadFinderPage;
