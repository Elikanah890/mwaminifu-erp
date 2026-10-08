import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.util';
import { Prisma } from '@prisma/client';

interface AppErrorShape {
  status?: number;
  code?: string;
  message?: string;
  details?: unknown;
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  logger.error('Unhandled error:', {
    message: err instanceof Error ? err.message : (err as AppErrorShape)?.message,
    stack: err instanceof Error ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'A record with this value already exists',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Record not found' },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request data' },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // App services throw shaped errors like { status, code, message }
  const appError = err as AppErrorShape;
  if (appError && typeof appError === 'object' && appError.status && appError.code) {
    res.status(appError.status).json({
      success: false,
      error: { code: appError.code, message: appError.message, details: appError.details },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development' ? (err as Error).message : 'An unexpected error occurred',
    },
    timestamp: new Date().toISOString(),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
    timestamp: new Date().toISOString(),
  });
}
