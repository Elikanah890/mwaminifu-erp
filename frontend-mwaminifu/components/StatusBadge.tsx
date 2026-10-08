import { ReactNode } from 'react';

export default function StatusBadge({ active, activeLabel = 'Active', inactiveLabel = 'Inactive' }: { active: boolean; activeLabel?: string; inactiveLabel?: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
        active ? 'bg-success/10 text-success' : 'bg-muted-2 text-muted-foreground'
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

export function Pill({ tone, children }: { tone: 'green' | 'red' | 'amber' | 'gray' | 'teal' | 'navy'; children: ReactNode }) {
  const tones: Record<string, string> = {
    green: 'bg-success/10 text-success',
    red: 'bg-danger/10 text-danger',
    amber: 'bg-warning/10 text-warning',
    gray: 'bg-muted-2 text-muted-foreground',
    teal: 'bg-secondary/10 text-secondary',
    navy: 'bg-primary/10 text-primary',
  };
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
