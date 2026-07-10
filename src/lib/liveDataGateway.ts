import { supabase } from "@/integrations/supabase/client";

export type LiveDataOperation =
  | "innovations.customer_account"
  | "innovations.customer_statement"
  | "optilens.customer_deliveries";

type GatewayEnvelope<T> = {
  request_id: string;
  status: "pending" | "claimed" | "completed" | "failed" | "expired";
  data?: T;
  error?: string;
  poll_after_ms?: number;
};

function isGatewayEnvelope<T>(value: GatewayEnvelope<T> | T): value is GatewayEnvelope<T> {
  return !!value && typeof value === "object" && "request_id" in value;
}

const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  const onAbort = () => {
    globalThis.clearTimeout(timer);
    reject(new DOMException("Live-data request was cancelled.", "AbortError"));
  };
  const timer = globalThis.setTimeout(() => {
    signal?.removeEventListener("abort", onAbort);
    resolve();
  }, ms);
  signal?.addEventListener("abort", onAbort, { once: true });
});

async function invokeGateway<T>(body: Record<string, unknown>): Promise<GatewayEnvelope<T> | T> {
  const { data, error } = await supabase.functions.invoke("live-data-gateway", { body });
  if (error) {
    let message = error.message || "Live-data gateway request failed.";
    const context = (error as { context?: Response }).context;
    if (context) {
      const payload = await context.clone().json().catch(() => null) as { error?: string } | null;
      if (payload?.error) message = payload.error;
    }
    throw new Error(message);
  }
  return data as GatewayEnvelope<T>;
}

export async function requestLiveData<T>(
  operation: LiveDataOperation,
  args: Record<string, unknown> = {},
  options: { websiteCustomerId?: number; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 32_000;
  const queued = await invokeGateway<T>({
    action: "request",
    operation,
    arguments: args,
    ...(options.websiteCustomerId ? { website_customer_id: options.websiteCustomerId } : {}),
  });
  if (!isGatewayEnvelope(queued)) return queued as T;
  if (!queued.request_id) throw new Error("The live-data gateway did not return a request ID.");

  while (Date.now() - startedAt < timeoutMs) {
    if (options.signal?.aborted) throw new DOMException("Live-data request was cancelled.", "AbortError");
    await sleep(Math.max(250, queued.poll_after_ms ?? 500), options.signal);
    const status = await invokeGateway<T>({ action: "status", request_id: queued.request_id });
    if (!isGatewayEnvelope(status)) return status as T;
    if (status.status === "completed") return status.data as T;
    if (status.status === "failed" || status.status === "expired") {
      throw new Error(status.error || "The private live-data source did not answer.");
    }
  }
  throw new Error("The private live-data source did not answer within 32 seconds.");
}
