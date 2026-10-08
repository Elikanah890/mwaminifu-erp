'use client';

import { ReactNode } from 'react';
import DashboardShell from '@/components/DashboardShell';

export default function SystemLayout({ children }: { children: ReactNode }) {
  return <DashboardShell role="SYSTEM_OWNER">{children}</DashboardShell>;
}
