import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../types/errors.js';
import { sendError } from '../utils/apiResponse.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/environment.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 'VALIDATION_ERROR', 'Validation failed', 400, details);
  }

  // 2. Custom Domain Errors (AppError)
  if (err instanceof AppError) {
    return sendError(res, err.code, err.message, err.statusCode, err.details);
  }

  // 3. Prisma Known Errors
  if ('code' in err && typeof (err as Record<string, unknown>).code === 'string') {
    const prismaCode = (err as Record<string, unknown>).code as string;
    if (prismaCode === 'P2002') {
      const target = (err as Record<string, unknown>).meta;
      return sendError(res, 'CONFLICT', 'A unique constraint was violated', 409, target);
    }
    if (prismaCode === 'P2025') {
      return sendError(res, 'NOT_FOUND', 'Requested record not found in database', 404);
    }
  }

  // 4. Unexpected / Server Internal Errors
  logger.error(
    {
      err: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
      url: req.url,
      method: req.method,
    },
    '🔥 Unhandled server error'
  );

  return sendError(
    res,
    'INTERNAL_ERROR',
    env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    500
  );
}
