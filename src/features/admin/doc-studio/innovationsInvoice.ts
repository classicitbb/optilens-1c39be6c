import { supabase } from '@/integrations/supabase/client';
import { requestLiveData } from '@/lib/liveDataGateway';

export interface InnovationsInvoice {
  invoice: { id: number; invoice_date?: string | null; patient?: string | null; total?: number | null } | null;
  lines: Array<{ description: string | null; quantity: number | null; unit_price: number | null; amount: number | null }>;
  source_status?: string;
}

export function invoiceBillingFields(data: InnovationsInvoice, invoiceId: number) {
  if (!data.invoice || Number(data.invoice.id) !== invoiceId) throw new Error('Invoice not found for this customer account.');
  if (!data.lines?.length) throw new Error('No itemized invoice lines are available. The template has not changed.');
  const rows = data.lines.map((line, index) => {
    if (line.amount == null || !Number.isFinite(Number(line.amount))) throw new Error('An invoice line has no amount. The template has not changed.');
    const amount = Math.round(Number(line.amount) * 100) / 100;
    const quantity = line.quantity != null && Number.isFinite(Number(line.quantity)) && Number(line.quantity) !== 0 ? Number(line.quantity) : 1;
    const unit = line.unit_price != null && Number.isFinite(Number(line.unit_price)) && Math.abs(quantity * Number(line.unit_price) - amount) < 0.0000001
      ? Number(line.unit_price) : amount / quantity;
    return { id: `innovations-${invoiceId}-${index}`, code: '', desc: line.description || 'Invoice item', qty: String(quantity), unit: String(unit), taxable: false };
  });
  const lineCents = data.lines.reduce((sum, line) => sum + Math.round(Number(line.amount) * 100), 0);
  let note = `Imported from Innovations invoice ${invoiceId}. Amounts are copied from the source; VAT is not added again.`;
  if (data.invoice.patient) note += ` Patient: ${data.invoice.patient}.`;
  if (data.invoice.total != null) {
    if (!Number.isFinite(Number(data.invoice.total))) throw new Error('The invoice total is invalid. The template has not changed.');
    const adjustmentCents = Math.round(Number(data.invoice.total) * 100) - lineCents;
    if (adjustmentCents !== 0) {
      rows.push({ id: `innovations-${invoiceId}-adjustment`, code: '', desc: 'Innovations invoice total adjustment', qty: '1', unit: (adjustmentCents / 100).toFixed(2), taxable: false });
      note += ' The adjustment is the source invoice total less its itemized amounts; its tax/discount breakdown is unavailable.';
    }
  } else note += ' Source invoice total is unavailable; total is the sum of the imported lines.';
  return { blRows: rows, blDate: data.invoice.invoice_date?.slice(0, 10) || '', blDue: '', blPO: '', blToName: '', blToAttn: '', blCurrency: 'BBD', blVatEnabled: false, blDiscount: '', blShipping: '', blAmountPaid: '', blPaidRef: '', blNotes: note };
}

// Invoice lines remain a private, account-scoped read. Statement mirrors only
// resolve the account; their ledger entries must never substitute for item lines.
export async function loadInnovationsInvoice(rawNumber: string, account: string, signal?: AbortSignal) {
  if (!/^\d+$/.test(rawNumber.trim()) || !Number.isSafeInteger(Number(rawNumber)) || Number(rawNumber) <= 0) throw new Error('Enter a positive Innovations invoice number.');
  const invoiceId = Number(rawNumber);
  let accountNumber = account;
  if (!accountNumber) {
    const { data: lines, error } = await supabase.from('statement_lines').select('innovations_statement_id').eq('invoice_id', invoiceId).limit(1001);
    if (error) throw error;
    const statementIds = [...new Set((lines || []).map(line => line.innovations_statement_id))];
    if (!statementIds.length || (lines?.length || 0) > 1000) throw new Error('Select the invoice customer under Fill from customer, then import again. This invoice has no unique synced account lookup.');
    const { data: statements, error: statementError } = await supabase.from('statements').select('account_number').in('innovations_statement_id', statementIds).limit(1001);
    if (statementError) throw statementError;
    const accounts = [...new Set((statements || []).map(row => row.account_number).filter(Boolean))];
    if (accounts.length !== 1 || (statements?.length || 0) > 1000) throw new Error('Select the invoice customer under Fill from customer, then import again.');
    accountNumber = accounts[0]!;
  }
  const { data: customer, error } = await supabase.from('customers').select('id,name,account_number,address,innovations_customer_id,portal_orders_use_bill_to_account').eq('account_number', accountNumber).single();
  if (error || !customer) throw new Error('The invoice customer could not be resolved. Select its customer account and try again.');
  const data = await requestLiveData<InnovationsInvoice>('innovations.customer_invoice', { invoice_id: invoiceId }, {
    websiteCustomerId: customer.id, signal,
    localFallbackTarget: { accountNumber: customer.account_number, innovationsCustomerId: customer.innovations_customer_id, ordersUseBillToAccount: customer.portal_orders_use_bill_to_account },
  });
  return { ...invoiceBillingFields(data, invoiceId), blToCompany: customer.name || '', blToAddr: customer.address || '', selectedBillingCustomer: customer.account_number || '' };
}
