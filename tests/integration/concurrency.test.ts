import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/config/database.js';

describe('Concurrency & Race-Condition Resistance', () => {
  let adminToken: string;
  let testVariantId: string;
  let cairoZoneId: string;

  beforeAll(async () => {
    // 1. Admin login
    const loginRes = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: 'admin@clothesstore.com', password: 'Admin@123456' });
    adminToken = loginRes.body.data.token;

    const zone = await prisma.shippingZone.findUnique({ where: { governorate: 'القاهرة' } });
    cairoZoneId = zone!.id;

    // 2. Create an isolated product and variant with ONLY 1 unit of stock
    const product = await prisma.product.create({
      data: {
        name: `منتج اختبار التزامن ${Date.now()}`,
        basePrice: 200,
        isActive: true,
      },
    });

    const testSku = `CONCURRENCY-TEST-${Date.now()}`;
    const variant = await prisma.variant.create({
      data: {
        productId: product.id,
        size: 'ONE_SIZE',
        sku: testSku,
        isActive: true,
      },
    });
    testVariantId = variant.id;

    await prisma.inventory.create({
      data: {
        variantId: testVariantId,
        quantity: 1, // Exactly 1 item in stock!
      },
    });
  });

  it('20 concurrent order confirmations on 1 available item -> exactly 1 succeeds and 19 are auto-cancelled', async () => {
    const concurrentCount = 20;
    const orderIds: string[] = [];

    // Create 20 pending orders for this single item
    for (let i = 0; i < concurrentCount; i++) {
      const res = await request(app)
        .post('/api/orders')
        .send({
          customer: {
            name: `عميل متزامن ${i + 1}`,
            phone: `010${String(i).padStart(8, '0')}`,
            address: 'القاهرة',
            city: 'مدينة نصر',
          },
          shippingZoneId: cairoZoneId,
          items: [{ type: 'product', variantId: testVariantId, quantity: 1 }],
        });
      expect(res.status).toBe(201);
      orderIds.push(res.body.data.id);
    }

    // Fire confirmation requests for all 20 orders concurrently!
    const confirmationPromises = orderIds.map((id) =>
      request(app)
        .patch(`/api/admin/orders/${id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' })
    );

    const results = await Promise.all(confirmationPromises);

    // Count how many confirmed vs auto-cancelled
    const confirmedCount = results.filter((r) => r.body.data?.status === 'CONFIRMED').length;
    const cancelledCount = results.filter((r) => r.body.data?.status === 'CANCELLED').length;

    // Exactly 1 must be CONFIRMED, and the other 19 must be CANCELLED (OUT_OF_STOCK)
    expect(confirmedCount).toBe(1);
    expect(cancelledCount).toBe(concurrentCount - 1);

    // Verify stock is now exactly 0, NEVER negative (no overselling)!
    const finalInv = await prisma.inventory.findUnique({ where: { variantId: testVariantId } });
    expect(finalInv!.quantity).toBe(0);
  });
});
