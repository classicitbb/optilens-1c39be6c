import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowRight, HelpCircle, RefreshCw } from "lucide-react";

interface CurrencyFxSectionProps {
  baseCurrency: string;
  fxRates: Record<string, number>;
  fxRiskBuffer: number;
  disabled?: boolean;
  onBaseCurrencyChange: (v: string) => void;
  onFxRateChange: (currency: string, engineRate: number) => void;
  onFxRiskBufferChange: (v: number) => void;
}

const CURRENCIES = ["BBD", "USD"];

const toPercent = (v: number) => +(v * 100).toFixed(4);
const fromPercent = (v: number) => +(v / 100).toFixed(6);

/**
 * Redesigned Currency & FX section.
 *
 * Display format:  1 [Base] = [input] [Foreign]
 * Storage format:  fxRates[Foreign] = 1 / displayValue  (engine multiplier: foreign→base)
 *
 * The pricing engine does:  converted_cost = supplier_cost * fxRates[currency]
 * So fxRates["USD"] = 2 means 1 USD → 2 BBD.
 * We display the inverse for readability: 1 BBD = 0.5000 USD.
 */
const CurrencyFxSection = ({
  baseCurrency,
  fxRates,
  fxRiskBuffer,
  disabled,
  onBaseCurrencyChange,
  onFxRateChange,
  onFxRiskBufferChange,
}: CurrencyFxSectionProps) => {
  const foreignCurrencies = CURRENCIES.filter((c) => c !== baseCurrency);

  // Convert engine rate (foreign→base multiplier) to display rate (base→foreign)
  const getDisplayRate = (currency: string): number => {
    const engineRate = fxRates[currency] ?? 1;
    return engineRate > 0 ? +(1 / engineRate).toFixed(4) : 0;
  };

  // Convert display rate back to engine rate
  const setDisplayRate = (currency: string, displayRate: number) => {
    const engineRate = displayRate > 0 ? +(1 / displayRate).toFixed(6) : 1;
    onFxRateChange(currency, engineRate);
  };

  // Live preview calculations
  const preview = useMemo(() => {
    const foreign = foreignCurrencies[0];
    if (!foreign) return null;

    const engineRate = fxRates[foreign] ?? 1;
    const displayRate = engineRate > 0 ? 1 / engineRate : 0;
    const bufferedRate = displayRate * (1 - fxRiskBuffer);
    const exampleBase = 100;
    const exampleForeign = +(exampleBase * bufferedRate).toFixed(2);
    const exampleForeignNoBuffer = +(exampleBase * displayRate).toFixed(2);

    return { foreign, displayRate, bufferedRate, exampleBase, exampleForeign, exampleForeignNoBuffer };
  }, [fxRates, fxRiskBuffer, foreignCurrencies]);

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Currency & FX</h3>
      </div>

      {/* Base Currency */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Base Currency</Label>
        <Select value={baseCurrency} onValueChange={onBaseCurrencyChange} disabled={disabled}>
          <SelectTrigger className="h-9 w-32 text-xs font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground">
          All retail prices are stored and displayed in {baseCurrency}.
        </p>
      </div>

      {/* Exchange Rates */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Exchange Rates</Label>
        {foreignCurrencies.map((fc) => {
          const displayVal = getDisplayRate(fc);
          return (
            <div
              key={fc}
              className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5"
            >
              <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                1 {baseCurrency}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                className="h-8 w-24 text-xs text-center font-mono"
                type="number"
                step="0.0001"
                min="0"
                value={displayVal}
                onChange={(e) => setDisplayRate(fc, +e.target.value)}
                disabled={disabled}
              />
              <span className="text-xs font-semibold text-foreground">{fc}</span>
            </div>
          );
        })}
      </div>

      {/* FX Risk Buffer */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">FX Risk Buffer</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px] text-xs">
                This percentage is subtracted from the exchange rate to protect against bank fees and currency fluctuations.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            className="h-8 w-24 text-xs font-mono"
            type="number"
            step="0.1"
            value={toPercent(fxRiskBuffer)}
            onChange={(e) => onFxRiskBufferChange(fromPercent(+e.target.value))}
            disabled={disabled}
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
      </div>

      {/* Conversion Preview */}
      {preview && (
        <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 space-y-1">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">Conversion Preview</p>
          <p className="text-xs text-foreground">
            <span className="font-mono font-medium">{preview.exampleBase} {baseCurrency}</span>
            {" "}={" "}
            <span className="font-mono font-medium">{preview.exampleForeignNoBuffer} {preview.foreign}</span>
            <span className="text-muted-foreground"> at spot rate</span>
          </p>
          <p className="text-xs text-foreground">
            <span className="font-mono font-medium">{preview.exampleBase} {baseCurrency}</span>
            {" "}={" "}
            <span className="font-mono font-medium">{preview.exampleForeign} {preview.foreign}</span>
            <span className="text-muted-foreground"> after {toPercent(fxRiskBuffer)}% buffer</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default CurrencyFxSection;
