import { supabase } from "@/integrations/supabase/client";

export type LiveDataOperation =
  | "innovations.customer_account"
  | "innovations.customer_statement"
  | "innovations.customer_orders"
  | "optilens.customer_deliveries";

type GatewayEnvelope<T> = {
  request_id: string;
  status: "pending" | "claimed" | "completed" | "failed" | "expired";
  data?: T;
  error?: string;
  code?: string;
  poll_after_ms?: number;
};

type GatewayErrorPayload = {
  error?: string;
  code?: string;
  status?: string;
};

type LocalGatewayTarget = {
  accountNumber?: string | null;
  innovationsCustomerId?: number | null;
};

type RequestLiveDataOptions = {
  websiteCustomerId?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  localFallbackTarget?: LocalGatewayTarget;
};

function friendlyGatewayMessage(payload: GatewayErrorPayload | null, fallback: string) {
  const code = payload?.code?.toUpperCase();
  const error = payload?.error ?? fallback;
  if (code === "ELOGIN" || /password of the account has expired|login failed/i.test(error)) {
    return "Live billing data is temporarily unavailable while the private data connector is being reauthorized.";
  }
  return error;
}

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
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      const payload = await context.clone().json().catch(() => null) as GatewayErrorPayload | null;
      message = friendlyGatewayMessage(payload, message);
    } else if (context && typeof context === "object" && "error" in context) {
      const contextError = (context as { error?: unknown }).error;
      if (typeof contextError === "string" && contextError.trim()) message = contextError;
    }
    throw new Error(message);
  }
  return data as GatewayEnvelope<T>;
}

const localHostnames = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const isLocalRuntime = () => {
  if (typeof window === "undefined") return false;
  return localHostnames.has(window.location.hostname) || window.location.hostname.endsWith(".local");
};

const isEdgeFunctionTransportError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /Failed to send a request to the Edge Function|FunctionsFetchError|Failed to fetch|fetch failed|NetworkError|Load failed|CORS/i.test(message);
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const localServiceCandidates = () => {
  if (typeof window === "undefined") return [];
  let fromStorage = "";
  try {
    fromStorage = window.localStorage.getItem("optilens.localServiceUrl")?.trim() ?? "";
  } catch {
    fromStorage = "";
  }
  const fromEnv = (import.meta.env.VITE_OPTILENS_LOCAL_SERVICE_URL as string | undefined)?.trim();
  const defaults = [
    "http://127.0.0.1",
    window.location.port === "8080" ? "" : "http://127.0.0.1:8080",
  ].filter(Boolean);

  return Array.from(new Set([fromStorage, fromEnv, ...defaults].filter((value): value is string => Boolean(value)))).map(trimTrailingSlash);
};

async function requestLocalLiveData<T>(
  operation: LiveDataOperation,
  args: Record<string, unknown>,
  options: RequestLiveDataOptions,
): Promise<T> {
  const target = options.localFallbackTarget ?? {};
  const accountNumber = target.accountNumber?.trim();
  if (!accountNumber && !target.innovationsCustomerId) {
    throw new Error("Local live-data fallback needs an account number or Innovations customer ID.");
  }

  const body = JSON.stringify({
    operation,
    arguments: args,
    target: {
      ...(accountNumber ? { account_number: accountNumber } : {}),
      ...(target.innovationsCustomerId ? { innovations_customer_id: target.innovationsCustomerId } : {}),
    },
  });
  const headers = { "Content-Type": "application/json" };
  const errors: string[] = [];

  for (const baseUrl of localServiceCandidates()) {
    try {
      const response = await fetch(`${baseUrl}/api/connectors/live-gateway/direct`, {
        method: "POST",
        headers,
        body,
        signal: options.signal,
      });
      const payload = await response.json().catch(() => null) as { data?: T; error?: string } | T | null;
      if (!response.ok) {
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : `HTTP ${response.status}`;
        throw new Error(message);
      }
      if (payload && typeof payload === "object" && "data" in payload) return payload.data as T;
      return payload as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      errors.push(`${baseUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(`OptiLens Local fallback could not fetch live data. ${errors.join(" | ") || "No local service URL was available."}`);
}

export async function requestLiveData<T>(
  operation: LiveDataOperation,
  args: Record<string, unknown> = {},
  options: RequestLiveDataOptions = {},
): Promise<T> {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 32_000;
  const requestBody = {
    action: "request",
    operation,
    arguments: args,
    ...(options.websiteCustomerId ? { website_customer_id: options.websiteCustomerId } : {}),
  };
  let queued: GatewayEnvelope<T> | T;
  try {
    queued = await invokeGateway<T>(requestBody);
  } catch (error) {
    if (isLocalRuntime() && isEdgeFunctionTransportError(error)) {
      return requestLocalLiveData<T>(operation, args, options);
    }
    throw error;
  }
  if (!isGatewayEnvelope(queued)) return queued as T;
  if (!queued.request_id) throw new Error("The live-data gateway did not return a request ID.");

  while (Date.now() - startedAt < timeoutMs) {
    if (options.signal?.aborted) throw new DOMException("Live-data request was cancelled.", "AbortError");
    await sleep(Math.max(250, queued.poll_after_ms ?? 500), options.signal);
    let status: GatewayEnvelope<T> | T;
    try {
      status = await invokeGateway<T>({ action: "status", request_id: queued.request_id });
    } catch (error) {
      if (isLocalRuntime() && isEdgeFunctionTransportError(error)) {
        return requestLocalLiveData<T>(operation, args, options);
      }
      throw error;
    }
    if (!isGatewayEnvelope(status)) return status as T;
    if (status.status === "completed") return status.data as T;
    if (status.status === "failed" || status.status === "expired") {
      throw new Error(friendlyGatewayMessage(status, "The private live-data source did not answer."));
    }
  }
  throw new Error("The private live-data source did not answer within 32 seconds.");
}
