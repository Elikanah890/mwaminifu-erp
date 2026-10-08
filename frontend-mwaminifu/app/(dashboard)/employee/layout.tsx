'use client';

import { ReactNode } from 'react';
import DashboardShell from '@/components/DashboardShell';

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return <DashboardShell role="EMPLOYEE">{children}</DashboardShell>;
}
