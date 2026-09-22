import { prisma } from '../config/database.js';

export async function findOrderByIdempotencyKey(idempotencyKey: string) {
  return await prisma.order.findUnique({
    where: { idempotencyKey },
    include: {
      items: true,
      shippingZone: true,
    },
  });
}
