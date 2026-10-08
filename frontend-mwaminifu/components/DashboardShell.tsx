'use client';

import { useEffect, useState, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { apiClient } from '@/lib/api/client';
import Sidebar, { PortalRole } from '@/components/Sidebar';
import Header from '@/components/Header';
import IdleMonitor from '@/components/IdleMonitor';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import { ShopProvider } from '@/lib/context/ShopContext';

export default function DashboardShell({
  role,
  children,
}: {
  role: PortalRole;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
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
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <IdleMonitor />
    </div>
  );

  if (role === 'BUSINESS_OWNER' || role === 'EMPLOYEE') {
    return <ShopProvider>{content}</ShopProvider>;
  }

  return content;
}
