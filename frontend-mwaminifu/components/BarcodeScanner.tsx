'use client';

import { useEffect, useRef, useState } from 'react';
import Modal from '@/components/Modal';
import { useI18n } from '@/lib/context/I18nContext';
import { useBarcodeWedge } from '@/lib/hooks/useBarcodeWedge';
import { ScanBarcode, Camera, Keyboard } from 'lucide-react';

export default function BarcodeScanner({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}) {
  const { t } = useI18n();
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  const [cameraState, setCameraState] = useState<'starting' | 'ready' | 'failed'>('starting');
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null);
  const scannedRef = useRef(false);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const submit = (code: string) => {
    const c = code.trim();
    if (!c || scannedRef.current) return;
    scannedRef.current = true;
    onScanRef.current(c);
  };

  // USB / hardware barcode scanner support (works on desktop POS PCs).
  useBarcodeWedge(submit, open);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    scannedRef.current = false;
    setError('');
    setManual('');
    setCameraState('starting');

    let Html5Qrcode: typeof import('html5-qrcode').Html5Qrcode;
    const stop = async (scanner: import('html5-qrcode').Html5Qrcode | null) => {
      if (!scanner) return;
      try {
        await scanner.stop();
      } catch {
        // already stopped
      }
      try {
        scanner.clear();
      } catch {
        // ignore
      }
    };

    (async () => {
      try {
        const mod = await import('html5-qrcode');
        Html5Qrcode = mod.Html5Qrcode;
        const scanner = new Html5Qrcode('barcode-reader-region', { verbose: false });
        scannerRef.current = scanner;

        // Pick the best available camera. On desktop PCs this is the webcam;
        // `facingMode: 'environment'` alone fails when there is no rear camera.
        let cameraConfig: { facingMode?: string; deviceId?: string } = { facingMode: 'environment' };
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length) {
            cameraConfig = { deviceId: devices[0].id };
          }
        } catch {
          // fall back to environment constraint below
        }

        const onSuccess = (decodedText: string) => {
          if (scannedRef.current) return;
          submit(decodedText);
          stop(scanner);
        };

        await scanner.start(
          cameraConfig,
          { fps: 10, qrbox: { width: 260, height: 180 } },
          onSuccess,
          () => {}
        );

        if (!cancelled) setCameraState('ready');
      } catch (e) {
        if (!cancelled) {
          setCameraState('failed');
          setError(e instanceof Error ? e.message : 'Camera unavailable');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        stop(scannerRef.current);
        scannerRef.current = null;
      }
    };
  }, [open]);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    submit(manual);
  };

  return (
    <Modal open={open} title={t('scan')} onClose={onClose}>
      <div className="space-y-4">
        {cameraState !== 'failed' ? (
          <div
            id="barcode-reader-region"
            className="w-full rounded-lg overflow-hidden bg-black min-h-[220px] flex items-center justify-center"
          />
        ) : (
          <div className="w-full rounded-lg bg-muted border border-border min-h-[220px] flex flex-col items-center justify-center text-center p-6">
            <Camera size={32} className="text-subtle-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{t('cameraUnavailable')}</p>
          </div>
        )}

        <div className="bg-muted-2 border border-border-strong rounded-lg p-3 text-sm text-primary flex items-start gap-2">
          <Keyboard size={16} className="mt-0.5 shrink-0" />
          <span>{t('usbScannerHint')}</span>
        </div>

        {error && cameraState === 'failed' && (
          <div className="bg-warning/10 border border-warning/25 rounded-lg p-3 text-sm text-warning flex items-start gap-2">
            <Camera size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submitManual} className="space-y-2">
          <label className="block text-sm font-medium text-foreground">{t('barcode')}</label>
          <div className="flex gap-2">
            <input value={manual} onChange={(e) => setManual(e.target.value)} className="input-field" placeholder="1234567890128" />
            <button type="submit" className="btn-navy inline-flex items-center gap-2 shrink-0">
              <ScanBarcode size={16} /> {t('search')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
