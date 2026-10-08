import { JwtPayload } from '../utils/jwt.util';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & {
        userId: string;
        role: string;
        shopId?: string;
        permissions?: string[];
      };
      resolvedShopId?: string;
      requestId?: string;
    }
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    nextCursor?: string;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; issue: string }>;
    requestId?: string;
  };
  timestamp: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  cursor?: string;
}
