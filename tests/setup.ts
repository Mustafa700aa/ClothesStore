import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/config/database.js';

beforeAll(async () => {
  // Ensure DB connection is healthy
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
