import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import VersionSelectorPanel from "@/components/admin/VersionSelectorPanel";
import TreatmentMatricesAccordion from "@/components/admin/TreatmentMatricesAccordion";
import ListCatalogTab from "@/components/admin/ListCatalogTab";
import MatrixExportBar from "@/components/admin/MatrixExportBar";
import { useBBDUSDRate, usePricelistVersions } from "@/hooks/usePricelistVersions";

const RxLensPricesPage = () => {
  const { data: fxRate = 0.5 } = useBBDUSDRate();
  const { data: versions } = usePricelistVersions();
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [showUSD, setShowUSD] = useState(false);

  const activeVersion = versions?.find((v) => v.id === selectedVersionId) ?? versions?.[0] ?? null;
  const resolvedId = activeVersion?.id ?? null;

  return (
    <VersionSelectorPanel
      pageTitle="RX Lens Prices"
      pageSubtitle="Manage RX lens pricelist versions — matrix, list catalog, and treatments."
      selectedVersionId={selectedVersionId}
      onVersionChange={setSelectedVersionId}
      showUSD={showUSD}
      onShowUSDChange={setShowUSD}
    >
      {resolvedId && (
        <Tabs defaultValue="catalog" className="space-y-4">
          <TabsList className="h-8">
            <TabsTrigger value="matrix" className="text-xs h-7">Price Matrix</TabsTrigger>
            <TabsTrigger value="catalog" className="text-xs h-7">List Catalog</TabsTrigger>
            <TabsTrigger value="treatments" className="text-xs h-7">Treatments &amp; Add-ons</TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="space-y-3 mt-2">
            <div className="px-3 py-1.5 rounded text-xs font-semibold bg-primary/10 text-primary">
              {activeVersion?.name} — Treatment Matrices
            </div>
            <MatrixExportBar showUSD={showUSD} fxRate={fxRate} />
            <TreatmentMatricesAccordion
              versionId={resolvedId}
              showUSD={showUSD}
              fxRate={fxRate}
            />
          </TabsContent>

          <TabsContent value="catalog" className="mt-2">
            <ListCatalogTab
              fxRate={fxRate}
              showUSD={showUSD}
              catalogType="rx"
              lensFilter="pricelist"
              showTreatmentsAddons={false}
              pageTitle={activeVersion?.name ?? "RX Pricelist"}
              versionId={resolvedId}
            />
          </TabsContent>

          <TabsContent value="treatments" className="mt-2">
            <ListCatalogTab
              fxRate={fxRate}
              showUSD={showUSD}
              catalogType="rx"
              lensFilter="none"
              showTreatmentsAddons={true}
              pageTitle={`${activeVersion?.name ?? "RX"} — Treatments & Add-ons`}
              versionId={resolvedId}
            />
          </TabsContent>
        </Tabs>
      )}
    </VersionSelectorPanel>
  );
};

export default RxLensPricesPage;
