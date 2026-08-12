export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);

  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;

  return { page, limit, skip: (page - 1) * limit };
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  { page, limit }: PaginationParams
): PaginatedResult<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
