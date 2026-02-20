import { useState, useCallback, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import VersionSelectorPanel from "@/components/admin/VersionSelectorPanel";
import TreatmentMatricesAccordion from "@/components/admin/TreatmentMatricesAccordion";
import ListCatalogTab from "@/components/admin/ListCatalogTab";
import RxExportBar from "@/components/admin/RxExportBar";
import PricelistLivePreview from "@/components/admin/PricelistLivePreview";
import { useBBDUSDRate, usePricelistVersions } from "@/hooks/usePricelistVersions";
import { usePriceMatrix } from "@/hooks/usePriceMatrix";
import { useMaterialUpgrades } from "@/hooks/useMaterialUpgrades";
import { usePricelistCatalogRows } from "@/hooks/usePricelistCatalogRows";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const RxLensPricesPage = () => {
  const { data: fxRate = 0.5 } = useBBDUSDRate();
  const { data: versions } = usePricelistVersions();
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [showUSD, setShowUSD] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("matrix");

  // Pending matrix→catalog row keys
  const [pendingMatrixRowKeys, setPendingMatrixRowKeys] = useState<Set<string>>(new Set());
  const hasPending = pendingMatrixRowKeys.size > 0;

  // Live Preview
  const [previewFormat, setPreviewFormat] = useState<"matrix" | "list">("list");
  const previewRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();

  const activeVersion = versions?.find((v) => v.id === selectedVersionId) ?? versions?.[0] ?? null;
  const resolvedId = activeVersion?.id ?? null;

  // Hooks for global Save All
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

  return (
    <VersionSelectorPanel
      pageTitle="RX Lens Prices"
      pageSubtitle="Manage RX lens pricelist versions — matrix, list catalog, and treatments."
      selectedVersionId={selectedVersionId}
      onVersionChange={setSelectedVersionId}
      showUSD={showUSD}
      onShowUSDChange={setShowUSD}
      onPreviewClick={handlePreviewClick}
      exportBar={resolvedId && activeVersion ? (
        <div className="flex items-center justify-between gap-3 flex-wrap no-print">
          <RxExportBar version={activeVersion} showUSD={showUSD} fxRate={fxRate} />
          <div className="flex items-center gap-2">
            {hasPending && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                {pendingMatrixRowKeys.size} pending catalog sync{pendingMatrixRowKeys.size > 1 ? "s" : ""}
              </div>
            )}
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
        </div>
      ) : undefined}
    >
      {resolvedId && activeVersion && (
        <div className="space-y-4">
          {/* Tabs: Price Matrix | List Catalog */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="h-8">
              <TabsTrigger value="matrix" className="text-xs h-7">Price Matrix</TabsTrigger>
              <TabsTrigger value="catalog" className="text-xs h-7 relative">
                List Catalog
                {hasPending && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive ring-1 ring-background" />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="matrix" className="space-y-3 mt-2">
              <div className="px-3 py-1.5 rounded text-xs font-semibold bg-primary/10 text-primary">
                {activeVersion?.name} — Treatment Matrices
              </div>
              <TreatmentMatricesAccordion
                versionId={resolvedId}
                showUSD={showUSD}
                fxRate={fxRate}
                onPendingChange={handlePendingChange}
              />
            </TabsContent>

            <TabsContent value="catalog" className="mt-2">
              <ListCatalogTab
                fxRate={fxRate}
                showUSD={showUSD}
                catalogType="rx"
                lensFilter="pricelist"
                showTreatmentsAddons={true}
                pageTitle={activeVersion?.name ?? "RX Pricelist"}
                versionId={resolvedId}
                pendingMatrixRowKeys={pendingMatrixRowKeys}
                onSaved={handleCatalogSaved}
              />
            </TabsContent>
          </Tabs>

          {/* ── Live Preview Section ──────────────────────────────────────────── */}
          <div ref={previewRef} className="border border-border rounded-lg overflow-hidden mt-6" id="live-preview">
            <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border">
              <div>
                <span className="text-sm font-semibold text-foreground">Live Preview</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  — showing exactly what the customer receives for <strong>{activeVersion.name}</strong>
                </span>
              </div>
              {/* Format toggle */}
              <div className="flex items-center gap-2 no-print">
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
            </div>
            <div className="p-5 bg-background overflow-auto max-h-[70vh]">
              <PricelistLivePreview
                version={activeVersion}
                previewFormat={previewFormat}
                showUSD={showUSD}
                fxRate={fxRate}
              />
            </div>
          </div>
        </div>
      )}
    </VersionSelectorPanel>
  );
};

export default RxLensPricesPage;
