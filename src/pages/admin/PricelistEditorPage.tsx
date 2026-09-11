import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, Loader2, Tags } from "lucide-react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePricelistVersions } from "@/hooks/usePricelistVersions";
import {
  buildPricelistEditorPath,
  isPricelistEditorSection,
  type PricelistEditorSection,
} from "@/features/pricelists/routes";

const RxLensPricesPage = lazyWithRetry(() => import("@/pages/admin/RxLensPricesPage"));
const StockLensPricesPage = lazyWithRetry(() => import("@/pages/admin/StockLensPricesPage"));
const BuySellPricesPage = lazyWithRetry(() => import("@/pages/admin/BuySellPricesPage"));

const SECTION_LABELS: Record<PricelistEditorSection, string> = {
  rx: "RX Lens Prices",
  stock: "Stock Lens Prices",
  supplies: "Supplies Prices",
};

const LEAVE_WARNING = "You have unsaved price changes. Leave this editor and discard them?";

const PricelistEditorShell = () => {
  const { versionId, section: sectionParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: versions = [], isLoading } = usePricelistVersions();
  const parsedVersionId = Number(versionId);
  const version = versions.find((candidate) => candidate.id === parsedVersionId) ?? null;
  const section: PricelistEditorSection = isPricelistEditorSection(sectionParam) ? sectionParam : "rx";
  const highlightItemId = searchParams.get("id");
  const [showUSD, setShowUSD] = useState(false);
  const [sectionActionsElement, setSectionActionsElement] = useState<HTMLDivElement | null>(null);
  const [visitedSections, setVisitedSections] = useState<Set<PricelistEditorSection>>(() => new Set([section]));
  const [dirtySections, setDirtySections] = useState<Record<PricelistEditorSection, boolean>>({
    rx: false,
    stock: false,
    supplies: false,
  });
  const allowUnloadRef = useRef(false);
  const hasUnsavedChanges = dirtySections.rx || dirtySections.stock || dirtySections.supplies;

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowUnloadRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const editorPathPrefix = version ? `/admin/pricing/pricelists/${version.id}/` : null;
  const isThisEditorPath = useCallback(
    (pathname: string) => editorPathPrefix !== null && pathname.startsWith(editorPathPrefix),
    [editorPathPrefix],
  );

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const navigationTarget = target.closest("a[href], [data-navigation-target]");
      if (!(navigationTarget instanceof HTMLElement)) return;
      if (navigationTarget instanceof HTMLAnchorElement && (navigationTarget.target === "_blank" || navigationTarget.hasAttribute("download"))) return;
      const destination = navigationTarget instanceof HTMLAnchorElement
        ? navigationTarget.href
        : navigationTarget.dataset.navigationTarget;
      if (!destination) return;
      const targetUrl = new URL(destination, window.location.href);
      if (targetUrl.origin === window.location.origin && isThisEditorPath(targetUrl.pathname)) return;
      if (window.confirm(LEAVE_WARNING)) {
        allowUnloadRef.current = true;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [hasUnsavedChanges, isThisEditorPath]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const currentUrl = `${location.pathname}${location.search}${location.hash}`;
    const handlePopState = () => {
      if (isThisEditorPath(window.location.pathname)) return;
      if (window.confirm(LEAVE_WARNING)) return;
      window.history.pushState(window.history.state, "", currentUrl);
      window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [hasUnsavedChanges, isThisEditorPath, location.hash, location.pathname, location.search]);

  const setSectionDirty = useCallback((targetSection: PricelistEditorSection, isDirty: boolean) => {
    setDirtySections((previous) => previous[targetSection] === isDirty
      ? previous
      : { ...previous, [targetSection]: isDirty });
  }, []);
  const handleRxDirty = useCallback((isDirty: boolean) => setSectionDirty("rx", isDirty), [setSectionDirty]);
  const handleStockDirty = useCallback((isDirty: boolean) => setSectionDirty("stock", isDirty), [setSectionDirty]);
  const handleSuppliesDirty = useCallback((isDirty: boolean) => setSectionDirty("supplies", isDirty), [setSectionDirty]);

  const handleExit = () => {
    if (hasUnsavedChanges && !window.confirm(LEAVE_WARNING)) return;
    navigate("/admin/pricing/pricelists");
  };

  const handleSectionChange = (value: string) => {
    if (!version || !isPricelistEditorSection(value)) return;
    setVisitedSections((previous) => {
      if (previous.has(value)) return previous;
      const next = new Set(previous);
      next.add(value);
      return next;
    });
    navigate(buildPricelistEditorPath(version.id, value, highlightItemId));
  };

  const createdLabel = version?.created_at
    ? new Date(version.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "Unknown";

  const mountedSections = new Set(visitedSections);
  mountedSections.add(section);

  if (!isLoading && version && !isPricelistEditorSection(sectionParam)) {
    return <Navigate to={buildPricelistEditorPath(version.id, "rx", highlightItemId)} replace />;
  }

  if (isLoading) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (!version || !Number.isInteger(parsedVersionId)) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
        <Tags className="h-8 w-8 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold">Pricelist not found</h1>
          <p className="text-sm text-muted-foreground">Choose an existing pricelist before editing prices.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/pricing/pricelists")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Pricelists
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="outline" size="sm" className="h-8 shrink-0" onClick={handleExit}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Pricelists
          </Button>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">You are editing</p>
            <h1 className="truncate text-lg font-semibold text-foreground">{version.name}</h1>
            <p className="text-[10px] text-muted-foreground">{version.base_currency ?? "BBD"} · Created {createdLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasUnsavedChanges ? <span className="mr-2 text-xs font-medium text-amber-600">Unsaved changes</span> : null}
          <span className={`text-[10px] font-medium ${showUSD ? "text-muted-foreground" : "text-primary"}`}>BBD</span>
          <Switch checked={showUSD} onCheckedChange={setShowUSD} aria-label="Toggle currency" />
          <span className={`text-[10px] font-medium ${showUSD ? "text-primary" : "text-muted-foreground"}`}>USD</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={section} onValueChange={handleSectionChange}>
          <TabsList className="h-9">
            {(["rx", "stock", "supplies"] as const).map((value) => (
              <TabsTrigger key={value} value={value} className="relative text-xs">
                {SECTION_LABELS[value]}
                {dirtySections[value] ? <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500" /> : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div ref={setSectionActionsElement} className="ml-auto flex min-h-7 flex-wrap items-center justify-end gap-2" />
      </div>

      {mountedSections.has("rx") ? (
        <div hidden={section !== "rx"} aria-hidden={section !== "rx"}>
          <Suspense fallback={<Loader2 className="m-6 h-5 w-5 animate-spin text-muted-foreground" />}>
            <RxLensPricesPage
              version={version}
              showUSD={showUSD}
              highlightItemId={section === "rx" ? highlightItemId : null}
              onDirtyChange={handleRxDirty}
              headerActionsElement={section === "rx" ? sectionActionsElement : null}
            />
          </Suspense>
        </div>
      ) : null}
      {mountedSections.has("stock") ? (
        <div hidden={section !== "stock"} aria-hidden={section !== "stock"}>
          <Suspense fallback={<Loader2 className="m-6 h-5 w-5 animate-spin text-muted-foreground" />}>
            <StockLensPricesPage
              version={version}
              showUSD={showUSD}
              highlightItemId={section === "stock" ? highlightItemId : null}
              onDirtyChange={handleStockDirty}
              headerActionsElement={section === "stock" ? sectionActionsElement : null}
            />
          </Suspense>
        </div>
      ) : null}
      {mountedSections.has("supplies") ? (
        <div hidden={section !== "supplies"} aria-hidden={section !== "supplies"}>
          <Suspense fallback={<Loader2 className="m-6 h-5 w-5 animate-spin text-muted-foreground" />}>
            <BuySellPricesPage
              version={version}
              showUSD={showUSD}
              highlightItemId={section === "supplies" ? highlightItemId : null}
              onDirtyChange={handleSuppliesDirty}
              headerActionsElement={section === "supplies" ? sectionActionsElement : null}
            />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
};

const PricelistEditorPage = () => {
  const { versionId } = useParams();
  return <PricelistEditorShell key={versionId ?? "missing"} />;
};

export default PricelistEditorPage;
