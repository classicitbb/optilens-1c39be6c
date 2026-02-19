import { useState } from "react";
import { useBBDUSDRate } from "@/hooks/usePricelistVersions";
import { Switch } from "@/components/ui/switch";
import ListCatalogTab from "@/components/admin/ListCatalogTab";

const BLUE = "hsl(215 65% 50%)";
const LABEL_COLOR = "hsl(215 15% 40%)";

const BuySellPricesPage = () => {
  const { data: fxRate = 0.5 } = useBBDUSDRate();
  const [showUSD, setShowUSD] = useState(false);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "hsl(215 30% 15%)" }}>
            Buy / Sell Prices
          </h1>
          <p className="text-xs mt-0.5" style={{ color: LABEL_COLOR }}>
            Supplies and accessories pricelist. Categories auto-split by supply type.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium" style={{ color: showUSD ? LABEL_COLOR : BLUE }}>BBD</span>
          <Switch checked={showUSD} onCheckedChange={setShowUSD} aria-label="Toggle currency" />
          <span className="text-[10px] font-medium" style={{ color: showUSD ? BLUE : LABEL_COLOR }}>USD</span>
        </div>
      </div>

      <ListCatalogTab
        fxRate={fxRate}
        showUSD={showUSD}
        groupByFinishThenMf={false}
        lensFilter="none"
        suppliesOnly={true}
        pageTitle="Buy / Sell Price List"
      />
    </div>
  );
};

export default BuySellPricesPage;
