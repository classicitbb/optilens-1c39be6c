import { pageFullWidth } from "@/features/atlas/pageLayout";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePageEditor } from "@/features/atlas/hooks/usePageEditor";
import { toCanonicalDocument } from "@/lib/wikiCanonical";
import { makePage } from "./fixtures";
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
describe("Atlas page width persistence", () => {
  it("defaults to standard width and isolates page preferences", () => {
    expect(pageFullWidth(makePage().doc)).toBe(false);
    expect(pageFullWidth(makePage().doc, true)).toBe(true);
    expect(pageFullWidth({ blocks: [], layout: { fullWidth: false } }, true)).toBe(false);
  });
  it.each([true, false])("saves and reloads width %s through Update", async (fullWidth) => {
    let page = makePage();
    const data = { autosave: vi.fn(), saveVersion: vi.fn(async (input) => {
      page = { ...page, doc: toCanonicalDocument(JSON.stringify(input.doc)), version: page.version + 1 };
      return { historyRecorded: true };
    }), discardDraft: vi.fn(), setContexts: vi.fn(), refresh: vi.fn(), supportsDrafts: true };
    const mount = () => renderHook(() => usePageEditor({ page, pages: [page], data, canEdit: true, canPublish: true }));
    const hook = mount();
    act(() => hook.result.current.setFullWidth(fullWidth));
    await act(async () => hook.result.current.saveAs("published"));
    expect(data.saveVersion.mock.calls[0][0].doc.layout.fullWidth).toBe(fullWidth);
    hook.unmount();
    const reopened = mount();
    expect(pageFullWidth(reopened.result.current.draft.doc, true)).toBe(fullWidth);
    act(() => reopened.result.current.applyDoc({ blocks: [] }));
    expect(pageFullWidth(reopened.result.current.draft.doc, true)).toBe(fullWidth);
    reopened.unmount();
  });
});
