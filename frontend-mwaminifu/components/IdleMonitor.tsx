'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

const WARN_AFTER_MS = 28 * 60 * 1000; // warn at 28 minutes
const LOGOUT_AFTER_MS = 30 * 60 * 1000; // hard logout at 30 minutes

/**
 * Enforces a 30-minute inactivity session timeout and reacts to server-side
 * session expiry (`auth:expired` events emitted by the API client on 401).
 */
export default function IdleMonitor() {
  const router = useRouter();
  const [warning, setWarning] = useState(false);
  const lastActivity = useRef<number>(0);
  const warned = useRef(false);

  const reset = useCallback(() => {
    lastActivity.current = Date.now();
    warned.current = false;
    setWarning(false);
  }, []);

  const signOut = useCallback(async () => {
    setWarning(false);
    await apiClient.logout();
    router.replace('/');
    router.refresh();
  }, [router]);

  useEffect(() => {
    lastActivity.current = Date.now();
    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const onActivity = () => reset();
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const onExpired = () => {
      window.location.replace('/');
    };
    window.addEventListener('auth:expired', onExpired);

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= LOGOUT_AFTER_MS) {
        void signOut();
      } else if (idle >= WARN_AFTER_MS && !warned.current) {
        warned.current = true;
        setWarning(true);
      }
    }, 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener('auth:expired', onExpired);
      clearInterval(interval);
    };
  }, [reset, signOut]);

  if (!warning) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-lg font-bold text-primary mb-2">Session expiring</h2>
        <p className="text-sm text-muted-foreground mb-6">
          You have been inactive for a while. Your session will end soon for security reasons.
        </p>
        <div className="flex gap-3">
          <button onClick={() => reset()} className="flex-1 btn-navy">
            Stay signed in
          </button>
          <button onClick={() => signOut()} className="flex-1 btn-outline">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
