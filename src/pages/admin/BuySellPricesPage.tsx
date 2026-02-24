import { useState, useRef, ReactNode } from "react";

import VersionSelectorPanel from "@/components/admin/VersionSelectorPanel";
import ListCatalogTab from "@/components/admin/ListCatalogTab";
import RxExportBar from "@/components/admin/RxExportBar";
import PricelistLivePreview from "@/components/admin/PricelistLivePreview";
import PdfPreviewShell from "@/components/admin/PdfPreviewShell";
import { useBBDUSDRate, usePricelistVersions } from "@/hooks/usePricelistVersions";

const BuySellPricesPage = () => {
  const { data: fxRate = 0.5 } = useBBDUSDRate();
  const { data: versions } = usePricelistVersions();
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
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
      pageTitle="Supplies Prices"
      pageSubtitle="Supplies catalog pricelist. Categories auto-group by supply type."
      selectedVersionId={selectedVersionId}
      onVersionChange={setSelectedVersionId}
      showUSD={showUSD}
      onShowUSDChange={setShowUSD}
      onPreviewClick={handlePreviewClick}
      saveBar={saveBar}
      exportBar={resolvedId && activeVersion ? (
        <RxExportBar version={activeVersion} showUSD={showUSD} fxRate={fxRate} catalogType="buysell" />
      ) : undefined}
    >
      {resolvedId && activeVersion && (
        <div className="space-y-4">
          <ListCatalogTab
            pageName="Supplies Prices"
            fxRate={fxRate}
            showUSD={showUSD}
            catalogType="buysell"
            lensFilter="none"
            showTreatmentsAddons={false}
            pageTitle={activeVersion?.name ?? "Supplies Pricelist"}
            versionId={resolvedId}
            renderSaveBar={setSaveBar}
          />

          {/* Live Preview */}
          <div ref={previewRef} className="mt-6">
            <PdfPreviewShell
              title={`${activeVersion.name} — Supplies Preview`}
              formatLabel="List"
            >
              <PricelistLivePreview
                version={activeVersion}
                previewFormat={previewFormat}
                showUSD={showUSD}
                fxRate={fxRate}
                catalogType="buysell"
              />
            </PdfPreviewShell>
          </div>
        </div>
      )}
    </VersionSelectorPanel>
  );
};

export default BuySellPricesPage;
