'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { AgentBusiness, PaginationMeta } from '@/lib/types';
import { formatDate, errorMessage } from '@/lib/format';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import { Pill } from '@/components/StatusBadge';
import { SkeletonTable, SkeletonCard, EmptyState } from '@/components/Spinner';
import PageWrapper from '@/components/PageWrapper';
import { Reveal } from '@/components/motion';
import SearchBar from '@/components/SearchBar';

const PER_PAGE = 15;

interface BusinessDetail {
  id: string;
  name: string;
  // Spec 12.2 — Agents do not see owner contact details.
  isActive: boolean;
  isPinSet: boolean;
  createdAt: string;
  ownedShops: Array<{
    id: string;
    name: string;
    address: string | null;
    createdAt: string;
    _count?: { employees: number; products: number; sales: number };
  }>;
  onboardingInfo?: { onboardedBy: string; onboardedAt: string };
  stats?: { totalShops: number; totalEmployees: number };
}

export default function AgentCustomersPage() {
  const [businesses, setBusinesses] = useState<AgentBusiness[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: PER_PAGE, total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<BusinessDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(
    async (page: number) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
        if (search.trim()) params.set('search', search.trim());
        if (status) params.set('status', status);
        const res = await apiClient.get<AgentBusiness[]>(`/agents/businesses?${params.toString()}`);
        if (res.data) setBusinesses(res.data);
        if (res.pagination) setMeta(res.pagination);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [search, status]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await apiClient.get<BusinessDetail>(`/agents/businesses/${id}`);
      if (res.data) setDetail(res.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <PageWrapper title="My Customers" description="Businesses you have registered" breadcrumb={['Agent', 'My Customers']}>
      <Reveal className="flex flex-wrap items-center gap-3 mb-6">
        <SearchBar value={search} onChange={(v) => setSearch(v)} placeholder="Search business name..." />
        <select className="input-field max-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending Setup</option>
        </select>
      </Reveal>

      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {loading ? (
        <SkeletonTable rows={PER_PAGE} />
      ) : (
        <Reveal className="surface-card overflow-hidden">
          {businesses.length === 0 ? (
            <EmptyState message="No businesses found" />
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 px-6 font-semibold">Business</th>
                  <th className="py-3 px-6 font-semibold">Location</th>
                  <th className="py-3 px-6 font-semibold">Shops</th>
                  <th className="py-3 px-6 font-semibold">Status</th>
                  <th className="py-3 px-6 font-semibold">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {businesses.map((b) => (
                  <tr key={b.id} className="cursor-pointer transition-colors hover:bg-muted" onClick={() => openDetail(b.id)}>
                    <td className="py-3 px-6 font-medium text-foreground">{b.name}</td>
                    <td className="py-3 px-6 text-muted-foreground">{b.ownedShops?.[0]?.address || b.ownedShops?.[0]?.name || '-'}</td>
                    <td className="py-3 px-6 text-muted-foreground">{b._count?.ownedShops ?? b.ownedShops?.length ?? 0}</td>
                    <td className="py-3 px-6">
                      <Pill tone={!b.isActive ? 'gray' : b.isPinSet ? 'green' : 'amber'}>
                        {!b.isActive ? 'Inactive' : b.isPinSet ? 'Active' : 'Pending'}
                      </Pill>
                    </td>
                    <td className="py-3 px-6 text-xs text-muted-foreground">{formatDate(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
          <div className="px-6 py-3 border-t border-border">
            <Pagination page={meta.page} total={meta.total} limit={PER_PAGE} onPageChange={load} />
          </div>
        </Reveal>
      )}

      <Modal open={!!detail || detailLoading} title="Business Details" onClose={() => setDetail(null)} wide>
        {detailLoading ? (
          <SkeletonCard rows={4} />
        ) : detail ? (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-primary">{detail.name}</h3>
                <p className="text-muted-foreground">Registered business</p>
              </div>
              <Pill tone={!detail.isActive ? 'gray' : detail.isPinSet ? 'green' : 'amber'}>
                {!detail.isActive ? 'Inactive' : detail.isPinSet ? 'Active' : 'Pending'}
              </Pill>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground">Shops</p><p className="font-semibold">{detail.stats?.totalShops ?? detail.ownedShops.length}</p></div>
              <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground">Employees</p><p className="font-semibold">{detail.stats?.totalEmployees ?? 0}</p></div>
              <div className="bg-muted rounded-lg p-3"><p className="text-xs text-muted-foreground">Registered</p><p className="font-semibold">{formatDate(detail.createdAt)}</p></div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Shops</p>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {detail.ownedShops.map((shop) => (
                  <div key={shop.id} className="bg-muted rounded-lg p-3">
                    <p className="font-medium text-foreground">{shop.name}</p>
                    <p className="text-xs text-muted-foreground">{shop.address || 'No address'}</p>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setDetail(null)} className="btn-outline w-full">
              Close
            </button>
          </div>
        ) : null}
      </Modal>
    </PageWrapper>
  );
}
