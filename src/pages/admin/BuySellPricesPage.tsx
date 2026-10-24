import { type ReactNode, useState } from "react";
import { createPortal } from "react-dom";
import ListCatalogTab from "@/components/admin/ListCatalogTab";
import RxExportBar from "@/components/admin/RxExportBar";
import PricelistLivePreview from "@/components/admin/PricelistLivePreview";
import PdfPreviewShell from "@/components/admin/PdfPreviewShell";
import { useBBDUSDRate, type PricelistVersion } from "@/hooks/usePricelistVersions";

interface BuySellPricesPageProps {
  version: PricelistVersion;
  showUSD: boolean;
  highlightItemId?: string | null;
  onDirtyChange?: (isDirty: boolean) => void;
  headerActionsElement?: HTMLElement | null;
}

const BuySellPricesPage = ({ version, showUSD, highlightItemId, onDirtyChange, headerActionsElement }: BuySellPricesPageProps) => {
  const { data: fxRate = 0.5 } = useBBDUSDRate();
  const [saveBar, setSaveBar] = useState<ReactNode>(null);

  return (
    <div className="space-y-2">
      {headerActionsElement
        ? createPortal(
            <div className="flex flex-wrap items-center justify-end gap-2 no-print">
              <RxExportBar version={version} showUSD={showUSD} fxRate={fxRate} catalogType="buysell" />
              {saveBar}
            </div>,
            headerActionsElement,
          )
        : null}

      <div className="space-y-4">
        <ListCatalogTab
          pageName="Supplies Prices"
          fxRate={fxRate}
          showUSD={showUSD}
          catalogType="buysell"
          lensFilter="none"
          showTreatmentsAddons={false}
          pageTitle={version.name}
          versionId={version.id}
          renderSaveBar={setSaveBar}
          highlightItemId={highlightItemId}
          onDirtyChange={onDirtyChange}
        />

        <div className="mt-6">
          <PdfPreviewShell title={`${version.name} — Supplies Preview`} formatLabel="List">
            <PricelistLivePreview version={version} previewFormat="list" showUSD={showUSD} fxRate={fxRate} catalogType="buysell" />
          </PdfPreviewShell>
        </div>
      </div>
    </div>
  );
};

export default BuySellPricesPage;
