// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// Thin wrapper over the Lovable AI gateway for forced-tool-call requests.
//
// Every AI step in lead-intelligence wants the same thing: a structured object
// back, or nothing. Free-text completions are never useful here, so this only
// supports tool_choice-forced calls and returns the parsed arguments.

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

export const isAiConfigured = () => Boolean(Deno.env.get("LOVABLE_API_KEY")?.trim());

export type ToolSchema = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

/**
 * Calls the gateway and returns the parsed tool arguments.
 * Throws on transport/parse failure so callers can degrade explicitly rather
 * than silently returning an empty result that looks like "no leads found".
 */
export async function callGatewayTool<T>(
  systemPrompt: string,
  userPrompt: string,
  tool: ToolSchema,
): Promise<T> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY")?.trim();
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");

  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{ type: "function", function: tool }],
      tool_choice: { type: "function", function: { name: tool.name } },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) throw new Error("AI_RATE_LIMITED");
    if (response.status === 402) throw new Error("AI_PAYMENT_REQUIRED");
    throw new Error(`AI_GATEWAY_${response.status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw new Error("AI_NO_TOOL_CALL");

  try {
    return JSON.parse(args) as T;
  } catch {
    throw new Error("AI_INVALID_JSON");
  }
}
