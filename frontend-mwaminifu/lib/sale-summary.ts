export interface SaleItemLike {
  quantity?: number | null;
  product?: { name?: string | null } | null;
}

export interface SaleWithItemsLike {
  items?: SaleItemLike[] | null;
}

/** Comma-separated product names for a sale, falling back to an em dash. */
export function saleProductNames(sale: SaleWithItemsLike | null | undefined): string {
  const names = (sale?.items ?? [])
    .map((item) => item?.product?.name)
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(', ') : '—';
}

/** Total units sold on a sale (sum of item quantities). */
export function saleItemCount(sale: SaleWithItemsLike | null | undefined): number {
  return (sale?.items ?? []).reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
}
