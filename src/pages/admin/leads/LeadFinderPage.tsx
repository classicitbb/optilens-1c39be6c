import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Sparkles, ExternalLink, Star, ChevronDown } from "lucide-react";
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
import {
  useClearLeadLink,
  useConfirmLeadLink,
  useMarkCurrentCustomer,
  useSaveLeadToCrm,
  type ContactSearchResult,
} from "@/features/admin/leads/hooks/useLeadActions";
import LeadCrmPanel, { type StaffOption } from "@/features/admin/leads/components/LeadCrmPanel";
import type { LeadCrmState, LeadRecord, LeadScoreFactor } from "@/features/admin/leads/types";
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
    "No lead data providers are configured. Add a Google Places or Firecrawl credential in CRM → Settings → Lead Providers, then search again.",
  provider_failures:
    "Every configured provider failed. Check the provider trace below for the error, then verify credentials and quotas.",
  no_matches:
    "The providers returned nothing for this brief. Try naming the business type and place more plainly, or widen the area.",
  only_current_customers:
    "Every match is already a current customer, so they were left out. Turn on \u201cShow current customers\u201d to see them.",
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
  const confirmLink = useConfirmLeadLink();
  const markCustomer = useMarkCurrentCustomer();
  const clearLink = useClearLeadLink();
  const { toast } = useToast();
  const [showCustomers, setShowCustomers] = useState(false);
  const [lastBrief, setLastBrief] = useState("");
  const [crmOverrides, setCrmOverrides] = useState<Record<string, LeadCrmState>>({});
  const [savedLeads, setSavedLeads] = useState<Record<string, { createdContact: boolean; taskCreated: boolean }>>({});
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);

  const { data: staff = [] } = useQuery({
    queryKey: ["lead-finder-staff"],
    queryFn: async (): Promise<StaffOption[]> => {
      const { data, error } = await (supabase as any).rpc("list_staff_names");
      if (error) throw error;
      return (data ?? []) as StaffOption[];
    },
  });
  const { data: currentUserId = null } = useQuery({
    queryKey: ["lead-finder-current-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const leads = (finder.data?.leads ?? []).map((lead) =>
    lead.identity_key && crmOverrides[lead.identity_key] ? { ...lead, crm: crmOverrides[lead.identity_key] } : lead
  );
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

  const runSearch = async (searchBrief: string, includeCustomers = showCustomers) => {
    const trimmed = searchBrief.trim();
    if (!trimmed) return;
    try {
      setLastBrief(trimmed);
      setCrmOverrides({});
      await finder.mutateAsync({ brief: trimmed, showCurrentCustomers: includeCustomers });
    } catch (e: any) {
      toast({
        title: "Search failed",
        description: e?.message || "Unable to run lead search right now.",
        variant: "destructive",
      });
    }
  };

  const withBusy = async (lead: LeadRecord, action: () => Promise<void>, failure: string) => {
    setBusyLeadId(lead.id);
    try {
      await action();
    } catch (e: any) {
      toast({ title: failure, description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setBusyLeadId(null);
    }
  };

  const setOverride = (lead: LeadRecord, crm: LeadCrmState) =>
    setCrmOverrides((prev) => ({ ...prev, [lead.identity_key ?? crm.identityKey]: crm }));

  const handleLink = (lead: LeadRecord, contact: ContactSearchResult) =>
    withBusy(lead, async () => {
      await confirmLink.mutateAsync({ lead, contactId: contact.id });
      const isCustomer = contact.is_customer === true || contact.linked_customer_id != null;
      setOverride(lead, {
        ...lead.crm!,
        status: "matched",
        suggestions: [],
        isCurrentCustomer: isCustomer,
        customerSource: isCustomer ? "crm_record" : null,
        match: {
          contactId: contact.id,
          contactName: contact.name ?? contact.business_name ?? "Contact",
          businessName: contact.business_name,
          isCustomer,
          basis: "confirmed_link",
          confirmed: true,
          reason: isCustomer
            ? "You linked this business to a current customer; future searches will leave it out."
            : "You linked this business to this contact.",
        },
      });
      toast({
        title: "Contact linked",
        description: isCustomer ? "Current customers are excluded from later searches." : "Future searches will recognise this business.",
      });
    }, "Link failed");

  const handleMarkCustomer = (lead: LeadRecord) =>
    withBusy(lead, async () => {
      await markCustomer.mutateAsync(lead);
      setOverride(lead, { ...lead.crm!, status: "customer_marked", match: null, isCurrentCustomer: true, customerSource: "manual_mark" });
      toast({ title: "Marked as current customer", description: "Excluded from later searches. No contact was created." });
    }, "Could not mark customer");

  const handleClear = (lead: LeadRecord) =>
    withBusy(lead, async () => {
      await clearLink.mutateAsync(lead.identity_key!);
      setOverride(lead, {
        ...lead.crm!,
        status: lead.crm!.suggestions.length > 0 ? "suggested" : "none",
        match: null,
        isCurrentCustomer: false,
        customerSource: null,
      });
      toast({ title: "Link removed", description: "The contact itself was not changed." });
    }, "Could not remove link");

  const handleSave = (lead: LeadRecord, input: Parameters<ComponentProps<typeof LeadCrmPanel>["onSave"]>[0]) =>
    withBusy(lead, async () => {
      const result = await saveLead.mutateAsync({ lead: { ...lead, score: scoreForSave(lead) }, ...input });
      const taskCreated = !!result.task_id && input.followUp.needsFollowUp;
      setSavedLeads((prev) => ({ ...prev, [lead.id]: { createdContact: result.created_contact, taskCreated } }));
      toast({
        title: result.already_saved ? "Updated in CRM" : "Saved to CRM",
        description: `${lead.name} ${result.created_contact ? "created as a new contact" : "saved to the existing contact"}${taskCreated ? " with a follow-up task" : ""}.`,
      });
    }, "Save failed");

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

      {diagnostics && diagnostics.crmLookup?.ok === false ? (
        <div role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          CRM matching failed ({diagnostics.crmLookup.error ?? "unknown error"}). Current customers are not filtered and saving is paused
          so no duplicate contact is created. Search again to retry.
        </div>
      ) : null}

      {finder.data ? (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="inline-flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={showCustomers}
              disabled={finder.isPending}
              onChange={(e) => {
                setShowCustomers(e.target.checked);
                if (lastBrief) void runSearch(lastBrief, e.target.checked);
              }}
            />
            Show current customers
          </label>
          {!showCustomers && (diagnostics?.excludedCustomerCount ?? 0) > 0 ? (
            <span className="text-muted-foreground">
              {diagnostics!.excludedCustomerCount} current customer{diagnostics!.excludedCustomerCount === 1 ? "" : "s"} excluded
            </span>
          ) : null}
        </div>
      ) : null}

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

                </div>

                <LeadCrmPanel
                  lead={lead}
                  staff={staff}
                  currentUserId={currentUserId}
                  busy={busyLeadId === lead.id}
                  saved={savedLeads[lead.id] ?? null}
                  onLinkContact={(contact) => handleLink(lead, contact)}
                  onMarkCustomer={() => handleMarkCustomer(lead)}
                  onClearLink={() => handleClear(lead)}
                  onSave={(input) => handleSave(lead, input)}
                />
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
