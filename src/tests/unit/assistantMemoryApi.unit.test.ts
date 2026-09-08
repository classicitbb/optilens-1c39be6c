import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  addAssistantMemory,
  clearAssistantMemory,
  fetchAssistantMemory,
  updateAssistantMemory,
} from "@/features/admin/settings/assistantMemoryApi";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

// Minimal chainable stub: every builder method returns the same object, and the
// terminal await resolves to `result`.
const builder = (result: { data?: unknown; error?: { message: string } | null }) => {
  const calls: Record<string, unknown[]> = {};
  const chain: any = {
    calls,
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  for (const method of ["select", "insert", "update", "delete", "eq", "order"]) {
    chain[method] = vi.fn((...args: unknown[]) => {
      calls[method] = args;
      return chain;
    });
  }
  return chain;
};

const signedInAs = (id: string | null) =>
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: id ? ({ id } as any) : null },
  } as any);

describe("assistantMemoryApi", () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset();
    vi.mocked(supabase.auth.getUser).mockReset();
  });

  it("scopes reads to the requested surface and orders by category", async () => {
    const chain = builder({ data: [{ id: "m1", content: "Trays, not units" }], error: null });
    vi.mocked(supabase.from).mockReturnValue(chain);

    await expect(fetchAssistantMemory("admin")).resolves.toEqual([{ id: "m1", content: "Trays, not units" }]);
    expect(supabase.from).toHaveBeenCalledWith("assistant_user_memory");
    expect(chain.eq).toHaveBeenCalledWith("surface", "admin");
    expect(chain.order).toHaveBeenCalledWith("category");
  });

  it("stamps the owner, surface and manual source on insert, and trims the content", async () => {
    const chain = builder({ error: null });
    vi.mocked(supabase.from).mockReturnValue(chain);
    signedInAs("user-1");

    await addAssistantMemory({ content: "  I run the Innova stock orders  ", category: "role" }, "admin");

    expect(chain.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      surface: "admin",
      category: "role",
      content: "I run the Innova stock orders",
      source: "manual",
    });
  });

  it("refuses to write a memory when nobody is signed in", async () => {
    signedInAs(null);
    await expect(addAssistantMemory({ content: "x", category: "general" })).rejects.toThrow(/signed in/i);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("translates the dedupe index violation into an actionable message", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      builder({ error: { message: 'duplicate key value violates unique constraint "assistant_user_memory_dedupe_idx"' } }),
    );
    signedInAs("user-1");

    await expect(addAssistantMemory({ content: "dupe", category: "general" }))
      .rejects.toThrow("Iris already remembers that — edit the existing entry instead.");
  });

  it("translates the budget trigger into an actionable message", async () => {
    vi.mocked(supabase.from).mockReturnValue(
      builder({ error: { message: "assistant memory budget exceeded (40 active facts per surface)" } }),
    );
    signedInAs("user-1");

    await expect(addAssistantMemory({ content: "one too many", category: "general" }))
      .rejects.toThrow(/Memory is full \(40 active facts\)/);
  });

  it("trims edited content but leaves other patch fields alone", async () => {
    const chain = builder({ error: null });
    vi.mocked(supabase.from).mockReturnValue(chain);

    await updateAssistantMemory("m1", { content: "  edited  ", is_active: false });

    expect(chain.update).toHaveBeenCalledWith({ content: "edited", is_active: false });
    expect(chain.eq).toHaveBeenCalledWith("id", "m1");
  });

  it("clears only the caller's own rows for one surface", async () => {
    const chain = builder({ error: null });
    vi.mocked(supabase.from).mockReturnValue(chain);
    signedInAs("user-1");

    await clearAssistantMemory("admin");

    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.eq).toHaveBeenCalledWith("surface", "admin");
  });
});
