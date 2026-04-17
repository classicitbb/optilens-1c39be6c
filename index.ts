import { streamText } from "ai";
import { config } from "dotenv";

config({ path: ".env.local" });

if (
  !process.env.AI_GATEWAY_API_KEY ||
  process.env.AI_GATEWAY_API_KEY === "your_ai_gateway_api_key_here"
) {
  throw new Error("Missing AI_GATEWAY_API_KEY. Add it to .env.local before running this script.");
}

async function main() {
  const result = streamText({
    model: "openai/gpt-5.4",
    prompt: "Invent a practical AI Gateway smoke test and describe what it verifies.",
  });

  for await (const textPart of result.textStream) {
    process.stdout.write(textPart);
  }

  console.log();
  console.log("Token usage:", await result.usage);
  console.log("Finish reason:", await result.finishReason);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
