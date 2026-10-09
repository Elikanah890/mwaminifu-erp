'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="sw">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Kuna hitilafu / Something went wrong</h1>
          <p style={{ maxWidth: 420, color: '#666' }}>
            Programu imeshindwa kupakiwa. Tafadhali onyesha upya ukurasa. / The app failed to load. Please reload.
          </p>
          <button onClick={() => reset()} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#0f172a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
            Jaribu tena / Try again
          </button>
        </div>
      </body>
    </html>
  );
}
