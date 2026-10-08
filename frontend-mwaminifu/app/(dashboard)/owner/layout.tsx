'use client';

import { ReactNode } from 'react';
import DashboardShell from '@/components/DashboardShell';

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return <DashboardShell role="BUSINESS_OWNER">{children}</DashboardShell>;
}
