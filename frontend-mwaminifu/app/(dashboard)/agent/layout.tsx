'use client';

import { ReactNode } from 'react';
import DashboardShell from '@/components/DashboardShell';

export default function AgentLayout({ children }: { children: ReactNode }) {
  return <DashboardShell role="AGENT">{children}</DashboardShell>;
}
