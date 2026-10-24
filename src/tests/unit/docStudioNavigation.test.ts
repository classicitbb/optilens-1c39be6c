import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DOC_STUDIO_TOOLS, recentStudioTools, rememberStudioTool } from '@/features/admin/doc-studio/navigation';

describe('Doc Studio module shortcuts', () => {
  beforeEach(() => localStorage.clear());
  it('orders shortcuts by use and keeps each signed-in user separate', () => {
    rememberStudioTool('one', 'email');
    rememberStudioTool('one', 'quote');
    rememberStudioTool('one', 'email');
    expect(recentStudioTools('one').slice(0, 2).map(tool => tool.key)).toEqual(['email', 'quote']);
    expect(recentStudioTools('two')[0].key).toBe('invoice');
    localStorage.setItem('docstudio-recent-tools:one', JSON.stringify(['evil', 'quote', 'quote', 9]));
    expect(recentStudioTools('one')[0].key).toBe('quote');
    expect(recentStudioTools('one')).toHaveLength(DOC_STUDIO_TOOLS.length);
  });
  it('opens each exact module from its shortcut, without autosaving a billing conversion', () => {
    const win = { __dcLogicBase: class {}, __dcLogicClasses: {} as Record<string, new () => any> };
    vm.runInNewContext(readFileSync('public/ds/studio-logic.js', 'utf8'), { window: win, document, URLSearchParams, clearTimeout });
    for (const tool of DOC_STUDIO_TOOLS) {
      const studio = new win.__dcLogicClasses.studio();
      studio.syncTiny = studio.destroyTiny = studio.persistSoon = vi.fn();
      studio.setState = (patch: object, callback?: () => void) => { Object.assign(studio.state, patch); callback?.(); };
      studio.state.currentBillingDocumentId = 'existing-invoice';
      studio.billingChanged = vi.fn();
      expect(studio.applyStudioLocation(tool.route.split('?')[1])).toBe(true);
      expect(studio.state.tab).toBe(tool.tab);
      if ('billType' in tool) expect(studio.state.billType).toBe(tool.billType);
      if ('billType' in tool && tool.billType !== 'invoice') expect(studio.state.currentBillingDocumentId).toBe('');
      expect(studio.billingChanged).not.toHaveBeenCalled();
    }
  });
  it('preserves file handoffs and ignores unknown targets', () => {
    const win = { __dcLogicBase: class {}, __dcLogicClasses: {} as Record<string, new () => any> };
    vm.runInNewContext(readFileSync('public/ds/studio-logic.js', 'utf8'), { window: win, document, URLSearchParams });
    const studio = new win.__dcLogicClasses.studio();
    studio.switchTab = vi.fn();
    expect(studio.applyStudioLocation('tab=unknown')).toBe(false);
    expect(studio.applyStudioLocation('tab=email&billingDocument=known-id')).toBe(false);
    expect(studio.applyStudioLocation('tab=letter&staffInvite=1')).toBe(false);
    expect(studio.switchTab).not.toHaveBeenCalled();
  });
});
