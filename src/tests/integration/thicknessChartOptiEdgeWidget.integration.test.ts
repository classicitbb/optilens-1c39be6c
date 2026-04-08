import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("thickness chart optiedge widget integration", () => {
  it("mounts the shared widget on the thickness chart page", () => {
    const pagePath = path.resolve(process.cwd(), "src/pages/lenses/ThicknessChartPage.tsx");
    const source = fs.readFileSync(pagePath, "utf8");

    expect(source).toContain('import OptiEdgeThicknessWidget from "@/components/lenses/OptiEdgeThicknessWidget";');
    expect(source).toContain("<OptiEdgeThicknessWidget />");
  });
});
