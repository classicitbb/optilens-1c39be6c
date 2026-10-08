import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAtlasPageMeta, useAtlasSidebarState, SIDEBAR_DEFAULT } from '@/features/atlas/hooks/useAtlasPrefs';
import { usePageEditor } from '@/features/atlas/hooks/usePageEditor';
import { makePage } from './fixtures';

const auth = vi.hoisted(() => ({ user: { id: 'alice' } as { id: string } | null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

describe('Atlas layout preferences', () => {
  beforeEach(() => { localStorage.clear(); auth.user = { id: 'alice' }; });

  it('retains full width through Update, refetch and reopening, then retains standard width', async () => {
    const page = makePage();
    const data = { autosave: vi.fn(), saveVersion: vi.fn().mockResolvedValue({}), discardDraft: vi.fn(), setContexts: vi.fn(), refresh: vi.fn(), supportsDrafts: true };
    const hook = renderHook(({ current }) => ({
      prefs: useAtlasPageMeta(),
      editor: usePageEditor({ page: current, pages: [current], data, canEdit: true, canPublish: true }),
    }), { initialProps: { current: page } });
    act(() => { hook.result.current.editor.setMode('edit'); hook.result.current.prefs.patchPageMeta(page.id, { fullWidth: true }); });
    // Storage is updated synchronously, before Update changes the mode/route.
    expect(JSON.parse(localStorage.getItem('atlas-page-meta')!)[page.id].fullWidth).toBe(true);
    await act(async () => { await hook.result.current.editor.saveAs('published'); });
    hook.rerender({ current: { ...page, version: 2 } });
    expect(hook.result.current.editor.mode).toBe('view');
    expect(hook.result.current.prefs.pageMeta[page.id].fullWidth).toBe(true);
    hook.unmount();
    const reopened = renderHook(() => useAtlasPageMeta());
    expect(reopened.result.current.pageMeta[page.id].fullWidth).toBe(true);
    act(() => reopened.result.current.patchPageMeta(page.id, { fullWidth: false }));
    reopened.unmount();
    const reloaded = renderHook(() => useAtlasPageMeta());
    expect(reloaded.result.current.pageMeta[page.id].fullWidth).toBe(false);
  });

  it('merges page settings from multiple mounted workspaces without losing width', () => {
    const first = renderHook(() => useAtlasPageMeta());
    const second = renderHook(() => useAtlasPageMeta());
    act(() => first.result.current.patchPageMeta('page-1', { fullWidth: true }));
    act(() => second.result.current.patchPageMeta('page-2', { cover: true }));
    expect(second.result.current.pageMeta['page-1'].fullWidth).toBe(true);
    act(() => second.result.current.patchPageMeta('page-1', { icon: 'star' }));
    expect(first.result.current.pageMeta['page-1']).toEqual({ fullWidth: true, icon: 'star' });
  });

  it('observes other-tab preference changes', () => {
    const hook = renderHook(() => useAtlasPageMeta());
    act(() => {
      localStorage.setItem('atlas-page-meta', JSON.stringify({ 'page-1': { fullWidth: true } }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'atlas-page-meta' }));
    });
    expect(hook.result.current.pageMeta['page-1'].fullWidth).toBe(true);
  });

  it('restores sidebar width and collapse per account without importing shared legacy values', () => {
    localStorage.setItem('atlas-sidebar-width', '333');
    localStorage.setItem('wiki-sidebar-width', '320');
    const hook = renderHook(() => useAtlasSidebarState());
    expect(hook.result.current.width).toBe(SIDEBAR_DEFAULT);
    act(() => { hook.result.current.setWidth(310); hook.result.current.setCollapsed(true); });
    hook.unmount();
    const reopened = renderHook(() => useAtlasSidebarState());
    expect(reopened.result.current.width).toBe(310);
    expect(reopened.result.current.collapsed).toBe(true);
    auth.user = { id: 'bob' };
    reopened.rerender();
    expect(reopened.result.current.width).toBe(SIDEBAR_DEFAULT);
    act(() => reopened.result.current.setWidth(275));
    auth.user = null;
    reopened.rerender();
    expect(reopened.result.current.width).toBe(SIDEBAR_DEFAULT);
    auth.user = { id: 'alice' };
    reopened.rerender();
    expect(reopened.result.current.width).toBe(310);
    expect(localStorage.getItem('atlas-sidebar-width:bob')).toBe('275');
  });

  it('bounds stored and resized widths and rejects non-finite sizes', () => {
    localStorage.setItem('atlas-sidebar-width:alice', '999');
    const hook = renderHook(() => useAtlasSidebarState());
    expect(hook.result.current.width).toBe(360);
    act(() => hook.result.current.setWidth(100));
    expect(hook.result.current.width).toBe(200);
    act(() => hook.result.current.setWidth(NaN));
    expect(hook.result.current.width).toBe(200);
  });
});
