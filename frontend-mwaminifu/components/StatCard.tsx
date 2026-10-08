import { ReactNode } from 'react';

export default function StatCard({
  title,
  value,
  color = 'text-primary',
  sub,
  icon,
}: {
  title: string;
  value: ReactNode;
  color?: string;
  sub?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        {icon ? <span className="text-secondary">{icon}</span> : null}
      </div>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub ? <p className="text-xs text-subtle-foreground mt-1">{sub}</p> : null}
    </div>
  );
}