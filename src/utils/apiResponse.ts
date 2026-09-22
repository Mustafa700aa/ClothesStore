import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
  error?: {
    code: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200,
  meta?: ApiResponse['meta']
) {
  const payload: ApiResponse<T> = {
    success: true,
    ...(message && { message }),
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: unknown
) {
  const payload: ApiResponse = {
    success: false,
    message,
    error: {
      code,
      ...(details !== undefined && { details }),
    },
  };
  return res.status(statusCode).json(payload);
}
