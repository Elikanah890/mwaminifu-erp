'use client';

import { useEffect, useRef } from 'react';

/**
 * Captures barcode input from USB/hardware barcode scanners on desktop.
 *
 * USB barcode scanners act as a keyboard: they type the scanned code very
 * quickly and finish with an Enter key. This hook listens globally and treats
 * a fast burst of characters followed by Enter as a scan.
 *
 * Keystrokes are ignored when the user is focused on an input/select/textarea,
 * so normal typing (search, amounts, forms) is never hijacked.
 */
export function useBarcodeWedge(onScan: (barcode: string) => void, enabled = true) {
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    let buffer = '';
    let lastTime = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const isEditable = (el: EventTarget | null): boolean => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t as HTMLElement & { isContentEditable?: boolean }).isContentEditable === true;
    };

    const handler = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;

      if (e.key === 'Enter') {
        const code = buffer.trim();
        if (code.length >= 3) {
          e.preventDefault();
          onScanRef.current(code);
        }
        buffer = '';
        return;
      }

      if (e.key.length === 1) {
        const now = Date.now();
        // A human types slower than ~60ms between keys; a scanner is much faster.
        if (now - lastTime > 60) buffer = e.key;
        else buffer += e.key;
        lastTime = now;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          buffer = '';
        }, 250);
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (timer) clearTimeout(timer);
    };
  }, [enabled]);
}
