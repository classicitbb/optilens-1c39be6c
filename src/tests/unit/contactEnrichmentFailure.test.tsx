import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useContactEnrichment } from "@/features/admin/crm/hooks/useContactEnrichment";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), toast: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));

describe("Contact enrichment failure reporting", () => {
  it("shows a failed provider outcome as failure even when an older deployment reports failed: 0", async () => {
    mocks.invoke.mockResolvedValue({ data: { ok: true, failed: 0, applied: 0, pendingReview: 0, processed: 1,
      results: [{ outcome: "error", detail: "REQUEST_DENIED: legacy API disabled" }] }, error: null });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const { result } = renderHook(() => useContactEnrichment(), {
      wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    });
    await act(async () => { await result.current.mutateAsync({ contactId: "test-contact" }); });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Some lookups failed", variant: "destructive", description: "REQUEST_DENIED: legacy API disabled",
    })));
    client.clear();
  });
});
