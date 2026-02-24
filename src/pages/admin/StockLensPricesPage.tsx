import { useState, useRef, ReactNode } from "react";

import VersionSelectorPanel from "@/components/admin/VersionSelectorPanel";
import ListCatalogTab from "@/components/admin/ListCatalogTab";
import RxExportBar from "@/components/admin/RxExportBar";
import PricelistLivePreview from "@/components/admin/PricelistLivePreview";
import PdfPreviewShell from "@/components/admin/PdfPreviewShell";
import { useBBDUSDRate, usePricelistVersions } from "@/hooks/usePricelistVersions";

const StockLensPricesPage = () => {
  const { data: fxRate = 0.5 } = useBBDUSDRate();
  const { data: versions } = usePricelistVersions();
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(() => {
    const stored = localStorage.getItem("admin-selected-version-id");
    return stored ? Number(stored) : null;
  });

  const handleVersionChange = (id: number | null) => {
    setSelectedVersionId(id);
    if (id !== null) localStorage.setItem("admin-selected-version-id", String(id));
  };
  const [showUSD, setShowUSD] = useState(false);
  const previewFormat = "list" as const;
  const previewRef = useRef<HTMLDivElement>(null);
  const [saveBar, setSaveBar] = useState<ReactNode>(null);

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
      onVersionChange={handleVersionChange}
      showUSD={showUSD}
      onShowUSDChange={setShowUSD}
      onPreviewClick={handlePreviewClick}
      saveBar={saveBar}
      exportBar={resolvedId && activeVersion ? (
        <RxExportBar version={activeVersion} showUSD={showUSD} fxRate={fxRate} catalogType="stock" />
      ) : undefined}
    >
      {resolvedId && activeVersion && (
        <div className="space-y-4">
          <ListCatalogTab
            pageName="Stock Lens Prices"
            fxRate={fxRate}
            showUSD={showUSD}
            catalogType="stock"
            lensFilter="wspl"
            showTreatmentsAddons={false}
            pageTitle={activeVersion?.name ?? "Stock Lens Pricelist"}
            versionId={resolvedId}
            renderSaveBar={setSaveBar}
          />

          {/* Live Preview */}
          <div ref={previewRef} className="mt-6">
            <PdfPreviewShell
              title={`${activeVersion.name} — Stock Lens Preview`}
              formatLabel="List"
            >
              <PricelistLivePreview
                version={activeVersion}
                previewFormat={previewFormat}
                showUSD={showUSD}
                fxRate={fxRate}
                catalogType="stock"
              />
            </PdfPreviewShell>
          </div>
        </div>
      )}
    </VersionSelectorPanel>
  );
};

export default StockLensPricesPage;
