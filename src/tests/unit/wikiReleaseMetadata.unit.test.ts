import { describe, expect, it } from "vitest";
import { composeWikiArticleReleaseMetadata, validateWikiBuildVersionForPublish } from "@/lib/wikiReleaseMetadata";
import { getCurrentRelease } from "@/config/releaseManifest";

describe("wiki release metadata composition", () => {
  it("injects release semantic version tokens into wiki content", () => {
    const release = getCurrentRelease();
    const source = "- **Build version:** {{release.semanticVersion}}";

    expect(composeWikiArticleReleaseMetadata(source)).toContain(release.semanticVersion);
  });

  it("blocks publishing placeholder build versions unless explicitly marked as draft", () => {
    expect(validateWikiBuildVersionForPublish("- **Build version:** 0.0.0").valid).toBe(false);
    expect(validateWikiBuildVersionForPublish("- **Draft:** Yes\n- **Build version:** 0.0.0").valid).toBe(true);
  });
});
