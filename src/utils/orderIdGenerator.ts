import { PrismaTransactionClient } from '../config/database.js';

export async function generateOrderNumber(tx: PrismaTransactionClient): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // PostgreSQL atomic sequence - perfectly thread-safe, non-blocking, and collision-free
  await tx.$executeRaw`CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;`;
  const result = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('order_number_seq') AS nextval;`;
  const seq = String(result[0].nextval).padStart(4, '0');

  return `ORD-${dateStr}-${seq}`;
}
