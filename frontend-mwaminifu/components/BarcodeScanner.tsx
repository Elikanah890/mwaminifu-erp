'use client';

import { useEffect, useRef, useState } from 'react';
import Modal from '@/components/Modal';
import { useI18n } from '@/lib/context/I18nContext';
import { useBarcodeWedge } from '@/lib/hooks/useBarcodeWedge';
import { ScanBarcode, Camera, Keyboard, Upload } from 'lucide-react';

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

        const makeScanner = () =>
          // Prefer the browser's native BarcodeDetector when available (best on
          // modern Android/Chrome); it degrades gracefully elsewhere.
          new Html5Qrcode('barcode-reader-region', {
            verbose: false,
            experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          });

        const onSuccess = (decodedText: string) => {
          if (scannedRef.current) return;
          submit(decodedText);
          stop(scannerRef.current);
        };

        // Enumerate cameras and prefer a back/rear camera; fall back to every
        // available device, then to generic facingMode constraints. This makes
        // scanning work across many phone models, not just the first camera.
        let devices: Array<{ id: string; label: string }> = [];
        try {
          devices = (await Html5Qrcode.getCameras()) ?? [];
        } catch {
          devices = [];
        }
        const back = devices.find((d) => /back|rear|environment/i.test(d.label));
        const ordered = back ? [back, ...devices.filter((d) => d.id !== back.id)] : devices;

        const candidates: MediaTrackConstraints[] = [
          ...ordered.map((d) => ({ deviceId: { exact: d.id } }) as MediaTrackConstraints),
          { facingMode: { ideal: 'environment' } },
          { facingMode: 'user' },
        ];

        let started = false;
        let lastErr = '';
        for (const cfg of candidates) {
          if (cancelled) return;
          try {
            const scanner = makeScanner();
            scannerRef.current = scanner;
            await scanner.start(cfg, { fps: 10, qrbox: { width: 260, height: 180 } }, onSuccess, () => {});
            started = true;
            break;
          } catch (e) {
            lastErr = e instanceof Error ? e.message : 'Camera unavailable';
            await stop(scannerRef.current);
            scannerRef.current = null;
          }
        }

        if (!cancelled) {
          if (started) setCameraState('ready');
          else {
            setCameraState('failed');
            setError(lastErr);
          }
        }
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

  // Fallback for any phone/browser without live camera support: decode a photo.
  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const mod = await import('html5-qrcode');
      const tmp = document.createElement('div');
      tmp.id = 'barcode-file-tmp';
      tmp.style.display = 'none';
      document.body.appendChild(tmp);
      const scanner = new mod.Html5Qrcode('barcode-file-tmp', { verbose: false });
      try {
        const text = await scanner.scanFile(file, false);
        submit(text);
      } finally {
        try {
          scanner.clear();
        } catch {
          // ignore
        }
        tmp.remove();
      }
    } catch {
      setError(t('barcodePhotoFailed'));
    }
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

        {error && cameraState === 'failed' && (
          <div className="bg-warning/10 border border-warning/25 rounded-lg p-3 text-sm text-warning flex items-start gap-2">
            <Camera size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-muted-2 border border-border-strong rounded-lg p-3 text-sm text-primary flex items-start gap-2">
          <Keyboard size={16} className="mt-0.5 shrink-0" />
          <span>{t('usbScannerHint')}</span>
        </div>

        {/* Works on any phone: decode a photo of the barcode if the live camera
            is unavailable or refuses permission. */}
        <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong px-4 py-2.5 text-sm text-muted-foreground hover:border-secondary">
          <Upload size={16} /> {t('barcodePhotoUpload')}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickFile} />
        </label>

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
