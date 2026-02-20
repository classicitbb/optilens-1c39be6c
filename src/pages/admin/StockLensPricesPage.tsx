import { useState } from "react";
import VersionSelectorPanel from "@/components/admin/VersionSelectorPanel";
import ListCatalogTab from "@/components/admin/ListCatalogTab";
import { useBBDUSDRate, usePricelistVersions } from "@/hooks/usePricelistVersions";

const StockLensPricesPage = () => {
  const { data: fxRate = 0.5 } = useBBDUSDRate();
  const { data: versions } = usePricelistVersions();
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [showUSD, setShowUSD] = useState(false);

  const activeVersion = versions?.find((v) => v.id === selectedVersionId) ?? versions?.[0] ?? null;
  const resolvedId = activeVersion?.id ?? null;

  return (
    <VersionSelectorPanel
      pageTitle="Stock Lens Prices"
      pageSubtitle="Semi-finished stock lenses for wholesale (WSPL). Grouped by MF Type."
      selectedVersionId={selectedVersionId}
      onVersionChange={setSelectedVersionId}
      showUSD={showUSD}
      onShowUSDChange={setShowUSD}
    >
      {resolvedId && (
        <ListCatalogTab
          fxRate={fxRate}
          showUSD={showUSD}
          catalogType="stock"
          lensFilter="wspl"
          showTreatmentsAddons={false}
          pageTitle={activeVersion?.name ?? "Stock Lens Pricelist"}
          versionId={resolvedId}
        />
      )}
    </VersionSelectorPanel>
  );
};

export default StockLensPricesPage;
