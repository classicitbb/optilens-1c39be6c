import { describe, expect, it } from "vitest";

import { formatLegacyRichText } from "@/lib/formatLegacyRichText";

describe("formatLegacyRichText", () => {
  it("turns legacy escaped lines, Markdown emphasis, and bullets into rich HTML", () => {
    expect(formatLegacyRichText("Intro\\n\\n**Roles:** Choose an account\\n• Invite users\\n• Reset passwords"))
      .toBe("<p>Intro</p><p><strong>Roles:</strong> Choose an account</p><ul><li>Invite users</li><li>Reset passwords</li></ul>");
  });

  it("retains headings and escapes unsafe source markup", () => {
    expect(formatLegacyRichText("## Setup\\n<script>alert(1)</script>"))
      .toBe("<h2>Setup</h2><p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  });
});
