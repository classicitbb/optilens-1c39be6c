import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePageEditor } from "@/features/atlas/hooks/usePageEditor";
import { makePage } from "./fixtures";

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

function setup(overrides = {}) {
  const page = makePage(overrides);
  const data = { autosave: vi.fn().mockResolvedValue(undefined), saveVersion: vi.fn().mockResolvedValue({ historyRecorded: true }),
    discardDraft: vi.fn(), setContexts: vi.fn(), refresh: vi.fn(), supportsDrafts: true };
  const onSlugChanged = vi.fn();
  const onSaved = vi.fn();
  const hook = renderHook(() => usePageEditor({ page, pages: [page, makePage({ id: "other", slug: "new-title" })], data,
    canEdit: true, canPublish: true, routeSlug: page.slug ?? "derived", onSlugChanged, onSaved }));
  act(() => hook.result.current.setDraft((draft) => ({ ...draft, title: "New title" })));
  return { ...hook, data, onSlugChanged, onSaved };
}

describe("Atlas title slugs", () => {
  it("accepts a sidebar rename from a refetch without restoring the stale slug", () => {
    const data = { autosave: vi.fn(), saveVersion: vi.fn(), discardDraft: vi.fn(), setContexts: vi.fn(), refresh: vi.fn(), supportsDrafts: true };
    const page = makePage({ status: "draft" });
    const hook = renderHook(({ current }) => usePageEditor({ page: current, pages: [current], data, canEdit: true, canPublish: true }), { initialProps: { current: page } });
    hook.rerender({ current: { ...page, title: "Renamed", slug: "renamed" } });
    expect(hook.result.current.draft.title).toBe("Renamed");
    expect(hook.result.current.draft.slug).toBe("renamed");
    expect(hook.result.current.dirty).toBe(false);
  });
  it("keeps the existing draft identifier during title autosave", async () => {
    const hook = setup({ status: "draft" });
    await waitFor(() => expect(hook.data.autosave).toHaveBeenCalled(), { timeout: 2000 });
    expect(hook.data.autosave.mock.calls[0][0]).toMatchObject({ title: "New title" });
    expect(hook.data.autosave.mock.calls[0][0].meta?.slug).toBeUndefined();
    expect(hook.onSlugChanged).not.toHaveBeenCalled();
  });
  it("keeps the published identifier through Update while promoting the title", async () => {
    const hook = setup();
    await waitFor(() => expect(hook.data.autosave).toHaveBeenCalled(), { timeout: 2000 });
    expect(hook.data.autosave.mock.calls[0][0]).toMatchObject({ title: "New title", asDraft: true });
    expect(hook.data.autosave.mock.calls[0][0].meta?.slug).toBeUndefined();
    await act(async () => hook.result.current.saveAs("published"));
    expect(hook.data.saveVersion).toHaveBeenCalledWith(expect.objectContaining({ title: "New title", slug: "a-page" }));
    expect(hook.onSaved).toHaveBeenCalledWith("a-page");
  });
  it("leaves legacy null slugs unfilled", async () => {
    const hook = setup({ status: "draft", slug: null });
    await waitFor(() => expect(hook.data.autosave).toHaveBeenCalled(), { timeout: 2000 });
    expect(hook.data.autosave.mock.calls[0][0].meta?.slug).toBeUndefined();
    expect(hook.onSlugChanged).not.toHaveBeenCalled();
    await act(async () => hook.result.current.saveAs("draft"));
    expect(hook.data.saveVersion).toHaveBeenCalledWith(expect.objectContaining({ slug: null }));
  });
});
