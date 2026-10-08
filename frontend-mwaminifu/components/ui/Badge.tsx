import { ReactNode } from 'react';

export default function Badge({ children, tone = 'gray' }: { children: ReactNode; tone?: 'success' | 'warning' | 'danger' | 'info' | 'gray' }) {
  const tones = {
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-muted-2 text-primary',
    gray: 'bg-muted-2 text-muted-foreground',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
