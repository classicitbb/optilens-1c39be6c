import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
const mock = vi.hoisted(() => ({ decode: vi.fn(), stop: vi.fn(), trackStop: vi.fn(), hints: undefined as Map<number, unknown> | undefined }));
vi.mock('@zxing/browser', () => ({ BrowserMultiFormatReader: class { constructor(hints?: Map<number, unknown>) { mock.hints = hints; } decodeFromStream = mock.decode; } }));
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { StockCameraScanner } from '@/features/rx-order/form/StockCameraScanner';
beforeEach(() => {
  mock.stop.mockReset(); mock.trackStop.mockReset();
  mock.decode.mockReset().mockResolvedValue({ stop: mock.stop });
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: mock.trackStop }] }) } });
});
afterEach(() => vi.unstubAllGlobals());
describe('stock camera lifecycle', () => {
  it('requests the rear camera and delivers only one result during an in-flight lookup', async () => {
    let finish: ((value: boolean) => void) | undefined;
    const onScan = vi.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
    render(<StockCameraScanner onScan={onScan} />);
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Enable camera' }));
    await waitFor(() => expect(mock.decode).toHaveBeenCalled());
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    const callback = mock.decode.mock.calls[0][2];
    await act(async () => { void callback({ getText: () => 'REP' }); void callback({ getText: () => 'REP' }); });
    expect(onScan).toHaveBeenCalledTimes(1); expect(onScan).toHaveBeenCalledWith('REP');
    await act(async () => { finish?.(true); });
    expect(mock.trackStop).toHaveBeenCalled();
  });
  it('reads only linear barcodes, never QR or other 2D symbols', async () => {
    render(<StockCameraScanner onScan={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable camera' }));
    await waitFor(() => expect(mock.decode).toHaveBeenCalled());
    const formats = mock.hints?.get(DecodeHintType.POSSIBLE_FORMATS) as BarcodeFormat[];
    expect(formats).toContain(BarcodeFormat.CODE_128);
    for (const twoD of [BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX, BarcodeFormat.AZTEC, BarcodeFormat.PDF_417]) expect(formats).not.toContain(twoD);
  });
  it('stops camera tracks when closed', async () => {
    const { unmount } = render(<StockCameraScanner onScan={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable camera' }));
    await waitFor(() => expect(mock.decode).toHaveBeenCalled()); unmount();
    expect(mock.stop).toHaveBeenCalled(); expect(mock.trackStop).toHaveBeenCalled();
  });
  it('shows a recoverable permission error without calling the item resolver', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    const onScan = vi.fn(); render(<StockCameraScanner onScan={onScan} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable camera' }));
    await screen.findByRole('alert'); expect(onScan).not.toHaveBeenCalled();
  });
});