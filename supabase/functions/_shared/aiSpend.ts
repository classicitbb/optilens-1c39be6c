// Deno runtime global; declared locally because this file is typechecked by the app's tsconfig.
declare const Deno: { env: { get(key: string): string | undefined } };

/** Best-effort, content-free usage telemetry. Never change the caller's result. */
export async function recordAiSpend(event: {
  provider: "anthropic" | "lovable-ai" | "google-document-ai";
  product: string;
  functionName: string;
  model?: string | null;
  httpStatus: number;
  usage?: Record<string, unknown> | null;
  units?: number | null;
}): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;
  const number = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
  const input = number(event.usage?.input_tokens ?? event.usage?.prompt_tokens);
  const output = number(event.usage?.output_tokens ?? event.usage?.completion_tokens);
  try {
    const response = await fetch(`${url}/rest/v1/ai_spend_events`, {
      method: "POST",
      signal: AbortSignal.timeout(1500),
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        provider: event.provider,
        product: event.product,
        function_name: event.functionName,
        model: event.model ?? null,
        http_status: event.httpStatus,
        input_tokens: input,
        output_tokens: output,
        units: event.units ?? null,
      }),
    });
    if (!response.ok) console.error("AI usage telemetry unavailable", response.status);
  } catch (error) {
    console.error("AI usage telemetry unavailable", error instanceof Error ? error.name : "unknown");
  }
}
