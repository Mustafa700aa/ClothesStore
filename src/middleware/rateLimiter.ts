import rateLimit from 'express-rate-limit';
import { env } from '../config/environment.js';
import { sendError } from '../utils/apiResponse.js';

const isTest = env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test';

export const publicRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: isTest ? 10000 : env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(res, 'RATE_LIMIT_EXCEEDED', 'Too many requests, please try again later.', 429);
  },
});

export const orderRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(res, 'RATE_LIMIT_EXCEEDED', 'Too many order attempts, please try again in a minute.', 429);
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(res, 'RATE_LIMIT_EXCEEDED', 'Too many login attempts, please try again later.', 429);
  },
});

export const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(res, 'RATE_LIMIT_EXCEEDED', 'Admin rate limit exceeded, please slow down.', 429);
  },
});
