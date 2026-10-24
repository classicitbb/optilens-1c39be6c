import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ListCatalogTab from "@/components/admin/ListCatalogTab";
import StockSkuPricingTab from "@/components/admin/StockSkuPricingTab";
import RxExportBar from "@/components/admin/RxExportBar";
import PricelistLivePreview from "@/components/admin/PricelistLivePreview";
import PdfPreviewShell from "@/components/admin/PdfPreviewShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBBDUSDRate, type PricelistVersion } from "@/hooks/usePricelistVersions";
import type { PricelistCatalogRow } from "@/hooks/usePricelistCatalogRows";

interface StockLensPricesPageProps {
  version: PricelistVersion;
  showUSD: boolean;
  highlightItemId?: string | null;
  onDirtyChange?: (isDirty: boolean) => void;
  headerActionsElement?: HTMLElement | null;
}

const StockLensPricesPage = ({ version, showUSD, highlightItemId, onDirtyChange, headerActionsElement }: StockLensPricesPageProps) => {
  const { data: fxRate = 0.5 } = useBBDUSDRate();
  const [saveBar, setSaveBar] = useState<ReactNode>(null);
  const [liveCatalogRows, setLiveCatalogRows] = useState<Omit<PricelistCatalogRow, "id">[] | null>(null);
  const [listDirty, setListDirty] = useState(false);
  const [skuDirty, setSkuDirty] = useState(false);

  useEffect(() => {
    onDirtyChange?.(listDirty || skuDirty);
  }, [listDirty, onDirtyChange, skuDirty]);

  return (
    <div className="space-y-2">
      {headerActionsElement
        ? createPortal(
            <div className="flex flex-wrap items-center justify-end gap-2 no-print">
              <RxExportBar version={version} showUSD={showUSD} fxRate={fxRate} catalogType="stock" />
              {saveBar}
            </div>,
            headerActionsElement,
          )
        : null}

      <Tabs defaultValue="wspl" className="w-full">
        <TabsList>
          <TabsTrigger value="wspl">WSPL Stock List</TabsTrigger>
          <TabsTrigger value="stock-skus">Stock Order SKUs</TabsTrigger>
        </TabsList>

        <TabsContent value="wspl" forceMount className="data-[state=inactive]:hidden">
          <div className="space-y-4">
            <ListCatalogTab
              pageName="Stock Lens Prices"
              fxRate={fxRate}
              showUSD={showUSD}
              catalogType="stock"
              lensFilter="wspl"
              showTreatmentsAddons={false}
              pageTitle={version.name}
              versionId={version.id}
              renderSaveBar={setSaveBar}
              onRowsChange={setLiveCatalogRows}
              highlightItemId={highlightItemId}
              onDirtyChange={setListDirty}
            />

            <div className="mt-6">
              <PdfPreviewShell title={`${version.name} — Stock Lens Preview`} formatLabel="List">
                <PricelistLivePreview
                  version={version}
                  previewFormat="list"
                  showUSD={showUSD}
                  fxRate={fxRate}
                  catalogType="stock"
                  liveCatalogRows={liveCatalogRows}
                />
              </PdfPreviewShell>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stock-skus" forceMount className="data-[state=inactive]:hidden">
          <StockSkuPricingTab versionId={version.id} onDirtyChange={setSkuDirty} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StockLensPricesPage;
