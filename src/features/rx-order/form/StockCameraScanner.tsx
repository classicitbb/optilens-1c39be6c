import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Stock labels carry ordinary linear barcodes; 2D symbols (QR, Data Matrix…) are ignored. */
const LINEAR_FORMATS = [BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93, BarcodeFormat.CODABAR, BarcodeFormat.ITF, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E];
const scannerHints = () => new Map<DecodeHintType, unknown>([[DecodeHintType.POSSIBLE_FORMATS, LINEAR_FORMATS]]);

export function StockCameraScanner({ onScan }: { onScan: (code: string) => Promise<boolean> }) {
  const video = useRef<HTMLVideoElement>(null);
  const callback = useRef(onScan);
  useEffect(() => { callback.current = onScan; }, [onScan]);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (attempt === 0) return;
    let disposed = false;
    let processing = false;
    let retryAfter = 0;
    let stream: MediaStream | undefined;
    let controls: IScannerControls | undefined;
    const stop = () => { controls?.stop(); stream?.getTracks().forEach(track => track.stop()); };
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable. Use a secure browser or enter the code below.');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (disposed || !video.current) { stop(); return; }
        const reader = new BrowserMultiFormatReader(scannerHints());
        controls = await reader.decodeFromStream(stream, video.current, async result => {
          if (!result || disposed || processing || Date.now() < retryAfter) return;
          processing = true;
          try {
            if (await callback.current(result.getText())) stop();
            else retryAfter = Date.now() + 2000;
          } finally { processing = false; }
        });
        if (disposed) stop();
      } catch (e) {
        stop();
        if (!disposed) setError(e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow camera access, or enter the code below.'
          : e instanceof DOMException && e.name === 'NotFoundError'
            ? 'No camera was found. Enter the code below.'
            : e instanceof Error ? e.message : 'Could not start the camera. Enter the code below.');
      }
    };
    void start();
    return () => { disposed = true; stop(); };
  }, [attempt]);
  return <div className="space-y-2">
    {attempt === 0 && <Button type="button" onClick={() => setAttempt(1)}><Camera className="mr-1.5 h-4 w-4" />Enable camera</Button>}
    <video ref={video} aria-label="Barcode camera" autoPlay muted playsInline className="aspect-[4/3] w-full border bg-muted object-cover" />
    {error && <><p role="alert" className="text-xs text-destructive">{error}</p><Button type="button" size="sm" variant="outline" onClick={() => { setError(''); setAttempt(n => n + 1); }}><Camera className="mr-1.5 h-4 w-4" />Retry camera</Button></>}
  </div>;
}
