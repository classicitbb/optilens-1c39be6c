import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import QuotePdfExport, { QuotePdfExportHandle, QuotePreviewPanel } from "@/components/admin/QuotePdfExport";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuoteLines, useQuotes, type QuoteLine, type RxDetail } from "@/hooks/useQuotes";
import { supabase } from "@/integrations/supabase/client";
import { resolvePrintSettings } from "@/features/admin/print/printStyles";
import { getPersistedPrintSettings, savePersistedPrintSettings } from "@/features/admin/print/printSettingsStore";
import type { PrintSettings } from "@/features/admin/print/types";
import { ArrowLeft, Save, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const parseFrameData = (notes: string | null | undefined) => {
  const match = (notes ?? "").match(/\[\[FRAME:(.*?)\]\]/s);
  if (!match) return null;
  try {
    const frame = JSON.parse(match[1]);
    return {
      ref: frame.ref ?? "",
      model: frame.model ?? "",
      bridge: frame.bridge ?? "",
      ed: frame.ed ?? "",
      a: frame.a ?? "",
      b: frame.b ?? "",
      dbl: frame.dbl ?? "",
      uncut: !!frame.uncut,
      uncutPrice: frame.uncutPrice ?? "",
    };
  } catch {
    return null;
  }
};

const computeTotals = (lines: QuoteLine[], frameData: ReturnType<typeof parseFrameData>) => {
  const subtotalSell = lines.reduce((sum, line) => sum + (line.qty * line.unit_sell_price_bbd), 0);
  const totalLandedCost = lines
    .filter((line) => line.line_type !== "Fee" && line.line_type !== "Discount")
    .reduce((sum, line) => sum + (line.qty * line.unit_cost_landed_bbd), 0);
  const gpAmount = subtotalSell - totalLandedCost;
  const gpPercent = subtotalSell > 0 ? (gpAmount / subtotalSell) * 100 : 0;
  const edgingFee = frameData?.ref && !frameData.uncut ? 20 : 0;

  return {
    subtotalSell,
    totalLandedCost,
    gpAmount,
    gpPercent,
    grandTotal: subtotalSell + edgingFee,
  };
};

const QuotePrintPreviewPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: quotes = [], updateMutation } = useQuotes();
  const { data: lines = [] } = useQuoteLines(id);
  const quote = quotes.find((row) => row.id === id);
  const printSettingsProfileId = `quote:${id ?? "draft"}:print-layout`;
  const [printSettings, setPrintSettings] = useState<PrintSettings>(
    getPersistedPrintSettings(printSettingsProfileId, { paperSize: "A4", orientation: "portrait" }),
  );
  const [isSaving, setIsSaving] = useState(false);
  const pdfRef = useRef<QuotePdfExportHandle | null>(null);

  const frameData = useMemo(() => parseFrameData(quote?.notes_internal), [quote?.notes_internal]);
  const totals = useMemo(() => computeTotals(lines, frameData), [lines, frameData]);
  const lensLineIds = useMemo(() => lines.filter((line) => line.line_type === "Lens").map((line) => line.id), [lines]);

  const { data: rxMap = {} } = useQuery({
    queryKey: ["quote-print-preview-rx", id, lensLineIds.join(",")],
    queryFn: async () => {
      if (!lensLineIds.length) return {} as Record<string, RxDetail>;
      const { data, error } = await supabase.from("rx_details").select("*").in("quote_line_id", lensLineIds);
      if (error) throw error;
      return (data ?? []).reduce((acc, rx) => {
        acc[rx.quote_line_id] = rx as RxDetail;
        return acc;
      }, {} as Record<string, RxDetail>);
    },
    enabled: !!quote && lensLineIds.length > 0,
  });

  if (!quote) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-primary" />
      </div>
    );
  }

  const persistQuote = async () => {
    try {
      setIsSaving(true);
      await updateMutation.mutateAsync({
        id: quote.id,
        updates: {
          subtotal_sell: totals.subtotalSell,
          total_landed_cost: totals.totalLandedCost,
          gp_amount: totals.gpAmount,
          gp_percent: totals.gpPercent,
          grand_total: totals.grandTotal,
        },
      });
      toast({ title: "Quote saved" });
    } catch (error: any) {
      toast({
        title: "Failed to save quote",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintSettingsChange = (next: PrintSettings) => {
    const resolved = resolvePrintSettings(next);
    setPrintSettings(savePersistedPrintSettings(printSettingsProfileId, resolved));
  };

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Print / Preview</h1>
          <p className="text-xs text-muted-foreground">{quote.quote_number} · {quote.customer_name || "Untitled quote"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => navigate(`/admin/sales/quotations/${quote.id}`)}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Editor
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={persistQuote} disabled={isSaving}>
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => pdfRef.current?.triggerPrint()}>
            Print / Save as PDF
          </Button>
          <Button variant="secondary" size="sm" className="h-8 text-xs gap-1.5" onClick={() => navigate("/admin/sales/quotations")}> 
            <X className="h-3.5 w-3.5" />
            Close
          </Button>
        </div>
      </div>

      <QuotePreviewPanel
        quote={quote}
        lines={lines}
        totals={totals}
        rxMap={rxMap}
        frameData={frameData}
        printSettings={printSettings}
        onPrintSettingsChange={handlePrintSettingsChange}
      />

      <div style={{ position: "absolute", left: "-9999px", top: 0, visibility: "hidden" }}>
        <QuotePdfExport
          ref={pdfRef}
          quote={quote}
          lines={lines}
          totals={totals}
          rxMap={rxMap}
          frameData={frameData}
          printSettings={printSettings}
          printSettingsProfileId={printSettingsProfileId}
          showTriggerButton={false}
        />
      </div>
    </div>
  );
};

export default QuotePrintPreviewPage;
