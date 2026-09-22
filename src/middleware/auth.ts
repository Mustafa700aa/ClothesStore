import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';
import { UnauthorizedError } from '../types/errors.js';
import { prisma } from '../config/database.js';

export interface AdminPayload {
  adminId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      admin?: AdminPayload;
    }
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or malformed Authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authorization token is required');
    }

    let decoded: AdminPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as AdminPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired authentication token');
    }

    // Verify admin still exists and isActive in DB
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
      select: { id: true, email: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedError('Admin account not found or deactivated');
    }

    req.admin = {
      adminId: admin.id,
      email: admin.email,
    };

    next();
  } catch (error) {
    next(error);
  }
}
