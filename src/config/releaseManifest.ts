import { z } from "zod";
import releaseManifestRaw from "../../docs/releases/manifest/current.json?raw";

export const releaseManifestSchema = z.object({
  semanticVersion: z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/),
  releaseDateTimeUtc: z.string().datetime({ offset: true }),
  environment: z.enum(["development", "test", "staging", "production"]),
  releaseSummary: z.array(z.string().min(1)).min(1),
  moduleImpact: z
    .array(
      z.object({
        module: z.string().min(1),
        impact: z.enum(["low", "medium", "high"]),
        notes: z.string().min(1),
      }),
    )
    .min(1),
  migrationNotes: z.array(z.string().min(1)).min(1),
  hasBreakingChanges: z.boolean(),
});

export type ReleaseManifest = z.infer<typeof releaseManifestSchema>;

let cachedRelease: ReleaseManifest | null = null;

export function getCurrentRelease(): ReleaseManifest {
  if (cachedRelease) {
    return cachedRelease;
  }

  const parsedJson: unknown = JSON.parse(releaseManifestRaw);
  cachedRelease = releaseManifestSchema.parse(parsedJson);
  return cachedRelease;
}
