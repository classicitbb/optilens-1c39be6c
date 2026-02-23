import { useState, useRef } from "react";

import VersionSelectorPanel from "@/components/admin/VersionSelectorPanel";
import ListCatalogTab from "@/components/admin/ListCatalogTab";
import RxExportBar from "@/components/admin/RxExportBar";
import PricelistLivePreview from "@/components/admin/PricelistLivePreview";
import { useBBDUSDRate, usePricelistVersions } from "@/hooks/usePricelistVersions";

const StockLensPricesPage = () => {
  const { data: fxRate = 0.5 } = useBBDUSDRate();
  const { data: versions } = usePricelistVersions();
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [showUSD, setShowUSD] = useState(false);
  const previewFormat = "list" as const;
  const previewRef = useRef<HTMLDivElement>(null);

  const activeVersion = versions?.find((v) => v.id === selectedVersionId) ?? versions?.[0] ?? null;
  const resolvedId = activeVersion?.id ?? null;

  const handlePreviewClick = () => {
    setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <VersionSelectorPanel
      pageTitle="Stock Lens Prices"
      pageSubtitle="Semi-finished stock lenses for wholesale (WSPL). Grouped by MF Type."
      selectedVersionId={selectedVersionId}
      onVersionChange={setSelectedVersionId}
      showUSD={showUSD}
      onShowUSDChange={setShowUSD}
      onPreviewClick={handlePreviewClick}
      exportBar={resolvedId && activeVersion ? (
        <RxExportBar version={activeVersion} showUSD={showUSD} fxRate={fxRate} catalogType="stock" />
      ) : undefined}
    >
      {resolvedId && activeVersion && (
        <div className="space-y-4">
          <ListCatalogTab
            fxRate={fxRate}
            showUSD={showUSD}
            catalogType="stock"
            lensFilter="wspl"
            showTreatmentsAddons={false}
            pageTitle={activeVersion?.name ?? "Stock Lens Pricelist"}
            versionId={resolvedId}
          />

          {/* Live Preview */}
          <div ref={previewRef} className="border border-border rounded-lg overflow-hidden mt-6" id="live-preview">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border">
              <div>
                <span className="text-sm font-semibold text-foreground">Live Preview</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  — showing exactly what the customer receives for <strong>{activeVersion.name}</strong>
                </span>
              </div>
              <span className="text-xs font-medium text-primary">List</span>
            </div>
            <div className="p-5 bg-background overflow-auto max-h-[70vh]">
              <PricelistLivePreview
                version={activeVersion}
                previewFormat={previewFormat}
                showUSD={showUSD}
                fxRate={fxRate}
                catalogType="stock"
              />
            </div>
          </div>
        </div>
      )}
    </VersionSelectorPanel>
  );
};

export default StockLensPricesPage;
