import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
const mock = vi.hoisted(() => ({ catalog: [] as unknown[], stage: vi.fn(), release: vi.fn(), scan: vi.fn() }));
vi.mock('@/hooks/useStockOrderBuilder', async importOriginal => ({
  ...await importOriginal<typeof import('@/hooks/useStockOrderBuilder')>(),
  useStockOrderCatalog: () => ({ data: mock.catalog, isLoading: false }),
  useStageStockOrder: () => ({ mutateAsync: mock.stage, isPending: false }),
  useReleaseStockOrder: () => ({ mutateAsync: mock.release, isPending: false }),
  resolveStockCode: mock.scan,
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useReferenceData', () => ({ useReferenceData: () => ({ data: [] }) }));
import { StockServicePanel } from '@/features/rx-order/form/StockServicePanel';
const service = { product_type: 'addon', product_id: 'repair', name: 'Frame repair', category: 'Services', sku: 'REP', unit_price: 12, has_variants: false };
beforeEach(() => { mock.catalog = [service]; mock.stage.mockReset().mockResolvedValue({ submission_id: 'saved', order_total: 12 }); mock.release.mockReset().mockResolvedValue(undefined); mock.scan.mockReset(); });
function start() { render(<StockServicePanel accountId={1} accountName="Fixture account" />); }
async function addService() {
  fireEvent.click(screen.getByRole('button', { name: /Add supplies/ }));
  fireEvent.click(screen.getByRole('button', { name: '+ Add item' }));
  fireEvent.click(screen.getByRole('button', { name: 'Done', exact: true }));
}
describe('integrated stock form persistence boundary', () => {
  it('shows services in the shared browser, requires a reference, and does not persist when merely reviewing', async () => {
    start(); expect(screen.queryByRole('button', { name: 'Add stock lenses' })).not.toBeInTheDocument();
    await addService();
    expect(screen.getByRole('button', { name: 'Review order →' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Patient \/ order reference/), { target: { value: 'JOB-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review order →' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Frame repair');
    expect(mock.stage).not.toHaveBeenCalled(); expect(mock.release).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Submit stock order' }));
    await waitFor(() => expect(mock.release).toHaveBeenCalledWith({ id: 'saved' }));
    expect(mock.stage).toHaveBeenCalledWith(expect.objectContaining({ accountId: 1, orderReference: 'JOB-1', instructions: '', items: [{ product_type: 'addon', product_id: 'repair', variant_id: null, side: 'either', quantity: 1, customer_ref: '' }] }));
  });
  it('does not release after a draft-save failure', async () => {
    mock.stage.mockRejectedValue(new Error('Server rejected the item'));
    start(); await addService(); fireEvent.change(screen.getByLabelText(/Patient \/ order reference/), { target: { value: 'JOB-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review order →' })); fireEvent.click(screen.getByRole('button', { name: 'Submit stock order' }));
    await waitFor(() => expect(mock.stage).toHaveBeenCalled()); expect(mock.release).not.toHaveBeenCalled();
  });
  it('refuses scanned variants outside the selected account catalog', async () => {
    mock.scan.mockResolvedValue({ productType: 'lens', productId: 'other-account', variantId: 'v', variantTitle: 'Power', side: 'right' });
    start(); fireEvent.change(screen.getByLabelText('Scan SKU or OPC'), { target: { value: '123456' } }); fireEvent.keyDown(screen.getByLabelText('Scan SKU or OPC'), { key: 'Enter' });
    await screen.findByText(/not offered on the selected account/);
    expect(screen.queryByLabelText('Line 1 quantity')).not.toBeInTheDocument(); expect(mock.stage).not.toHaveBeenCalled();
  });
  it('does not guess an eye when a generic chiral SKU is scanned', async () => {
    mock.catalog = [{ ...service, product_type: 'lens', product_id: 'lens', has_variants: true }];
    mock.scan.mockResolvedValue({ productType: 'lens', productId: 'lens', variantId: 'v', variantTitle: 'Power', side: 'either', isChiral: true });
    start(); fireEvent.change(screen.getByLabelText('Scan SKU or OPC'), { target: { value: 'GENERIC' } }); fireEvent.keyDown(screen.getByLabelText('Scan SKU or OPC'), { key: 'Enter' });
    await screen.findByText(/eye-specific OPC/);
    expect(screen.queryByLabelText('Line 1 quantity')).not.toBeInTheDocument(); expect(mock.stage).not.toHaveBeenCalled();
  });
  it('adds one matched scan locally, closes the scanner and increments on the next scan', async () => {
    start();
    for (const quantity of [1, 2]) {
      fireEvent.click(screen.getByRole('button', { name: 'Scan', exact: true }));
      fireEvent.change(screen.getByLabelText('Scan SKU or OPC'), { target: { value: 'REP' } });
      fireEvent.keyDown(screen.getByLabelText('Scan SKU or OPC'), { key: 'Enter' });
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.getByLabelText('Line 1 quantity')).toHaveValue(quantity);
    }
    expect(mock.stage).not.toHaveBeenCalled(); expect(mock.release).not.toHaveBeenCalled();
  });
  it('does not add an item when its lookup completes after backing out', async () => {
    let finish: ((value: unknown) => void) | undefined;
    mock.scan.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    start(); fireEvent.click(screen.getByRole('button', { name: 'Scan', exact: true }));
    fireEvent.change(screen.getByLabelText('Scan SKU or OPC'), { target: { value: 'LOOKUP' } });
    fireEvent.keyDown(screen.getByLabelText('Scan SKU or OPC'), { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Done', exact: true }));
    finish?.({ productType: 'addon', productId: 'repair', variantId: 'v', variantTitle: 'Repair', side: 'either' });
    await waitFor(() => expect(screen.getByLabelText('Scan SKU or OPC')).not.toBeDisabled());
    expect(screen.queryByLabelText('Line 1 quantity')).not.toBeInTheDocument();
  });
});
