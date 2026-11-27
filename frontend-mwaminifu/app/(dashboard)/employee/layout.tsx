'use client';

import { ReactNode } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { PermissionsProvider } from '@/lib/context/PermissionsContext';
import EmployeeRouteGuard from '@/components/EmployeeRouteGuard';

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return (
    <PermissionsProvider role="EMPLOYEE">
      <DashboardShell role="EMPLOYEE"><EmployeeRouteGuard>{children}</EmployeeRouteGuard></DashboardShell>
    </PermissionsProvider>
  );
}
