import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileDown, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import PackageBuilderPanel from "@/features/admin/catalog-publisher-v2/components/PackageBuilderPanel";
import ProposalPreviewPanel from "@/features/admin/catalog-publisher-v2/components/ProposalPreviewPanel";
import SectionEditor from "@/features/admin/catalog-publisher-v2/components/SectionEditor";
import { useCatalogPublisherContext } from "@/features/admin/catalog-publisher-v2/hooks/useCatalogPublisherContext";
import { usePriceCatalogItems } from "@/features/admin/catalog-publisher-v2/hooks/usePriceCatalogItems";
import { useProposalDraft } from "@/features/admin/catalog-publisher-v2/hooks/useProposalDraft";
import { exportClinicalProposalPdf } from "@/features/admin/catalog-publisher-v2/hooks/usePdfExport";

const CatalogPublisherV2Page = () => {
  const context = useCatalogPublisherContext();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: items = [], isLoading } = usePriceCatalogItems();
  const { lines, sections, addItem, removeItem, updateQty, updateSection, total } = useProposalDraft(context);

  const byId = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return items.filter((item) => {
      if (!s) return true;
      return [item.name, item.sku, item.category, item.description].filter(Boolean).join(" ").toLowerCase().includes(s);
    });
  }, [items, search]);

  const attachMutation = useMutation({
    mutationFn: async () => {
      if (!context.opportunityId) throw new Error("No opportunity context provided");
      const payload = {
        proposal_type: "custom_package",
        generated_at: new Date().toISOString(),
        context,
        lines,
        sections,
        total,
      };
      const { error } = await (supabase.from("opportunity_attachments") as any)
        .insert({ opportunity_id: context.opportunityId, attachment_type: "proposal", payload } as any);
      if (error) throw error;
    },
    onSuccess: () => toast({ title: "Attached", description: "Proposal was attached to opportunity." }),
    onError: (e: any) => toast({ title: "Attach failed", description: e?.message ?? "Unable to attach.", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Proposals" icon={FileDown}>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportClinicalProposalPdf({
                accountLabel: context.country || context.opportunityId || "General",
                lines,
                sections,
                total,
              })
            }
          >
            <FileDown className="h-4 w-4 mr-1" /> Export PDF
          </Button>
          <Button onClick={() => attachMutation.mutate()} disabled={!context.opportunityId || attachMutation.isPending}>
            <Link2 className="h-4 w-4 mr-1" /> Attach to Opportunity
          </Button>
        </div>
      </AdminPageHeader>

      {(context.opportunityId || context.leadId || context.country || context.volumeTier) && (
        <div className="rounded border bg-muted/20 p-2 text-xs">
          Prefill context · Opportunity: {context.opportunityId || "—"} · Lead: {context.leadId || "—"} · Country: {context.country || "—"} · Volume: {context.volumeTier || "—"}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-4 space-y-3">
          <PackageBuilderPanel items={filtered} search={search} onSearch={setSearch} onAdd={addItem} />

          <section className="border rounded-md p-3 space-y-2 bg-background">
            <h3 className="text-sm font-semibold">Proposal Sections</h3>
            {sections.map((section) => (
              <SectionEditor key={section.key} section={section} onChange={(v) => updateSection(section.key, v)} />
            ))}
          </section>
        </div>

        <div className="xl:col-span-8">
          <ProposalPreviewPanel
            lines={lines}
            sections={sections}
            total={total}
            onDropItem={(id) => {
              const item = byId[id];
              if (item) addItem(item);
            }}
            onQtyChange={updateQty}
            onRemove={removeItem}
          />
        </div>
      </div>

      {isLoading ? <p className="text-xs text-muted-foreground">Loading price catalog…</p> : null}
    </div>
  );
};

export default CatalogPublisherV2Page;
