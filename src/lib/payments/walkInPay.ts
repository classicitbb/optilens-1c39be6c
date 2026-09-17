// ============================================================
// Customer-device walk-in payments — public client helper
// ------------------------------------------------------------
// Talks to the `walkin-pay` Edge Function, which is the only thing that can
// read a walk-in payment for an anonymous browser. `anon` has no direct access
// to walk_in_payments, so everything here goes through that function.
//
// The browser never sees the SharedSecret and never computes a hash; it
// receives already-signed form parameters and posts them to Scotia's hosted
// page via the shared redirectToScotiaPayment().
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import type { PreparedPayment } from "@/lib/payments/scotiaConnect";

/** What a customer is shown so they can recognise their own payment. */
export interface WalkInPaymentSummary {
  customerName: string;
  amount: number;
  currency: string;
  reason: string | null;
  hasEmail: boolean;
}

export interface WalkInPaySettings {
  selfServeEnabled: boolean;
  minAmount: number;
  maxAmount: number;
}

/** A link reference is either an emailed token or a typed claim code. */
export type WalkInLinkRef = { token: string } | { code: string };

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("walkin-pay", { body });
  // A non-2xx from the function surfaces as `error`, but the readable reason is
  // in the response body — surface that rather than "Edge Function returned a
  // non-2xx status code".
  if (error) {
    const detail = (data as { error?: string } | null)?.error;
    throw new Error(detail || error.message || "Something went wrong.");
  }
  if ((data as { error?: string } | null)?.error) {
    throw new Error((data as { error: string }).error);
  }
  return data as T;
}

export async function fetchWalkInPaySettings(): Promise<WalkInPaySettings> {
  return invoke<WalkInPaySettings>({ action: "settings" });
}

/** Looks up a payment WITHOUT spending the link, so the customer can confirm it. */
export async function resolveWalkInPayment(ref: WalkInLinkRef): Promise<WalkInPaymentSummary> {
  const { payment } = await invoke<{ payment: WalkInPaymentSummary }>({ action: "resolve", ...ref });
  return payment;
}

/** Spends the link and returns the signed gateway form. */
export async function startWalkInPayment(
  ref: WalkInLinkRef,
  customerEmail?: string,
): Promise<PreparedPayment> {
  return invoke<PreparedPayment>({
    action: "start",
    ...ref,
    ...(customerEmail ? { customerEmail } : {}),
  });
}

export async function startSelfServePayment(input: {
  customerName: string;
  customerEmail?: string;
  amount: number;
  reason?: string;
  turnstileToken?: string;
}): Promise<PreparedPayment> {
  return invoke<PreparedPayment>({ action: "self-serve", ...input });
}

/** Formats a stored gateway currency code for a customer-facing screen. */
export const formatWalkInAmount = (amount: number, currency: string): string => {
  const code = currency === "052" ? "BBD" : currency;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(amount);
};
