import { useState } from "react";
import VersionSelectorPanel from "@/components/admin/VersionSelectorPanel";
import ListCatalogTab from "@/components/admin/ListCatalogTab";
import { useBBDUSDRate, usePricelistVersions } from "@/hooks/usePricelistVersions";

const BuySellPricesPage = () => {
  const { data: fxRate = 0.5 } = useBBDUSDRate();
  const { data: versions } = usePricelistVersions();
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [showUSD, setShowUSD] = useState(false);

  const activeVersion = versions?.find((v) => v.id === selectedVersionId) ?? versions?.[0] ?? null;
  const resolvedId = activeVersion?.id ?? null;

  return (
    <VersionSelectorPanel
      pageTitle="Buy / Sell Prices"
      pageSubtitle="Supplies catalog pricelist. Categories auto-group by supply type."
      selectedVersionId={selectedVersionId}
      onVersionChange={setSelectedVersionId}
      showUSD={showUSD}
      onShowUSDChange={setShowUSD}
    >
      {resolvedId && (
        <ListCatalogTab
          fxRate={fxRate}
          showUSD={showUSD}
          catalogType="buysell"
          lensFilter="none"
          showTreatmentsAddons={false}
          pageTitle={activeVersion?.name ?? "Buy / Sell Pricelist"}
          versionId={resolvedId}
        />
      )}
    </VersionSelectorPanel>
  );
};

export default BuySellPricesPage;
