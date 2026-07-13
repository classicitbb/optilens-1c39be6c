// ============================================================
// Scotia eCom+ (IPG Connect) — frontend client helper
// ------------------------------------------------------------
// SCAFFOLD. Talks to the `scotia-payment` Edge Function which holds the
// SharedSecret. The browser never sees the secret and never computes a hash.
//
// Flow (IFRAME mode, manual pages 12–13):
//   1. prepareScotiaPayment() → { gatewayUrl, formParams } (incl. hashExtended)
//   2. submitScotiaForm()      → builds a hidden form targeting the iframe and
//                                POSTs it to the gateway.
//   3. <ScotiaPaymentFrame>    → listens for the gateway postMessage and
//                                forwards the buyer to success / fail.
//
// Enable with VITE_SCOTIA_ENABLED=true. When disabled, checkout shows only the
// existing offline methods + on-account (the permanent fallback).
// ============================================================

import { supabase } from "@/integrations/supabase/client";

/** Gateway origin used to validate inbound postMessage events (manual page 12). */
export const SCOTIA_TEST_ORIGIN = "https://test.ipg-online.com";
export const SCOTIA_PROD_ORIGIN = "https://www.ipg-online.com";

/** Master feature flag. Off by default → non-breaking. */
export const isScotiaEnabled = (): boolean =>
  String(import.meta.env.VITE_SCOTIA_ENABLED ?? "").toLowerCase() === "true";

export const scotiaGatewayOrigin = (): string =>
  String(import.meta.env.VITE_SCOTIA_ENV ?? "test").toLowerCase() === "production"
    ? SCOTIA_PROD_ORIGIN
    : SCOTIA_TEST_ORIGIN;

export interface PreparePaymentInput {
  chargetotal: number;
  responseSuccessURL: string;
  responseFailURL: string;
  /** Page URL hosting the iframe. Required for IFRAME mode. */
  hostURI: string;
  /** Internal order reference (becomes the gateway `oid`). */
  orderId?: string;
  // Tokenization
  assignToken?: boolean;
  hosteddataid?: string;
  // MSI
  numberOfInstallments?: number;
  installmentsInterest?: boolean;
  installmentDelayMonths?: number;
  // Recurring
  recurringInstallmentCount?: number;
  recurringInstallmentPeriod?: "day" | "week" | "month" | "year";
  recurringInstallmentFrequency?: number;
  recurringComments?: string;
  ponumber?: string;
}

export interface PreparedPayment {
  gatewayUrl: string;
  formParams: Record<string, string>;
}

/** Ask the Edge Function to build the signed form parameters. */
export async function prepareScotiaPayment(input: PreparePaymentInput): Promise<PreparedPayment> {
  const { data, error } = await supabase.functions.invoke("scotia-payment", {
    body: { action: "prepare", ...input },
  });
  if (error) throw new Error(error.message || "Failed to prepare Scotia payment");
  if (!data?.gatewayUrl || !data?.formParams) {
    throw new Error((data as { error?: string })?.error || "Malformed prepare response");
  }
  return data as PreparedPayment;
}

/**
 * Build a hidden form from prepared params and POST it into the iframe.
 * Mirrors the Direct/IFRAME sale form shape in the manual (pages 11–13).
 */
export function submitScotiaForm(prepared: PreparedPayment, iframeName: string): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = prepared.gatewayUrl;
  form.target = iframeName;
  form.style.display = "none";

  for (const [name, value] of Object.entries(prepared.formParams)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  // Leave the form in the DOM briefly so the POST completes, then clean up.
  setTimeout(() => form.remove(), 0);
}

/** Result surfaced after we validate a gateway response server-side. */
export interface ScotiaValidationResult {
  hashValid: boolean;
  approved: boolean;
  softDecline: boolean;
  associationResponseCode: string;
  failRc: string | null;
  oid: string | null;
  /** Present when assignToken was used → save against the customer. */
  hosteddataid: string | null;
}

/** Validate a raw gateway response (POST params) via the Edge Function. */
export async function validateScotiaResponse(
  response: Record<string, string>,
): Promise<ScotiaValidationResult> {
  const { data, error } = await supabase.functions.invoke("scotia-payment", {
    body: { action: "validate", response },
  });
  if (error) throw new Error(error.message || "Failed to validate Scotia response");
  return data as ScotiaValidationResult;
}
