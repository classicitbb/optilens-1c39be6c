import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import TreatmentMatricesAccordion from "@/components/admin/TreatmentMatricesAccordion";
import ListCatalogTab from "@/components/admin/ListCatalogTab";
import RxExportBar from "@/components/admin/RxExportBar";
import PricelistLivePreview from "@/components/admin/PricelistLivePreview";
import { useBBDUSDRate, type PricelistVersion } from "@/hooks/usePricelistVersions";
import { usePriceMatrix } from "@/hooks/usePriceMatrix";
import { useMaterialUpgrades } from "@/hooks/useMaterialUpgrades";
import PdfPreviewShell from "@/components/admin/PdfPreviewShell";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RxLensPricesPageProps {
  version: PricelistVersion;
  showUSD: boolean;
  highlightItemId?: string | null;
  onDirtyChange?: (isDirty: boolean) => void;
  headerActionsElement?: HTMLElement | null;
}

const RxLensPricesPage = ({ version, showUSD, highlightItemId, onDirtyChange, headerActionsElement }: RxLensPricesPageProps) => {
  const { data: fxRate = 0.5 } = useBBDUSDRate();
  const [activeTab, setActiveTab] = useState<string>(highlightItemId ? "catalog" : "matrix");
  const [pendingMatrixRowKeys, setPendingMatrixRowKeys] = useState<Set<string>>(new Set());
  const hasPending = pendingMatrixRowKeys.size > 0;
  const [previewFormat, setPreviewFormat] = useState<"matrix" | "list">("list");
  const [showSummaryRows, setShowSummaryRows] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);
  const [catalogSaveBar, setCatalogSaveBar] = useState<ReactNode>(null);
  const [catalogDirty, setCatalogDirty] = useState(false);
  const { toast } = useToast();

  const { data: matrixRows, saveMutation: saveMatrix } = usePriceMatrix();
  const { data: materialUpgrades, saveMutation: saveMaterialUpgrades } = useMaterialUpgrades();

  useEffect(() => {
    onDirtyChange?.(hasPending || catalogDirty);
  }, [catalogDirty, hasPending, onDirtyChange]);

  const handlePendingChange = useCallback((keys: Set<string>) => {
    setPendingMatrixRowKeys(new Set(keys));
  }, []);

  const handleCatalogSaved = useCallback(() => {
    setPendingMatrixRowKeys(new Set());
  }, []);

  const handleSaveAll = async () => {
    const promises: Promise<unknown>[] = [];
    if (matrixRows && matrixRows.length > 0) promises.push(saveMatrix.mutateAsync(matrixRows));
    if (materialUpgrades && materialUpgrades.length > 0) promises.push(saveMaterialUpgrades.mutateAsync(materialUpgrades));
    try {
      await Promise.all(promises);
      setPendingMatrixRowKeys(new Set());
      toast({ title: "All changes saved", description: "Price matrix, material upgrades, and catalog saved." });
    } catch (error) {
      const description = error instanceof Error ? error.message : "The price changes could not be saved.";
      toast({ title: "Save failed", description, variant: "destructive" });
    }
  };

  const isSavingAll = saveMatrix.isPending || saveMaterialUpgrades.isPending;
  const matrixSaveBar = (
    <div className="flex items-center justify-between gap-2 flex-wrap no-print">
      <div className="flex items-center gap-1">
        {hasPending ? (
          <span className="flex items-center gap-1.5 text-xs text-destructive">
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            {pendingMatrixRowKeys.size} pending sync{pendingMatrixRowKeys.size > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>
      <Button
        size="sm"
        className="h-7 text-[11px] gap-1.5 font-semibold px-2.5"
        variant={hasPending ? "default" : "outline"}
        style={hasPending ? { background: "hsl(215 65% 50%)", color: "white" } : undefined}
        onClick={handleSaveAll}
        disabled={isSavingAll}
      >
        {isSavingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save All Changes
      </Button>
    </div>
  );
  const activeSaveBar = activeTab === "catalog" ? catalogSaveBar : matrixSaveBar;

  return (
    <div className="space-y-2">
      {headerActionsElement
        ? createPortal(
            <div className="flex flex-wrap items-center justify-end gap-2 no-print">
              <RxExportBar version={version} showUSD={showUSD} fxRate={fxRate} catalogType="rx" />
              {activeSaveBar}
            </div>,
            headerActionsElement,
          )
        : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-2">
        <TabsList className="h-7">
          <TabsTrigger value="matrix" className="text-[11px] h-6 px-2.5">Price Matrix Editor</TabsTrigger>
          <TabsTrigger value="catalog" className="text-[11px] h-6 px-2.5 relative">
            Price List Editor
            {hasPending ? <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive ring-1 ring-background" /> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" forceMount className="space-y-2 mt-1 data-[state=inactive]:hidden">
          <TreatmentMatricesAccordion versionId={version.id} showUSD={showUSD} fxRate={fxRate} onPendingChange={handlePendingChange} />
        </TabsContent>

        <TabsContent value="catalog" forceMount className="mt-1 data-[state=inactive]:hidden">
          <ListCatalogTab
            pageName="RX Lens Prices"
            fxRate={fxRate}
            showUSD={showUSD}
            catalogType="rx"
            lensFilter="pricelist"
            showTreatmentsAddons
            pageTitle={version.name}
            versionId={version.id}
            pendingMatrixRowKeys={pendingMatrixRowKeys}
            onSaved={handleCatalogSaved}
            renderSaveBar={setCatalogSaveBar}
            highlightItemId={highlightItemId}
            onDirtyChange={setCatalogDirty}
          />
        </TabsContent>
      </Tabs>

      <div ref={previewRef} className="mt-6">
        <PdfPreviewShell
          title={`${version.name} — Preview`}
          formatLabel={previewFormat === "matrix" ? "Matrix" : "List"}
          headerRight={
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium transition-colors ${previewFormat === "matrix" ? "text-primary" : "text-muted-foreground"}`}>Matrix</span>
                <Switch checked={previewFormat === "list"} onCheckedChange={(value) => setPreviewFormat(value ? "list" : "matrix")} aria-label="Toggle preview format" />
                <span className={`text-xs font-medium transition-colors ${previewFormat === "list" ? "text-primary" : "text-muted-foreground"}`}>List</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium transition-colors ${showSummaryRows ? "text-primary" : "text-muted-foreground"}`}>Summary rows on</span>
                <Switch checked={showSummaryRows} onCheckedChange={setShowSummaryRows} aria-label="Toggle preview summary rows" />
                <span className={`text-xs font-medium transition-colors ${!showSummaryRows ? "text-primary" : "text-muted-foreground"}`}>Summary rows off</span>
              </div>
            </div>
          }
        >
          <PricelistLivePreview version={version} previewFormat={previewFormat} showUSD={showUSD} fxRate={fxRate} catalogType="rx" showSummaryRows={showSummaryRows} />
        </PdfPreviewShell>
      </div>
    </div>
  );
};

export default RxLensPricesPage;
