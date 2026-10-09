'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, LogOut, Menu, Store, Repeat, Globe, Search, ChevronDown, UserRound } from 'lucide-react';
import { apiClient, PublicUser } from '@/lib/api/client';
import { useOptionalShop } from '@/lib/context/ShopContext';
import { useI18n } from '@/lib/context/I18nContext';
import { PortalRole, ROLE_LABEL_KEYS } from '@/components/Sidebar';
import { DeviceUser } from '@/lib/types';
import ThemeToggle from '@/components/theme-toggle';
import InstallButton from '@/components/pwa/InstallButton';
import SyncStatusButton from '@/components/sync/SyncStatusButton';

const QUICK_LINKS: Record<PortalRole, Array<{ href: string; label: string }>> = {
  SYSTEM_OWNER: [
    { href: '/system/dashboard', label: 'dashboard' },
    { href: '/system/agents', label: 'agents' },
    { href: '/system/businesses', label: 'businesses' },
    { href: '/system/revenue', label: 'revenue' },
    { href: '/system/subscriptions', label: 'subscriptions' },
    { href: '/system/settings', label: 'settings' },
  ],
  AGENT: [
    { href: '/agent/dashboard', label: 'dashboard' },
    { href: '/agent/register', label: 'registerBusiness' },
    { href: '/agent/customers', label: 'myCustomers' },
    { href: '/agent/commissions', label: 'myCommissions' },
  ],
  BUSINESS_OWNER: [
    { href: '/owner/dashboard', label: 'dashboard' },
    { href: '/owner/sales', label: 'pos' },
    { href: '/owner/inventory', label: 'products' },
    { href: '/owner/customers', label: 'customers' },
    { href: '/owner/reports', label: 'reports' },
    { href: '/owner/settings', label: 'settings' },
  ],
  EMPLOYEE: [
    { href: '/employee/dashboard', label: 'dashboard' },
    { href: '/employee/sales', label: 'pos' },
    { href: '/employee/inventory', label: 'inventory' },
    { href: '/employee/shift', label: 'shifts' },
    { href: '/employee/profile', label: 'profile' },
  ],
};

function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const KEY = 'mwaminifu_device_id';
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

export default function Header({ role, onMenu }: { role: PortalRole; onMenu: () => void }) {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [deviceUsers, setDeviceUsers] = useState<DeviceUser[]>([]);
  const [showSwitch, setShowSwitch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [search, setSearch] = useState('');
  const shopCtx = useOptionalShop();
  const { locale, setLocale, t } = useI18n();
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const u = apiClient.getUser();
    setUser(u);
    setIsClient(true);
    const deviceId = getDeviceId();
    if (u && deviceId) {
      apiClient.post('/device-sessions', { deviceId }).catch(() => {});
      apiClient
        .get<DeviceUser[]>(`/device-sessions?deviceId=${encodeURIComponent(deviceId)}`)
        .then((res) => setDeviceUsers((res.data ?? []).filter((d) => d.id !== u.id)))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleLogout = async () => {
    await apiClient.logout();
    router.replace('/login');
    router.refresh();
  };

  const notificationsHref =
    role === 'AGENT' ? '/agent/notifications' : role === 'SYSTEM_OWNER' ? '/system/notifications' : undefined;
  const filteredLinks = QUICK_LINKS[role].filter((link) => t(link.label).toLowerCase().includes(search.toLowerCase()));
  const showResults = searchFocused && search.length > 0;
  // Spec 15 — the AGAC/System Owner account is labelled by role, not the raw
  // seeded display name.
  const displayName = role === 'SYSTEM_OWNER' ? t('systemOwner') : (user?.name ?? '');

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onMenu} className="rounded-lg p-2 text-foreground hover:bg-muted lg:hidden" aria-label="Toggle menu">
            <Menu size={20} />
          </button>
          <h2 className="hidden truncate text-sm font-semibold text-foreground sm:block">{t(ROLE_LABEL_KEYS[role])}</h2>
        </div>

        <motion.div
          animate={{ maxWidth: searchFocused ? 560 : 320 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative hidden flex-1 md:block"
        >
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder={t('search')}
            className="w-full rounded-xl border border-border bg-muted py-2.5 pl-9 pr-3 text-sm text-foreground outline-none transition-all placeholder:text-subtle-foreground focus:border-secondary focus:bg-card focus:ring-4 focus:ring-secondary/10"
          />
          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="absolute left-0 right-0 top-12 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg"
              >
                {filteredLinks.length ? (
                  filteredLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted transition-brand"
                    >
                      {t(link.label)}
                    </a>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-subtle-foreground">{t('noResults')}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setLocale(locale === 'sw' ? 'en' : 'sw')}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-brand"
            aria-label="Toggle language"
          >
            <Globe size={16} />
            <span className="hidden sm:inline">{locale === 'sw' ? 'EN' : 'SW'}</span>
          </button>

          <ThemeToggle />
          <InstallButton />
          <SyncStatusButton />

          {shopCtx && shopCtx.shops.length > 0 && (
            <div className="hidden items-center gap-2 text-sm sm:flex">
              <Store size={16} className="text-secondary" />
              {role === 'BUSINESS_OWNER' ? (
                <select
                  value={shopCtx.activeShopId ?? ''}
                  onChange={(e) => shopCtx.setActiveShopId(e.target.value)}
                  className="max-w-[180px] truncate rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-secondary/40"
                  aria-label="Select shop"
                >
                  {shopCtx.shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="max-w-[180px] truncate text-muted-foreground">{shopCtx.activeShop?.name ?? ''}</span>
              )}
            </div>
          )}

          {notificationsHref ? (
            <a
              href={notificationsHref}
              className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-brand"
              aria-label="Notifications"
            >
              <Bell size={19} />
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
              </span>
            </a>
          ) : (
            <button
              className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-brand"
              aria-label="Notifications"
            >
              <Bell size={19} />
            </button>
          )}

          <div className="relative" ref={userMenuRef}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-brand"
              aria-label="User menu"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <UserRound size={17} />
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-semibold leading-tight text-foreground" suppressHydrationWarning>
                  {isClient ? displayName : ''}
                </span>
                <span className="block text-xs text-subtle-foreground">{t(ROLE_LABEL_KEYS[role])}</span>
              </span>
              <ChevronDown size={15} className="hidden text-subtle-foreground sm:block" />
            </motion.button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
                >
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{displayName || t(ROLE_LABEL_KEYS[role])}</p>
                    <p className="text-xs text-subtle-foreground">{t(ROLE_LABEL_KEYS[role])}</p>
                  </div>
                  <button
                    onClick={() => setShowSwitch((v) => !v)}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted transition-brand"
                  >
                    <Repeat size={16} /> {t('switchUser')}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-danger hover:bg-danger/10 transition-brand"
                  >
                    <LogOut size={16} /> {t('logout')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {showSwitch && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="absolute right-4 top-16 z-50 w-72 rounded-xl border border-border bg-card shadow-xl"
              >
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">{t('switchUser')}</p>
                  <p className="text-xs text-subtle-foreground">
                    {locale === 'sw' ? 'Watumiaji walioingia kwenye kifaa hiki' : 'Users signed in on this device'}
                  </p>
                </div>
                {deviceUsers.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-subtle-foreground">
                    {locale === 'sw' ? 'Hakuna watumiaji wengine.' : 'No other users on this device.'}
                  </p>
                ) : (
                  <ul className="max-h-64 overflow-y-auto py-1">
                    {deviceUsers.map((d) => (
                      <li key={d.id}>
                        <button onClick={handleLogout} className="w-full px-4 py-2.5 text-left hover:bg-muted">
                          <p className="text-sm font-medium text-foreground">{d.name}</p>
                          <p className="text-xs text-subtle-foreground">{d.role.replace(/_/g, ' ')}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
