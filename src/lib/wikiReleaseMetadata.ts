import { getCurrentRelease } from "@/config/releaseManifest";

const RELEASE_TOKEN_REGEX = /\{\{\s*release\.(semanticVersion|releaseDateTimeUtc|releaseDate|environment)\s*\}\}/g;
const DRAFT_MARKER_REGEX = /-\s*\*\*Draft:\*\*\s*(yes|true|draft)\b/i;
const PLACEHOLDER_BUILD_VERSION_REGEX = /^(0\.0\.0(?:[-+].*)?|x\.x\.x|tbd|unknown|placeholder)$/i;

const resolveReleaseToken = (token: "semanticVersion" | "releaseDateTimeUtc" | "releaseDate" | "environment") => {
  const release = getCurrentRelease();

  switch (token) {
    case "semanticVersion":
      return release.semanticVersion;
    case "releaseDateTimeUtc":
      return release.releaseDateTimeUtc;
    case "releaseDate":
      return release.releaseDateTimeUtc.slice(0, 10);
    case "environment":
      return release.environment;
    default:
      return "";
  }
};

export const composeWikiArticleReleaseMetadata = (content: string): string =>
  content.replace(RELEASE_TOKEN_REGEX, (_match, token) => resolveReleaseToken(token));

export const validateWikiBuildVersionForPublish = (content: string): { valid: boolean; message?: string } => {
  const metadataBuildVersionMatches = [...content.matchAll(/-\s*\*\*Build version:\*\*\s*([^\n]+)/gi)];
  if (!metadataBuildVersionMatches.length) {
    return { valid: true };
  }

  const explicitlyDraft = DRAFT_MARKER_REGEX.test(content);

  for (const match of metadataBuildVersionMatches) {
    const rawVersion = (match[1] ?? "").trim();
    if (PLACEHOLDER_BUILD_VERSION_REGEX.test(rawVersion) && !explicitlyDraft) {
      return {
        valid: false,
        message:
          "Build version metadata cannot use placeholder values like 0.0.0 when publishing. Update the version token/value or mark the article metadata as Draft: Yes.",
      };
    }
  }

  return { valid: true };
};
