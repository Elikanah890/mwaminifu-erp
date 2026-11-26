'use client';

import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/context/I18nContext';

export default function Pagination({
  page,
  total,
  limit,
  onPageChange,
}: {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useI18n();
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
      <span>
        {t('showing')} {start}–{end} {t('of')} {total}
      </span>
      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 transition-brand hover:bg-muted disabled:opacity-40"
        >
          <ChevronLeft size={14} /> {t('prev')}
        </motion.button>
        <span className="px-1">
          {t('page')} {page} {t('of')} {totalPages}
        </span>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 transition-brand hover:bg-muted disabled:opacity-40"
        >
          {t('next')} <ChevronRight size={14} />
        </motion.button>
      </div>
    </div>
  );
}
