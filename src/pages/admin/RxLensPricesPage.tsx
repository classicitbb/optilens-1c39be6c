import { useState, useCallback, useRef, ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import VersionSelectorPanel from "@/components/admin/VersionSelectorPanel";
import TreatmentMatricesAccordion from "@/components/admin/TreatmentMatricesAccordion";
import ListCatalogTab from "@/components/admin/ListCatalogTab";
import RxExportBar from "@/components/admin/RxExportBar";
import PricelistLivePreview from "@/components/admin/PricelistLivePreview";
import RxAddonsExtrasEditor from "@/components/admin/RxAddonsExtrasEditor";
import { useBBDUSDRate, usePricelistVersions } from "@/hooks/usePricelistVersions";
import { usePriceMatrix } from "@/hooks/usePriceMatrix";
import { useMaterialUpgrades } from "@/hooks/useMaterialUpgrades";
import { usePricelistCatalogRows } from "@/hooks/usePricelistCatalogRows";
import PdfPreviewShell from "@/components/admin/PdfPreviewShell";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RxLensPricesPage = () => {
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
  const [activeTab, setActiveTab] = useState<string>("matrix");

  // Pending matrix→catalog row keys
  const [pendingMatrixRowKeys, setPendingMatrixRowKeys] = useState<Set<string>>(new Set());
  const hasPending = pendingMatrixRowKeys.size > 0;

  // Live Preview
  const [previewFormat, setPreviewFormat] = useState<"matrix" | "list">("list");
  const [showSummaryRows, setShowSummaryRows] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);

  // Save bar from ListCatalogTab (catalog tab)
  const [catalogSaveBar, setCatalogSaveBar] = useState<ReactNode>(null);

  const { toast } = useToast();

  const activeVersion = versions?.find((v) => v.id === selectedVersionId) ?? versions?.[0] ?? null;
  const resolvedId = activeVersion?.id ?? null;

  // Hooks for global Save All (matrix tab)
  const { data: matrixRows, saveMutation: saveMatrix } = usePriceMatrix();
  const { data: materialUpgrades, saveMutation: saveMaterialUpgrades } = useMaterialUpgrades();
  const { saveRows: saveCatalogRows } = usePricelistCatalogRows(resolvedId, "rx");

  const handlePendingChange = useCallback((keys: Set<string>) => {
    setPendingMatrixRowKeys(new Set(keys));
  }, []);

  const handleCatalogSaved = useCallback(() => {
    setPendingMatrixRowKeys(new Set());
  }, []);

  const handleSaveAll = async () => {
    const promises: Promise<any>[] = [];
    if (matrixRows && matrixRows.length > 0) {
      promises.push(saveMatrix.mutateAsync(matrixRows));
    }
    if (materialUpgrades && materialUpgrades.length > 0) {
      promises.push(saveMaterialUpgrades.mutateAsync(materialUpgrades));
    }
    try {
      await Promise.all(promises);
      setPendingMatrixRowKeys(new Set());
      toast({ title: "All changes saved", description: "Price matrix, material upgrades, and catalog saved." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const isSavingAll = saveMatrix.isPending || saveMaterialUpgrades.isPending;

  const handlePreviewClick = (versionId: number) => {
    setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Matrix tab save bar
  const matrixSaveBar = (
    <div className="flex items-center justify-between gap-3 flex-wrap no-print">
      <div className="flex items-center gap-1">
        {hasPending && (
          <span className="flex items-center gap-1.5 text-xs text-destructive">
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            {pendingMatrixRowKeys.size} pending sync{pendingMatrixRowKeys.size > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <Button
        size="sm"
        className="h-8 text-xs gap-1.5 font-semibold"
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
    <VersionSelectorPanel
      pageTitle="RX Lens Prices"
      pageSubtitle="Manage RX lens pricelist versions — matrix, price list, treatments and add-ons."
      selectedVersionId={selectedVersionId}
      onVersionChange={handleVersionChange}
      showUSD={showUSD}
      onShowUSDChange={setShowUSD}
      onPreviewClick={handlePreviewClick}
      saveBar={resolvedId && activeVersion ? activeSaveBar : undefined}
      exportBar={resolvedId && activeVersion ? (
        <RxExportBar version={activeVersion} showUSD={showUSD} fxRate={fxRate} catalogType="rx" />
      ) : undefined}
    >
      {resolvedId && activeVersion && (
        <div className="space-y-4">
          {/* Tabs: Price Matrix | List Catalog */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="h-8">
              <TabsTrigger value="matrix" className="text-xs h-7">Price Matrix Editor</TabsTrigger>
              <TabsTrigger value="catalog" className="text-xs h-7 relative">
                Price List Editor
                {hasPending && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive ring-1 ring-background" />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="matrix" className="space-y-3 mt-2">
              <TreatmentMatricesAccordion
                versionId={resolvedId}
                showUSD={showUSD}
                fxRate={fxRate}
                onPendingChange={handlePendingChange}
              />
            </TabsContent>

            <TabsContent value="catalog" className="mt-2">
              <ListCatalogTab
                pageName="RX Lens Prices"
                fxRate={fxRate}
                showUSD={showUSD}
                catalogType="rx"
                lensFilter="pricelist"
                showTreatmentsAddons={true}
                pageTitle={activeVersion?.name ?? "RX Pricelist"}
                versionId={resolvedId}
                pendingMatrixRowKeys={pendingMatrixRowKeys}
                onSaved={handleCatalogSaved}
                renderSaveBar={setCatalogSaveBar}
              />
            </TabsContent>
          </Tabs>

          {/* ── Live Preview Section ──────────────────────────────────────────── */}
          <div ref={previewRef} className="mt-6">
            <PdfPreviewShell
              title={`${activeVersion.name} — Preview`}
              formatLabel={previewFormat === "matrix" ? "Matrix" : "List"}
              headerRight={
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium transition-colors ${previewFormat === "matrix" ? "text-primary" : "text-muted-foreground"}`}>
                      Matrix
                    </span>
                    <Switch
                      checked={previewFormat === "list"}
                      onCheckedChange={(v) => setPreviewFormat(v ? "list" : "matrix")}
                      aria-label="Toggle preview format"
                    />
                    <span className={`text-xs font-medium transition-colors ${previewFormat === "list" ? "text-primary" : "text-muted-foreground"}`}>
                      List
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium transition-colors ${showSummaryRows ? "text-primary" : "text-muted-foreground"}`}>
                      Summary rows on
                    </span>
                    <Switch
                      checked={showSummaryRows}
                      onCheckedChange={setShowSummaryRows}
                      aria-label="Toggle preview summary rows"
                    />
                    <span className={`text-xs font-medium transition-colors ${!showSummaryRows ? "text-primary" : "text-muted-foreground"}`}>
                      Summary rows off
                    </span>
                  </div>
                </div>
              }
            >
              <PricelistLivePreview
                version={activeVersion}
                previewFormat={previewFormat}
                showUSD={showUSD}
                fxRate={fxRate}
                catalogType="rx"
                showSummaryRows={showSummaryRows}
              />
            </PdfPreviewShell>
          </div>
        </div>
      )}
    </VersionSelectorPanel>
  );
};

export default RxLensPricesPage;
