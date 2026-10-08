import { ReactNode } from 'react';

export type Column<T> = {
  key: keyof T | string;
  label: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => ReactNode;
};

export default function DataTable<T extends object>({
  columns,
  rows,
  empty = 'No data',
  rowHref,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
  rowHref?: (row: T) => string;
}) {
  if (!rows.length) {
    return <div className="py-16 text-center text-sm text-subtle-foreground">{empty}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-subtle-foreground">
            {columns.map((column) => (
              <th key={String(column.key)} className={`py-3 px-4 font-semibold ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const content = (
              <>
                {columns.map((column) => (
                  <td key={String(column.key)} className={`py-3 px-4 text-foreground ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}`}>
                    {column.render ? column.render(row) : String(row[column.key as keyof T] ?? '')}
                  </td>
                ))}
              </>
            );
            return rowHref ? (
              <tr key={index} className="border-b border-border hover:bg-muted transition-brand" onClick={() => (window.location.href = rowHref(row))}>{content}</tr>
            ) : (
              <tr key={index} className="border-b border-border hover:bg-muted transition-brand">{content}</tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
