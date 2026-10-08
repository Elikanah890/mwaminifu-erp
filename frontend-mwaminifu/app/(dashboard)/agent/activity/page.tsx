'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { formatDateTime, errorMessage } from '@/lib/format';
import Pagination from '@/components/Pagination';
import { SkeletonTable, EmptyState } from '@/components/Spinner';
import PageWrapper from '@/components/PageWrapper';
import { Reveal } from '@/components/motion';
import { ActivityLog } from '@/lib/types';

const PER_PAGE = 15;

export default function AgentActivityPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: PER_PAGE, total: 0 });
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (page: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) });
      if (search.trim()) params.set('search', search.trim());
      if (action) params.set('action', action);
      const res = await apiClient.get<ActivityLog[]>(`/agents/activity?${params.toString()}`);
      if (res.data) setActivities(res.data);
      if (res.pagination) setMeta(res.pagination);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, action]);

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <PageWrapper title="Activity Log" description="Your recent actions on the platform" breadcrumb={['Agent', 'Activity']}>

      {error && <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      <Reveal className="flex flex-wrap items-center gap-3 mb-4">
        <input
          className="input-field max-w-xs"
          placeholder="Search action..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); load(1); }}
        />
        <input className="input-field max-w-[160px]" placeholder="Action filter" value={action} onChange={(e) => { setAction(e.target.value); load(1); }} />
      </Reveal>

      {loading ? (
        <SkeletonTable rows={PER_PAGE} />
      ) : (
        <Reveal className="surface-card overflow-hidden">
          {activities.length === 0 ? (
            <EmptyState message="No activity logged yet" />
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 px-6 font-semibold">Date</th>
                  <th className="py-3 px-6 font-semibold">Action</th>
                  <th className="py-3 px-6 font-semibold">Business</th>
                  <th className="py-3 px-6 font-semibold">Shop</th>
                  <th className="py-3 px-6 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activities.map((a) => (
                  <tr key={a.id} className="transition-colors hover:bg-muted">
                    <td className="py-3 px-6 text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</td>
                    <td className="py-3 px-6 font-medium text-foreground">{a.action.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-6 text-muted-foreground">{a.user?.name || '-'}</td>
                    <td className="py-3 px-6 text-muted-foreground">{a.shop?.name || '-'}</td>
                    <td className="py-3 px-6 text-muted-foreground max-w-[300px] truncate">{JSON.stringify(a.details)}</td>
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
    </PageWrapper>
  );
}