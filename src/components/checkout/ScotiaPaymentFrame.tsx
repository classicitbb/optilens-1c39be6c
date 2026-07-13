// ============================================================
// ScotiaPaymentFrame — embedded Scotia eCom+ hosted payment (IFRAME mode)
// ------------------------------------------------------------
// SCAFFOLD. Renders the gateway inside an iframe so the buyer never leaves
// the checkout page (manual page 2 + 12–13). Listens for the gateway's
// postMessage, validates the response server-side, then calls back with the
// outcome. The parent decides what to do (settle order, show retry, etc.).
//
// Only mounted when VITE_SCOTIA_ENABLED=true AND the buyer picks the Scotia
// method. The existing offline methods remain as the fallback path.
// ============================================================

import { useEffect, useId, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  prepareScotiaPayment,
  submitScotiaForm,
  scotiaGatewayOrigin,
  validateScotiaResponse,
  type PreparePaymentInput,
  type ScotiaValidationResult,
} from "@/lib/payments/scotiaConnect";

interface ScotiaPaymentFrameProps {
  /** Everything except hostURI, which we fill from the current page. */
  payment: Omit<PreparePaymentInput, "hostURI">;
  onResult: (result: ScotiaValidationResult, raw: Record<string, string>) => void;
  onError: (message: string) => void;
}

const ScotiaPaymentFrame = ({ payment, onResult, onError }: ScotiaPaymentFrameProps) => {
  const frameName = `scotia-frame-${useId().replace(/[:]/g, "")}`;
  const containerRef = useRef<HTMLIFrameElement | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Prepare + submit the signed form into the iframe.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prepared = await prepareScotiaPayment({
          ...payment,
          hostURI: window.location.href,
        });
        if (cancelled) return;
        submitScotiaForm(prepared, frameName);
      } catch (err) {
        if (!cancelled) onError(err instanceof Error ? err.message : "Could not start payment.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Receive the gateway's postMessage (manual page 12), validate, report.
  useEffect(() => {
    const expectedOrigin = scotiaGatewayOrigin();
    async function receiveMessage(event: MessageEvent) {
      if (event.origin !== expectedOrigin) return; // ignore everything else
      const raw = extractResponseParams(event.data);
      if (!raw) return;
      setLoading(true);
      try {
        const result = await validateScotiaResponse(raw);
        onResult(result, raw);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Payment validation failed.");
      }
    }
    window.addEventListener("message", receiveMessage, false);
    return () => window.removeEventListener("message", receiveMessage, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
        Secure payment processed by Scotiabank. Your card details never touch our servers.
      </div>
      <div className="relative overflow-hidden rounded-lg border border-border bg-card">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/70">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}
        <iframe
          ref={containerRef}
          name={frameName}
          title="Scotia eCom+ secure payment"
          className="h-[520px] w-full"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
};

/**
 * The gateway posts its response payload as the `event.data`. The manual's
 * sample reads `event.data.elementArr` (an array of {name,value}) plus a
 * redirectURL. We accept either an elementArr or a flat object of POST params.
 */
function extractResponseParams(data: unknown): Record<string, string> | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.elementArr)) {
    const out: Record<string, string> = {};
    for (const el of d.elementArr as Array<{ name?: string; value?: string }>) {
      if (el?.name) out[el.name] = String(el.value ?? "");
    }
    return out;
  }
  // Fallback: treat the payload itself as the param bag if it looks like one.
  if (typeof d.response_hash === "string" || typeof d.approval_code === "string") {
    return Object.fromEntries(
      Object.entries(d).map(([k, v]) => [k, String(v ?? "")]),
    );
  }
  return null;
}

export default ScotiaPaymentFrame;
