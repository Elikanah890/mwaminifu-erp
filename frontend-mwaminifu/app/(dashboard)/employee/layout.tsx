'use client';

import { ReactNode } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { PermissionsProvider } from '@/lib/context/PermissionsContext';

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return (
    <PermissionsProvider role="EMPLOYEE">
      <DashboardShell role="EMPLOYEE">{children}</DashboardShell>
    </PermissionsProvider>
  );
}
