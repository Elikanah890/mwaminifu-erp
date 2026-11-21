'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import Sidebar, { PortalRole } from '@/components/Sidebar';
import Header from '@/components/Header';
import IdleMonitor from '@/components/IdleMonitor';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import { ShopProvider } from '@/lib/context/ShopContext';
import { SyncProvider } from '@/lib/context/SyncContext';
import OfflineBanner from '@/components/sync/OfflineBanner';
import SyncToasts from '@/components/sync/SyncToasts';
import ConflictDialog from '@/components/sync/ConflictDialog';

export default function DashboardShell({
  role,
  children,
}: {
  role: PortalRole;
  children: ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Identity/role comes from the server-verified session (signed JWT in an
      // httpOnly cookie), never from a client-readable cookie.
      const user = await apiClient.loadUser();
      if (cancelled) return;
      if (!user || user.role !== role) {
        router.replace('/login');
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [role, router]);

  if (!ready) {
    return <div className="flex min-h-screen bg-background" aria-busy="true" />;
  }

  const content = (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header role={role} onMenu={() => setSidebarOpen((v) => !v)} />
        <SubscriptionBanner />
        <main className="min-h-[calc(100vh-4rem)] flex-1 bg-background">
          {/* No page transition animation and no role-level loading boundary:
              Next keeps the current page visible until the next route is ready,
              then swaps it in one paint. Animating here or adding loading.tsx
              makes the old page disappear first, which reads as a flash. */}
          <div className="min-h-[calc(100vh-4rem)]">{children}</div>
        </main>
      </div>
      <IdleMonitor />
    </div>
  );

  if (role === 'BUSINESS_OWNER' || role === 'EMPLOYEE') {
    // Sync starts only after the session is verified, so the login page never
    // fires authenticated sync requests.
    return (
      <ShopProvider>
        <SyncProvider>
          {content}
          <OfflineBanner />
          <SyncToasts />
          <ConflictDialog />
        </SyncProvider>
      </ShopProvider>
    );
  }

  return content;
}
