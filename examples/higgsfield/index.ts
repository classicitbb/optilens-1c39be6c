import { config as loadEnv } from "dotenv";
import { config, higgsfield } from "@higgsfield/client/v2";

loadEnv({ path: ".env.local", quiet: true });

const credentials = process.env.HF_CREDENTIALS;

if (!credentials) {
  throw new Error("Missing HF_CREDENTIALS. Add it to .env.local as key-id:key-secret before running this script.");
}

config({ credentials });

async function main() {
  const result = await higgsfield.subscribe("bytedance/seedance-2.5/text-to-video", {
    input: {
      prompt: "A cinematic scene at sunset",
      duration: 5,
      resolution: "720p",
      aspect_ratio: "16:9",
    },
    withPolling: true,
  });

  // subscribe() resolves after polling reaches a terminal state. A failure,
  // cancellation, or moderation outcome is not a successful generation.
  if (result.status !== "completed") {
    const knownNonSuccessStates = new Set([
      "failed",
      "canceled",
      "cancelled",
      "moderated",
      "nsfw",
    ]);
    const outcome = knownNonSuccessStates.has(result.status)
      ? result.status
      : `non-completed status ${JSON.stringify(result.status)}`;

    console.error(`Video generation was not successful: ${outcome}.`);
    process.exitCode = 1;
    return;
  }

  const videoUrl = result.video?.url;

  if (!videoUrl) {
    console.error("Video generation completed without a video URL.");
    process.exitCode = 1;
    return;
  }

  console.log("Video URL:", videoUrl);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Higgsfield request failed: ${message}`);
  process.exitCode = 1;
});
