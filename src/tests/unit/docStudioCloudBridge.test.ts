import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const bridgeSource = readFileSync(resolve(process.cwd(), "public/ds/cloud-bridge.js"), "utf8");

describe("Doc Studio cloud bridge", () => {
  it("waits for the admin session before loading saved files", async () => {
    let storedSession: string | null = null;
    const originalFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ files: [{ id: "saved-file" }] })));
    const windowLike = { fetch: originalFetch } as { fetch: typeof fetch };
    const storageKey = "sb-xstmeirxhfbiyayrrsob-auth-token";
    const localStorage = {
      get length() { return storedSession ? 1 : 0; },
      key: (index: number) => index === 0 && storedSession ? storageKey : null,
      getItem: (key: string) => key === storageKey ? storedSession : null,
    };

    vm.runInNewContext(bridgeSource, {
      window: windowLike,
      localStorage,
      Response,
      Headers,
      setTimeout,
      clearTimeout,
    });

    setTimeout(() => {
      storedSession = JSON.stringify({ access_token: "test-token" });
    }, 25);

    await windowLike.fetch("/api/docstudio/my-files");

    expect(originalFetch).toHaveBeenCalledWith(
      "https://xstmeirxhfbiyayrrsob.supabase.co/functions/v1/docstudio-api/my-files",
      expect.objectContaining({ credentials: "omit" }),
    );
  });

  it("uses the configured Supabase project when other saved sessions exist", async () => {
    const originalFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ files: [{ id: "saved-file" }] })));
    const windowLike = {
      fetch: originalFetch,
      __docStudioSupabaseRef: "xstmeirxhfbiyayrrsob",
    } as { fetch: typeof fetch; __docStudioSupabaseRef: string };
    const sessions = new Map([
      ["sb-gxfvxmxplngvxdkpmxgw-auth-token", JSON.stringify({ access_token: "stale-token" })],
      ["sb-xstmeirxhfbiyayrrsob-auth-token", JSON.stringify({ access_token: "current-token" })],
    ]);
    const localStorage = {
      get length() { return sessions.size; },
      key: (index: number) => [...sessions.keys()][index] ?? null,
      getItem: (key: string) => sessions.get(key) ?? null,
    };

    vm.runInNewContext(bridgeSource, {
      window: windowLike,
      localStorage,
      Response,
      Headers,
      setTimeout,
      clearTimeout,
    });

    await windowLike.fetch("/api/docstudio/my-files");

    expect(originalFetch).toHaveBeenCalledWith(
      "https://xstmeirxhfbiyayrrsob.supabase.co/functions/v1/docstudio-api/my-files",
      expect.objectContaining({ credentials: "omit" }),
    );
  });
});
