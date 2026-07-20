import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestLiveData } from "@/lib/liveDataGateway";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe("requestLiveData", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(supabase.functions.invoke).mockReset();
    window.localStorage.clear();
  });

  it("falls back to OptiLens Local on localhost when the Edge Function transport fails", async () => {
    vi.mocked(supabase.functions.invoke).mockRejectedValue(new Error("Failed to send a request to the Edge Function"));
    window.localStorage.setItem("optilens.localServiceUrl", "http://127.0.0.1:9090");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: { orders: [], retrieved_at: "2026-07-20T00:00:00.000Z" } }),
    } as Response);

    await expect(requestLiveData(
      "innovations.customer_orders",
      {},
      { localFallbackTarget: { accountNumber: "RETAIL" } },
    )).resolves.toEqual({ orders: [], retrieved_at: "2026-07-20T00:00:00.000Z" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:9090/api/connectors/live-gateway/direct",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          operation: "innovations.customer_orders",
          arguments: {},
          target: { account_number: "RETAIL" },
        }),
      }),
    );
  });
});
