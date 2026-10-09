'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">Kuna hitilafu / Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Sehemu hii imeshindwa kupakiwa. Jaribu tena. / This section failed to load. Please try again.
      </p>
      <button onClick={() => reset()} className="btn-navy">
        Jaribu tena / Try again
      </button>
    </div>
  );
}
