'use client';

/** Register a Background Sync tag so the SW wakes the app when connectivity returns. */
export function requestBackgroundSync(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready
    .then((reg) => {
      const anyReg = reg as unknown as { sync?: { register: (tag: string) => Promise<void> } };
      if (anyReg.sync?.register) {
        anyReg.sync.register('mwaminifu-sync').catch(() => undefined);
      }
    })
    .catch(() => undefined);
}
