import { config as loadEnv } from "dotenv";
import { config, higgsfield } from "@higgsfield/client/v2";

loadEnv({ path: ".env.local" });

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

  // subscribe() resolves on failed/nsfw as well as completed, so the status
  // must be checked before treating the response as a success.
  if (result.status !== "completed") {
    throw new Error(`Generation did not complete: status "${result.status}" (request ${result.request_id})`);
  }

  const videoUrl = result.video?.url;

  if (!videoUrl) {
    throw new Error(`Completed without a video URL (request ${result.request_id})`);
  }

  console.log("Video URL:", videoUrl);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
