'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Shop, RegionRow } from '@/lib/types';
import { formatNumber, errorMessage } from '@/lib/format';
import PageWrapper from '@/components/PageWrapper';
import ChartWrapper from '@/components/ChartWrapper';
import { SkeletonCard, EmptyState } from '@/components/Spinner';
import { Reveal } from '@/components/motion';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const TZ_REGIONS = [
  'Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi', 'Kigoma',
  'Kilimanjaro', 'Lindi', 'Manyara', 'Mara', 'Mbeya', 'Morogoro', 'Mtwara', 'Mwanza',
  'Njombe', 'Pwani', 'Rukwa', 'Ruvuma', 'Shinyanga', 'Simiyu', 'Singida', 'Songwe',
  'Tabora', 'Tanga', 'Zanzibar', 'Unguja', 'Pemba', 'Kariakoo',
];

function extractRegion(address?: string | null): string {
  if (!address) return 'Unspecified';
  const lower = address.toLowerCase();
  for (const region of TZ_REGIONS) {
    if (lower.includes(region.toLowerCase())) return region;
  }
  return 'Unspecified';
}

export default function RegionsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const shopsRes = await apiClient.get<Shop[]>('/admin/shops?limit=1000');
        if (cancelled) return;
        if (shopsRes.data) setShops(shopsRes.data);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows: RegionRow[] = useMemo(() => {
    const map = new Map<string, { shops: number; owners: Set<string> }>();
    for (const shop of shops) {
      const region = extractRegion(shop.address);
      const entry = map.get(region) ?? { shops: 0, owners: new Set<string>() };
      entry.shops += 1;
      if (shop.ownerId) entry.owners.add(shop.ownerId);
      map.set(region, entry);
    }

    return Array.from(map.entries())
      .map(([region, v]) => ({
        region,
        shops: v.shops,
        owners: v.owners.size,
        revenue: 0,
        agents: 0,
      }))
      .sort((a, b) => b.shops - a.shops);
  }, [shops]);

  const chart = rows.slice(0, 12).map((r) => ({ name: r.region, shops: r.shops }));

  if (loading)
    return (
      <PageWrapper title="Geographic Distribution">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard rows={6} />
          <SkeletonCard rows={6} />
        </div>
      </PageWrapper>
    );

  if (error) {
    return (
      <PageWrapper title="Geographic Distribution">
        <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-lg text-sm">{error}</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Geographic Distribution"
      description="Where shops are concentrated (derived from shop addresses)"
      breadcrumb={['System', 'Regions']}
    >
      <ChartWrapper title="Shop Density by Region" subtitle="Top regions by shop count" className="mb-6">
        {chart.length === 0 ? (
          <EmptyState message="No shop data available" />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <Tooltip formatter={(value) => [Number(value), 'Shops']} />
                <Bar dataKey="shops" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartWrapper>

      <Reveal className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur text-left text-xs uppercase tracking-wider text-subtle-foreground">
            <tr className="border-b border-border">
              <th className="py-3 px-6 font-semibold">Region</th>
              <th className="py-3 px-6 font-semibold">Shops</th>
              <th className="py-3 px-6 font-semibold">Owners</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3}>
                  <EmptyState message="No geographic data available" />
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.region} className="transition-colors hover:bg-muted">
                  <td className="py-3 px-6 font-medium text-foreground">{r.region}</td>
                  <td className="py-3 px-6">{formatNumber(r.shops)}</td>
                  <td className="py-3 px-6">{formatNumber(r.owners)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </Reveal>
    </PageWrapper>
  );
}
