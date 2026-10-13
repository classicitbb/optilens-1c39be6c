import { describe, expect, it } from "vitest";
import { selectRequestFiles } from "@/features/assistant/requestFiles";

const file = (name: string) => new File(["x"], name);

describe("selectRequestFiles", () => {
  it("caps at five with form files first and the latest chat files after", async () => {
    const result = await selectRequestFiles([file("f1"), file("f2"), file("f3")], ["c1", "c2", "c3", "c4"], async (n) => file(n));
    expect(result.map((f) => f.name)).toEqual(["f1", "f2", "f3", "c3", "c4"]);
  });

  it("skips an unreadable chat file instead of failing", async () => {
    const result = await selectRequestFiles([file("f1")], ["bad", "c2"], async (n) => {
      if (n === "bad") throw new Error("gone");
      return file(n);
    });
    expect(result.map((f) => f.name)).toEqual(["f1", "c2"]);
  });
});
