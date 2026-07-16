import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const corsSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/http/cors.ts"),
  "utf8",
);

describe("live-data gateway CORS policy", () => {
  it("allows the locally served portal on port 8081", () => {
    expect(corsSource).toContain('"http://localhost:8081"');
    expect(corsSource).toContain('"http://127.0.0.1:8081"');
  });
});
