import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), request: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/lib/liveDataGateway', () => ({ requestLiveData: mocks.request }));
import { invoiceBillingFields, loadInnovationsInvoice, type InnovationsInvoice } from '@/features/admin/doc-studio/innovationsInvoice';

const invoice = (): InnovationsInvoice => ({ invoice: { id: 123, total: 117.5, invoice_date: '2026-10-20', patient: 'Example' }, lines: [{ description: 'Lens', quantity: 2, unit_price: 50, amount: 100 }] });
const studioFixture = () => {
  const win = { __dcLogicBase: class {}, __dcLogicClasses: {} as Record<string, new () => any>, __docStudioLoadInvoice: vi.fn() };
  vm.runInNewContext(readFileSync('public/ds/studio-logic.js', 'utf8'), { window: win, document, clearTimeout });
  const studio = new win.__dcLogicClasses.studio();
  studio.setState = (patch: object, callback?: () => void) => { Object.assign(studio.state, patch); callback?.(); };
  studio.persist = vi.fn();
  studio.state.innovationsInvoiceNumber = '123';
  return { win, studio };
};

describe('Innovations invoice import', () => {
  it('keeps quantities, reconciles to the source total without inventing VAT, and resets prior charges', () => {
    const fields = invoiceBillingFields(invoice(), 123);
    expect(fields.blRows[0]).toMatchObject({ qty: '2', unit: '50', taxable: false });
    expect(fields.blRows[1]).toMatchObject({ desc: 'Innovations invoice total adjustment', unit: '17.50' });
    expect(fields).toMatchObject({ blCurrency: 'BBD', blVatEnabled: false, blDiscount: '', blShipping: '', blDue: '', blAmountPaid: '' });
    expect(fields.blNotes).toContain('breakdown is unavailable');
  });
  it('preserves credits and source line amounts when unit price rounding differs', () => {
    const data = invoice();
    data.lines = [{ description: 'Credit', quantity: 3, unit_price: -3.33, amount: -10 }];
    data.invoice!.total = -10;
    const fields = invoiceBillingFields(data, 123);
    expect(fields.blRows).toHaveLength(1);
    expect(Number(fields.blRows[0].unit) * 3).toBe(-10);
  });
  it('rejects wrong invoices, unavailable lines and missing prices instead of filling zero amounts', () => {
    expect(() => invoiceBillingFields(invoice(), 456)).toThrow('not found');
    expect(() => invoiceBillingFields({ invoice: { id: 123 }, lines: [] }, 123)).toThrow('No itemized');
    const data = invoice(); data.lines[0].amount = null;
    expect(() => invoiceBillingFields(data, 123)).toThrow('no amount');
  });
  it('uses the selected account for invoices absent from synced statements', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 7, name: 'Optician', account_number: 'OPT', address: 'Address', innovations_customer_id: 9 } });
    mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ single }) }) });
    mocks.request.mockResolvedValue(invoice());
    const result = await loadInnovationsInvoice('123', 'OPT');
    expect(mocks.from).toHaveBeenCalledWith('customers');
    expect(mocks.request).toHaveBeenCalledWith('innovations.customer_invoice', { invoice_id: 123 }, expect.objectContaining({ websiteCustomerId: 7 }));
    expect(result).toMatchObject({ blToCompany: 'Optician', blToAddr: 'Address', selectedBillingCustomer: 'OPT' });
  });
  it('requires a valid numeric invoice before querying', async () => {
    await expect(loadInnovationsInvoice('123x', '')).rejects.toThrow('positive');
  });
  it('resolves an unselected account from statement references before fetching private item lines', async () => {
    const responses: Record<string, unknown> = {
      statement_lines: { data: [{ innovations_statement_id: 17 }] },
      statements: { data: [{ account_number: 'OPT' }] },
      customers: { data: { id: 7, name: 'Optician', account_number: 'OPT', address: 'Address' } },
    };
    mocks.from.mockImplementation((table: string) => {
      const query = { select: () => query, eq: () => query, in: () => query, limit: () => Promise.resolve(responses[table]), single: () => Promise.resolve(responses[table]) };
      return query;
    });
    mocks.request.mockResolvedValue(invoice());
    expect(await loadInnovationsInvoice('123', '')).toMatchObject({ selectedBillingCustomer: 'OPT' });
    responses.statements = { data: [{ account_number: 'OPT' }, { account_number: 'OTHER' }] };
    await expect(loadInnovationsInvoice('123', '')).rejects.toThrow('Select the invoice customer');
  });
  it.each(['invoice', 'quote'])('fills a separate %s draft and leaves the existing saved document detached', async (type) => {
    const { studio, win } = studioFixture();
    studio.state.billType = type;
    studio.state.currentBillingDocumentId = 'saved-file';
    win.__docStudioLoadInvoice.mockResolvedValue(invoiceBillingFields(invoice(), 123));
    await studio.importInnovationsInvoice();
    expect(studio.state.currentBillingDocumentId).toBe('');
    expect(studio.state.blNumber).toBe(type === 'invoice' ? '123' : 'QTE-0001');
    expect(studio.billTotals().total).toBe(117.5);
    expect(studio.persist).toHaveBeenCalledOnce();
  });
  it('leaves the existing document unchanged on connector failure or concurrent edits', async () => {
    const { studio, win } = studioFixture();
    const original = studio.billingSnapshot();
    win.__docStudioLoadInvoice.mockRejectedValueOnce(new Error('Connector offline'));
    await studio.importInnovationsInvoice();
    expect(studio.billingSnapshot()).toEqual(original);
    expect(studio.state.innovationsInvoiceMessage).toBe('Connector offline');
    win.__docStudioLoadInvoice.mockImplementationOnce(async () => { studio.state.blToCompany = 'Edited'; return invoiceBillingFields(invoice(), 123); });
    await studio.importInnovationsInvoice();
    expect(studio.state.blToCompany).toBe('Edited');
    expect(studio.state.innovationsInvoiceMessage).toContain('document changed');
  });
  it('does not import into a read-only shared document', async () => {
    const { studio, win } = studioFixture();
    studio.state.currentBillingAccess = 'view';
    await studio.importInnovationsInvoice();
    expect(win.__docStudioLoadInvoice).not.toHaveBeenCalled();
  });
  it('preserves the original invoice number on explicit save and persists its source reference', async () => {
    const { studio, win } = studioFixture();
    win.__docStudioLoadInvoice.mockResolvedValue(invoiceBillingFields(invoice(), 123));
    await studio.importInnovationsInvoice();
    studio.reserveBillingNumber = vi.fn();
    studio.docApi = vi.fn().mockResolvedValue({ document: { id: 'new-file' } });
    studio.applyBillingDocument = vi.fn();
    studio.loadBillingFiles = studio.loadMyFiles = studio.closeFileSaveDialog = studio.toast = vi.fn();
    await studio.saveBillingFile({ name: 'Imported invoice' });
    expect(studio.reserveBillingNumber).not.toHaveBeenCalled();
    expect(studio.docApi.mock.calls[0][1].body).toMatchObject({ billingNumber: '123', content: { innovationsSourceInvoiceNumber: '123' } });
  });
});
