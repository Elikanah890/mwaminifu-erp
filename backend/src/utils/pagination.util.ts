import { settingsService } from '../services/settings.service';

export function getPagination(query: Record<string, string | undefined>) {
  const defaultLimit = Number(settingsService.getSync('defaultPageSize')) || 10;
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '', 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function getSort(query: Record<string, string | undefined>, defaultField = 'createdAt', defaultOrder: 'asc' | 'desc' = 'desc') {
  const field = query.sortBy || defaultField;
  const order: 'asc' | 'desc' = query.sortOrder === 'asc' ? 'asc' : query.sortOrder === 'desc' ? 'desc' : defaultOrder;
  return { field, order };
}