import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const makeStudio = () => {
  const win = { __dcLogicBase: class {}, __dcLogicClasses: {} as Record<string, new () => any> };
  vm.runInNewContext(read('public/ds/studio-logic.js'), { window: win, document });
  return new win.__dcLogicClasses.studio();
};

describe('letterhead in the native admin shell', () => {
  it('shares rule and spacing choices with Word output and retains legacy defaults', () => {
    const studio = makeStudio();
    expect(studio.letterHeaderHtml()).toContain('#C89130');
    studio.state.ltRule = 'none';
    expect(studio.letterHeaderHtml()).not.toContain('border-top:');
    expect(studio.letterHeaderHtml({ word: true })).not.toContain('border-top:');
    studio.state.ltRule = 'teal';
    expect(studio.letterHeaderHtml({ word: true })).toContain('border-top:1px solid #1A8A9C');
    studio.state.ltBody = '<p>Letter body</p>';
    studio.state.ltSpacing = 'compact';
    expect(studio.letterBodyHtml()).toContain('15px/1.5');
    expect(studio.letterBodyHtml({ word: true })).toContain('15px/1.5');
    studio.state.ltBody = `<p>${'Long correspondence. '.repeat(300)}</p>`;
    expect(studio.letterBodyHtml()).toContain('15px/1.5');
    expect(studio.fileSnapshot('letter')).toMatchObject({ ltRule: 'teal', ltSpacing: 'compact' });
  });

  it('opens a legacy letter with defaults instead of inheriting the previous file', () => {
    const studio = makeStudio();
    studio.state.ltRule = 'none';
    studio.state.ltSpacing = 'compact';
    studio.syncTiny = () => {};
    studio.destroyTiny = () => {};
    studio.setState = (patch: object) => Object.assign(studio.state, patch);
    studio.applyFile({ fileType: 'letter', content: { ltSubject: 'Legacy' } });
    expect(studio.state.ltRule).toBe('gold');
    expect(studio.state.ltSpacing).toBe('comfortable');
  });
  it('keeps layout cells borderless while preserving the intentional gold rule', () => {
    const studio = makeStudio();
    const nativeCss = read('src/features/admin/doc-studio/DocStudioEmbed.tsx').split('const NATIVE_CSS = `')[1].split('`;')[0];
    const adminCss = read('src/index.css').slice(read('src/index.css').indexOf('.admin-tool table {'), read('src/index.css').indexOf('.admin-overlay-surface {')).replace(/hsl\(var\(--[^)]+\)\)/g, '#ddd');
    document.head.innerHTML = `<style>${adminCss}${nativeCss}</style>`;
    document.body.innerHTML = `<div class="admin-tool"><div class="ds-native-host">${studio.buildLetter()}</div><table id="admin-table"><tr><td>Admin</td></tr></table></div>`;
    const cells = [...document.querySelectorAll('.ds-native-host td')];
    expect(cells.length).toBeGreaterThan(3);
    for (const cell of cells) expect(getComputedStyle(cell).borderBottomWidth).toBe('0px');
    expect(getComputedStyle(cells[0]).padding).toBe('0px');
    expect(getComputedStyle(document.querySelector('#admin-table td')!).borderBottomWidth).toBe('1px');
    expect(cells.some(cell => getComputedStyle(cell).borderTopColor === 'rgb(200, 145, 48)')).toBe(true);
  });
});
