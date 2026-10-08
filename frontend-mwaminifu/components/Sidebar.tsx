'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  UserCog,
  Users,
  Building2,
  ShoppingCart,
  Wallet,
  Map,
  BarChart3,
  Settings,
  UserPlus,
  HandCoins,
  Package,
  Receipt,
  Landmark,
  Clock,
  Truck,
  ClipboardList,
  ArrowLeftRight,
  CreditCard,
  Coins,
  DollarSign,
  TrendingUp,
  Boxes,
  History,
  RotateCcw,
  Tags,
  Calculator,
  FileClock,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  UserRound,
} from 'lucide-react';
import { apiClient, PublicUser } from '@/lib/api/client';
import { useI18n } from '@/lib/context/I18nContext';

export type NavItem = { href: string; label: string; icon: React.ReactNode };
export type NavGroup = { section?: string; items: NavItem[] };

export type PortalRole = 'SYSTEM_OWNER' | 'AGENT' | 'BUSINESS_OWNER' | 'EMPLOYEE';

export const ROLE_LABEL_KEYS: Record<PortalRole, string> = {
  SYSTEM_OWNER: 'systemOwner',
  AGENT: 'agentPortal',
  BUSINESS_OWNER: 'businessOwner',
  EMPLOYEE: 'employeePortal',
};

const SYSTEM_NAV: NavItem[] = [
  { href: '/system/dashboard', label: 'dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/system/agents', label: 'agents', icon: <UserCog size={18} /> },
  { href: '/system/businesses', label: 'businesses', icon: <Building2 size={18} /> },
  { href: '/system/revenue', label: 'revenue', icon: <Wallet size={18} /> },
  { href: '/system/subscriptions', label: 'subscriptions', icon: <CreditCard size={18} /> },
  { href: '/system/pricing', label: 'pricing', icon: <DollarSign size={18} /> },
  { href: '/system/regions', label: 'regions', icon: <Map size={18} /> },
  { href: '/system/settings', label: 'settings', icon: <Settings size={18} /> },
];

const AGENT_NAV: NavItem[] = [
  { href: '/agent/dashboard', label: 'dashboard', icon: <LayoutDashboard size={18} /> },
  { href: '/agent/register', label: 'registerBusiness', icon: <UserPlus size={18} /> },
  { href: '/agent/customers', label: 'myCustomers', icon: <Users size={18} /> },
  { href: '/agent/commissions', label: 'myCommissions', icon: <HandCoins size={18} /> },
];

const OWNER_NAV: NavGroup[] = [
  { items: [{ href: '/owner/dashboard', label: 'dashboard', icon: <LayoutDashboard size={18} /> }] },
  {
    section: 'sales',
    items: [
      { href: '/owner/sales', label: 'pos', icon: <ShoppingCart size={18} /> },
      { href: '/owner/sales/history', label: 'salesHistory', icon: <History size={18} /> },
      { href: '/owner/sales/returns', label: 'returns', icon: <RotateCcw size={18} /> },
    ],
  },
  {
    section: 'inventory',
    items: [
      { href: '/owner/inventory', label: 'products', icon: <Package size={18} /> },
      { href: '/owner/categories', label: 'categories', icon: <Tags size={18} /> },
      { href: '/owner/stock', label: 'stock', icon: <Boxes size={18} /> },
      { href: '/owner/purchases', label: 'purchases', icon: <ClipboardList size={18} /> },
      { href: '/owner/suppliers', label: 'suppliers', icon: <Truck size={18} /> },
      { href: '/owner/stock-movements', label: 'stockMovements', icon: <ArrowLeftRight size={18} /> },
    ],
  },
  {
    section: 'customers',
    items: [
      { href: '/owner/customers', label: 'customers', icon: <Users size={18} /> },
      { href: '/owner/credit', label: 'receivables', icon: <CreditCard size={18} /> },
    ],
  },
  {
    section: 'finance',
    items: [
      { href: '/owner/finance', label: 'financeOverview', icon: <Wallet size={18} /> },
      { href: '/owner/expenses', label: 'expenses', icon: <Receipt size={18} /> },
      { href: '/owner/cash', label: 'cashManagement', icon: <Coins size={18} /> },
      { href: '/owner/payables', label: 'payables', icon: <Wallet size={18} /> },
      { href: '/owner/loans', label: 'loans', icon: <Landmark size={18} /> },
    ],
  },
  {
    section: 'people',
    items: [
      { href: '/owner/employees', label: 'employees', icon: <UserCog size={18} /> },
      { href: '/owner/shifts', label: 'shifts', icon: <Clock size={18} /> },
    ],
  },
  {
    section: 'reports',
    items: [
      { href: '/owner/reports', label: 'reportsOverview', icon: <BarChart3 size={18} /> },
      { href: '/owner/reports/sales', label: 'sales', icon: <BarChart3 size={18} /> },
      { href: '/owner/reports/inventory', label: 'inventory', icon: <Boxes size={18} /> },
      { href: '/owner/reports/profit', label: 'profit', icon: <TrendingUp size={18} /> },
      { href: '/owner/reports/valuation', label: 'valuation', icon: <Calculator size={18} /> },
    ],
  },
  { items: [{ href: '/owner/audit', label: 'auditLog', icon: <FileClock size={18} /> }] },
  { section: 'settings', items: [{ href: '/owner/settings', label: 'settings', icon: <Settings size={18} /> }] },
];

const EMPLOYEE_NAV: NavGroup[] = [
  { items: [{ href: '/employee/dashboard', label: 'dashboard', icon: <LayoutDashboard size={18} /> }] },
  {
    section: 'sales',
    items: [
      { href: '/employee/sales', label: 'pos', icon: <ShoppingCart size={18} /> },
      { href: '/employee/activity', label: 'mySales', icon: <History size={18} /> },
    ],
  },
  { section: 'inventory', items: [{ href: '/employee/inventory', label: 'stockLookup', icon: <Package size={18} /> }] },
  { section: 'customers', items: [{ href: '/employee/customers', label: 'customers', icon: <Users size={18} /> }] },
  { section: 'shifts', items: [{ href: '/employee/shift', label: 'currentShift', icon: <Clock size={18} /> }] },
  { section: 'myActivity', items: [{ href: '/employee/reports', label: 'myActivity', icon: <BarChart3 size={18} /> }] },
  { section: 'profilePortalLabel', items: [{ href: '/employee/profile', label: 'profile', icon: <UserRound size={18} /> }] },
];

function navFor(role: PortalRole): NavGroup[] {
  if (role === 'AGENT') return [{ items: AGENT_NAV }];
  if (role === 'BUSINESS_OWNER') return OWNER_NAV;
  if (role === 'EMPLOYEE') return EMPLOYEE_NAV;
  return [{ items: SYSTEM_NAV }];
}

export default function Sidebar({
  role,
  open,
  onClose,
}: {
  role: PortalRole;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [closedSections, setClosedSections] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setUser(apiClient.getUser());
    setIsClient(true);
    const saved = window.localStorage.getItem('mwaminifu_sidebar_collapsed');
    if (saved === '1') setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      window.localStorage.setItem('mwaminifu_sidebar_collapsed', v ? '0' : '1');
      return !v;
    });
  };

  const groups = navFor(role);
  const portalLabel = t(ROLE_LABEL_KEYS[role]);
  const roleDisplay = user?.role ? t(ROLE_LABEL_KEYS[user.role]) : portalLabel;

  const logout = async () => {
    await apiClient.logout();
    router.replace('/login');
    router.refresh();
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const keyFor = (group: NavGroup, index: number) => group.section ?? `group-${index}`;
  const isOpen = (group: NavGroup, index: number) => !closedSections[keyFor(group, index)];
  const toggleGroup = (group: NavGroup, index: number) => {
    const key = keyFor(group, index);
    setClosedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-overlay backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: collapsed ? 76 : 264 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed lg:sticky top-0 z-40 flex h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
          <Image src="/logo.jpeg" alt="Mwaminifu" width={38} height={38} className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-white/10" />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="min-w-0 flex-1"
              >
                <h2 className="truncate text-sm font-semibold">Mwaminifu</h2>
                <p className="truncate text-[11px] text-white/50">{portalLabel}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={toggleCollapsed}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white lg:flex"
            aria-label="Collapse sidebar"
          >
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
        </div>

        <nav className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-3 py-4">
          {groups.map((group, gi) => (
            <div key={keyFor(group, gi)}>
              {group.section && !collapsed ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group, gi)}
                  className="flex w-full items-center justify-between px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40 hover:text-white/70 transition-brand"
                >
                  <span className="truncate">{t(group.section)}</span>
                  <ChevronDown size={13} className={`transition-transform duration-200 ${isOpen(group, gi) ? '' : '-rotate-90'}`} />
                </button>
              ) : null}
              {group.section && collapsed ? <div className="mx-auto mb-2 h-px w-6 bg-white/10" /> : null}
              {(!group.section || isOpen(group, gi)) && (
                <div className="space-y-1">
                  {group.items.map((item, ii) => {
                    const active = isActive(item.href);
                    return (
                      <motion.a
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(ii * 0.02, 0.2), ease: [0.16, 1, 0.3, 1] }}
                        title={collapsed ? t(item.label) : undefined}
                        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          active ? 'text-white' : 'text-white/60 hover:text-white'
                        } ${collapsed ? 'justify-center' : ''}`}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute inset-0 rounded-lg bg-white/10 ring-1 ring-inset ring-white/10"
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                          />
                        )}
                        {!active && <span className="absolute inset-0 rounded-lg bg-white/0 transition-colors group-hover:bg-white/5" />}
                        <span className="relative z-10 shrink-0 transition-transform duration-200 group-hover:scale-110">{item.icon}</span>
                        <AnimatePresence initial={false}>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.12 }}
                              className="relative z-10 truncate"
                            >
                              {t(item.label)}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {active && !collapsed && <span className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
                      </motion.a>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3" suppressHydrationWarning>
          <div className={`mb-2 flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
              {(isClient ? user?.name ?? portalLabel : portalLabel).slice(0, 1).toUpperCase()}
            </span>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0">
                  <p className="truncate text-sm font-medium text-white/90">{isClient ? user?.name ?? portalLabel : portalLabel}</p>
                  <p className="truncate text-[11px] text-white/40">{isClient ? roleDisplay : portalLabel}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={logout}
            className={`flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition-brand ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={16} />
            {!collapsed && <span>{t('logout')}</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
