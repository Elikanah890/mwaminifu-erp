'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { usePermissions } from '@/lib/context/PermissionsContext';
import AccessDenied from '@/components/AccessDenied';
import { SkeletonTable } from '@/components/Spinner';

const ROUTE_PERMISSIONS: Array<{ prefix: string; anyOf: string[] }> = [
  { prefix: '/employee/reports/inventory', anyOf: ['reports:inventory'] },
  { prefix: '/employee/reports/credit', anyOf: ['reports:credit'] },
  { prefix: '/employee/reports/valuation', anyOf: ['reports:valuation'] },
  { prefix: '/employee/reports', anyOf: ['reports:sales'] },
  { prefix: '/employee/employees', anyOf: ['employees:view'] },
  { prefix: '/employee/expenses', anyOf: ['expenses:read', 'expenses:create', 'expenses:approve'] },
  { prefix: '/employee/purchases', anyOf: ['purchases:view', 'purchases:create', 'purchases:approve'] },
  { prefix: '/employee/customers', anyOf: ['customers:view', 'customers:create', 'customers:update', 'credit:read', 'credit:create'] },
  { prefix: '/employee/inventory', anyOf: ['inventory:view', 'products:view', 'products:create'] },
  { prefix: '/employee/shift', anyOf: ['shift:view', 'shift:open', 'shift:close'] },
  { prefix: '/employee/sales', anyOf: ['sales:create'] },
  { prefix: '/employee/activity', anyOf: ['sales:view'] },
];

export default function EmployeeRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { can, loading } = usePermissions();
  const rule = ROUTE_PERMISSIONS.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));

  if (!rule) return <>{children}</>;
  if (loading) return <SkeletonTable rows={6} />;
  if (!rule.anyOf.some((permission) => can(permission))) return <AccessDenied />;
  return <>{children}</>;
}
