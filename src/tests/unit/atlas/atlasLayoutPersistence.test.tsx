import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHelpArticlesSource } from '@/features/atlas/source/helpArticlesSource';
import { usePageEditor } from '@/features/atlas/hooks/usePageEditor';
import { makePage } from './fixtures';
const mock = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], update: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => ({
    select: () => ({ order: async () => ({ data: mock.rows, error: null }) }),
    update: (value: unknown) => { mock.update(value); return { eq: async () => ({ error: null }) }; },
    insert: async () => ({error:null}),
  }),
} }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
const source = () => createHelpArticlesSource({canViewContext: () => true});
const row = { id:'11111111-1111-4111-8111-111111111111', title:'Page', slug:'stable-id', status:'published', body_json:{blocks:[]}, page_slug:'all' };
describe('Atlas saved page width', () => {
  beforeEach(() => { mock.rows = []; mock.update.mockReset(); });
  it('uses the page setting in Update and rebuilds it from saved page props', async () => {
    const page = makePage({props:{ fullWidth:null }});
    const data = { autosave:vi.fn(), saveVersion:vi.fn().mockResolvedValue({}), discardDraft:vi.fn(), setContexts:vi.fn(), refresh:vi.fn(), supportsDrafts:true };
    const hook = renderHook(({current}) => usePageEditor({page:current,pages:[current],data,canEdit:true,canPublish:true}), {initialProps:{current:page}});
    await act(async () => { await hook.result.current.saveAs('published',{fullWidth:true}); });
    expect(data.saveVersion).toHaveBeenCalledWith(expect.objectContaining({props:{fullWidth:true}}));
    hook.rerender({current:{...page,version:2,props:{fullWidth:true}}});
    expect(hook.result.current.draft.props.fullWidth).toBe(true);
    await act(async () => { await hook.result.current.saveAs('published',{fullWidth:false}); });
    expect(data.saveVersion).toHaveBeenLastCalledWith(expect.objectContaining({props:{fullWidth:false}}));
  });
  it('round-trips the width column through the one source, with pre-migration compatibility', async () => {
    mock.rows = [row];
    const old = source();
    await old.listPages();
    await old.autosave({id:row.id,meta:{props:{fullWidth:true}}});
    expect(mock.update).not.toHaveBeenCalled();
    mock.rows = [{...row,full_width:null}];
    const migrated = source();
    const listing = await migrated.listPages();
    expect(listing.pages[0].props.fullWidth).toBeNull();
    await migrated.autosave({id:row.id,meta:{props:{fullWidth:true}}});
    expect(mock.update).toHaveBeenLastCalledWith({full_width:true});
    await migrated.autosave({id:row.id,meta:{props:{fullWidth:false}}});
    expect(mock.update).toHaveBeenLastCalledWith({full_width:false});
    mock.rows = [{...row,full_width:true}];
    expect((await migrated.listPages()).pages[0].props.fullWidth).toBe(true);
  });
  it('renames sidebar titles without changing existing identifiers', async () => {
    await source().patchPage(row.id,{title:'Renamed'});
    expect(mock.update).toHaveBeenCalledWith({title:'Renamed'});
  });
});
