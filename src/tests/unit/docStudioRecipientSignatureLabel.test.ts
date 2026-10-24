import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const studio = (globals: Record<string, any> = {}) => {
  const win = { __dcLogicBase: class {}, __dcLogicClasses: {} as Record<string, new () => any>, ClipboardItem: globals.ClipboardItem };
  vm.runInNewContext(readFileSync('public/ds/studio-logic.js', 'utf8'), { window: win, document, Blob, ...globals });
  const app = new win.__dcLogicClasses.studio();
  app.setState = (patch: any, callback?: () => void) => { Object.assign(app.state, typeof patch === 'function' ? patch(app.state) : patch); callback?.(); };
  app.persist = vi.fn();
  return app;
};

describe('Doc Studio recipient picker', () => {
  it('filters names and emails without dropping selected or manually entered addresses', () => {
    const app = studio();
    app.state.emailContacts = [{ name: 'Alice Optical', email: 'alice@example.com' }, { name: 'Bob Optical', email: 'bob@example.com' }];
    app.state.emailTo = 'manual@example.com';
    app.state.emailContactSearch = 'ALICE';
    expect(app.filteredEmailContacts().map((c: any) => c.email)).toEqual(['alice@example.com']);
    app.toggleEmailContact('alice@example.com');
    app.state.emailContactSearch = 'bob@';
    expect(app.filteredEmailContacts().map((c: any) => c.name)).toEqual(['Bob Optical']);
    app.state.emailContactsOpen = true;
    app.dismissEmailContacts({ target: document.body });
    expect(app.state.emailContactsOpen).toBe(false);
    expect(app.state.emailTo).toBe('manual@example.com, alice@example.com');
    app.toggleEmailContact('ALICE@example.com');
    expect(app.state.emailTo).toBe('manual@example.com');
  });
  it('keeps inside focus open and dismisses Escape with focus restored', () => {
    const app = studio();
    document.body.innerHTML = '<button id="ds-contact-toggle">Contacts</button><div id="ds-contact-picker"><input></div>';
    app.state.emailContactsOpen = true;
    app.dismissEmailContacts({ target: document.querySelector('input') });
    expect(app.state.emailContactsOpen).toBe(true);
    const event = { key: 'Escape', preventDefault: vi.fn(), stopPropagation: vi.fn() };
    app.emailContactsKey(event);
    expect(app.state.emailContactsOpen).toBe(false);
    expect(document.activeElement?.id).toBe('ds-contact-toggle');
    expect(event.stopPropagation).toHaveBeenCalledOnce();
  });
});

describe('portable signature and labels', () => {
  it('copies both rich HTML and decoded plain text with line breaks', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    class ClipboardItem { constructor(public formats: Record<string, Blob>) {} }
    const app = studio({ navigator: { clipboard: { write } }, ClipboardItem });
    app.toast = vi.fn(); app.state.sgName = 'Alice & Bob';
    expect(await app.copyRich(app.buildSignature())).toBe(true);
    const formats = write.mock.calls[0][0][0].formats;
    expect(await formats['text/html'].text()).toContain('Alice &amp; Bob');
    const plain = await formats['text/plain'].text();
    expect(plain).toContain('Alice & Bob\nPosition');
    expect(plain).not.toContain('&amp;');
  });
  it('uses inline table formatting, a hosted high resolution PNG, and safe clickable details', () => {
    const app = studio();
    Object.assign(app.state, { sgName: 'Alice & Bob <Partners>', sgEmail: 'alice"@example.com', sgWeb: 'https://example.com/team', sgPhone: '+1 246 433-4928' });
    const html = app.buildSignature();
    expect(html).toContain('role="presentation"');
    expect(html).toContain('bgcolor="#ffffff"');
    expect(html).toContain('Alice &amp; Bob &lt;Partners&gt;');
    expect(html).toContain('href="https://example.com/team"');
    expect(html).toContain('href="tel:+12464334928"');
    expect(html).toContain('mailto:alice&quot;@example.com');
    expect(html).toContain('https://www.classicvisions.net/ds/assets/signature-logo.png');
    expect(html).not.toMatch(/data:|\.svg|https:\/\/https:|text-overflow|line-clamp/);
    expect(readFileSync('public/ds/assets/signature-logo.png').subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    app.state.sgLogo = false;
    expect(app.buildSignature()).not.toContain('<img');
  });
  it('removes shipping-only information in customer mode and preserves it when switching back', () => {
    const app = studio();
    Object.assign(app.state, { slToName: 'Customer name', slCarrier: 'FedEx', slTracking: '1234', slWeight: '2kg' });
    expect(app.buildShippingLabel()).toContain('border-radius:0');
    app.setLabelMode({ target: { value: 'customer' } });
    const customer = app.buildShippingLabel();
    expect(customer).toContain('Customer name');
    expect(customer).toContain('>Customer</div>');
    expect(customer).not.toMatch(/>From<|>Tracking<|FedEx|2kg/);
    app.state.slToCaption = 'Account holder';
    expect(app.fileSnapshot('shiplabel')).toMatchObject({ slMode: 'customer', slToCaption: 'Account holder' });
    app.setLabelMode({ target: { value: 'shipping' } });
    expect(app.state.slToCaption).toBe('Account holder');
    expect(app.buildShippingLabel()).toContain('FedEx');
    expect(app.buildShippingLabel()).toContain('1234');
  });
  it('loads legacy shipping labels with defaults instead of inheriting customer mode', () => {
    const app = studio();
    app.state.slMode = 'customer'; app.state.slToCaption = 'Custom';
    app.syncTiny = vi.fn(); app.destroyTiny = vi.fn(); app.refreshTinyContent = vi.fn();
    app.applyFile({ fileType: 'shiplabel', content: { slToName: 'Legacy' } });
    expect(app.state.slMode).toBe('shipping');
    expect(app.state.slToCaption).toBe('Ship to');
  });
});
