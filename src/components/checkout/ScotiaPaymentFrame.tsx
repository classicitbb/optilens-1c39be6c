// ============================================================
// ScotiaPaymentFrame — embedded Scotia eCom+ hosted payment (IFRAME mode)
// ------------------------------------------------------------
// STASHED — NOT CURRENTLY MOUNTED ANYWHERE. test.ipg-online.com refuses to
// be framed cross-origin (X-Frame-Options / frame-ancestors on Fiserv's
// side, confirmed 2026-07), so checkout and the statement page both use the
// full-page "Direct Sale" redirect flow instead (see scotiaConnect.ts:
// redirectToScotiaPayment + supabase/functions/scotia-return).
//
// This component is kept intact, unimported, in case Fiserv ever enables
// cross-origin embedding for this StoreID and IFRAME mode becomes viable
// again. To re-enable: import it back into the Step 3 payment panel in
// CheckoutPage.tsx in place of the redirect notice, and swap
// redirectToScotiaPayment for submitScotiaForm at the call site.
//
// Original design: renders the gateway inside an iframe so the buyer never
// leaves the checkout page (manual page 2 + 12–13). Listens for the
// gateway's postMessage, validates the response server-side, then calls
// back with the outcome. The parent decides what to do (settle order, show
// retry, etc.).
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
  /** Used when the gateway refuses cross-origin framing for this StoreID. */
  onFallback: (prepared: Awaited<ReturnType<typeof prepareScotiaPayment>>) => void;
}

const FRAME_LOAD_TIMEOUT_MS = 12_000;

const ScotiaPaymentFrame = ({ payment, onResult, onError, onFallback }: ScotiaPaymentFrameProps) => {
  const frameName = `scotia-frame-${useId().replace(/[:]/g, "")}`;
  const containerRef = useRef<HTMLIFrameElement | null>(null);
  const [loading, setLoading] = useState(true);
  const fallbackSent = useRef(false);
  const loaded = useRef(false);
  const frameWasFocused = useRef(false);
  const preparedRef = useRef<Awaited<ReturnType<typeof prepareScotiaPayment>> | null>(null);

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
        preparedRef.current = prepared;
        submitScotiaForm(prepared, frameName);
        // A blocked Chromium frame is rendered as an internal error document
        // and exposes no contentWindow. Poll briefly because its load event
        // can fire before the error document replaces the initial about:blank.
        const blockedFrameCheck = window.setInterval(() => {
          if (cancelled || fallbackSent.current) {
            window.clearInterval(blockedFrameCheck);
            return;
          }
          if (containerRef.current?.contentWindow === null) {
            fallbackSent.current = true;
            window.clearInterval(blockedFrameCheck);
            onFallback(prepared);
          }
        }, 250);
        // Browsers do not expose a useful error event when a third-party page
        // is blocked by frame-ancestors/X-Frame-Options. Treat a frame that
        // never loads as a real failure and continue in the supported
        // top-level redirect flow.
        window.setTimeout(() => {
          // A real hosted form becomes focusable as soon as the buyer starts
          // entering card details. A refused/error frame cannot, so redirect
          // only when the iframe has remained unusable for the grace period.
          if (!cancelled && (payment.testMode || !frameWasFocused.current) && !fallbackSent.current) {
            fallbackSent.current = true;
            window.clearInterval(blockedFrameCheck);
            onFallback(prepared);
          }
        }, payment.testMode ? 1_500 : FRAME_LOAD_TIMEOUT_MS);
      } catch (err) {
        if (!cancelled) onError(err instanceof Error ? err.message : "Could not start payment.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chromium emits this on the embedding document when the gateway's CSP
  // rejects frame-ancestors. Unlike iframe.onerror, it is reliable for the
  // common X-Frame-Options/frame-ancestors failure mode.
  useEffect(() => {
    const receiveCspViolation = (event: SecurityPolicyViolationEvent) => {
      const directive = `${event.violatedDirective} ${event.effectiveDirective}`.toLowerCase();
      if (!directive.includes("frame")) return;
      const prepared = preparedRef.current;
      if (!prepared || fallbackSent.current) return;
      fallbackSent.current = true;
      onFallback(prepared);
    };
    document.addEventListener("securitypolicyviolation", receiveCspViolation);
    return () => document.removeEventListener("securitypolicyviolation", receiveCspViolation);
  }, [onFallback]);

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
          onLoad={(event) => {
            const prepared = preparedRef.current;
            // Chromium renders a blocked cross-origin frame as an internal
            // error page. It fires `load`, but has no contentWindow; a real
            // cross-origin hosted page does. This is the reliable signal for
            // Fiserv's "refused to connect" response.
            if (prepared && event.currentTarget.contentWindow === null) {
              if (!fallbackSent.current) {
                fallbackSent.current = true;
                onFallback(prepared);
              }
              return;
            }
            loaded.current = true;
            setLoading(false);
          }}
          onError={() => {
            const prepared = preparedRef.current;
            if (prepared && !fallbackSent.current) {
              fallbackSent.current = true;
              onFallback(prepared);
            }
          }}
          onFocus={() => {
            frameWasFocused.current = true;
          }}
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
