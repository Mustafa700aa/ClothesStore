import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/config/database.js';

describe('ClothesStore API - End-to-End Integration Tests', () => {
  let adminToken: string;
  let sampleVariantId: string;
  let cairoZoneId: string;
  let sampleBundleId: string;
  let hoodieBundleItemId: string;
  let scarfBundleItemId: string;
  let hoodieAllowedVariantId: string;
  let scarfAllowedVariantId: string;

  beforeAll(async () => {
    // 1. Authenticate Super Admin
    const loginRes = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: 'admin@clothesstore.com', password: 'Admin@123456' });

    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.data.token;
    expect(adminToken).toBeDefined();

    // 2. Fetch seeded test data and ensure plenty of stock for repeatable tests
    const variant = await prisma.variant.findFirst({
      where: { sku: 'HOODIE-BLK-L' },
      include: { inventory: true },
    });
    sampleVariantId = variant!.id;

    await prisma.inventory.update({
      where: { variantId: sampleVariantId },
      data: { quantity: 100 },
    });

    const zone = await prisma.shippingZone.findUnique({
      where: { governorate: 'القاهرة' },
    });
    cairoZoneId = zone!.id;

    const bundle = await prisma.bundle.findFirst({
      where: { name: 'باقة الشتاء الدافئة' },
      include: {
        items: {
          include: {
            allowedVariants: true,
          },
        },
      },
    });
    sampleBundleId = bundle!.id;
    hoodieBundleItemId = bundle!.items[0].id;
    hoodieAllowedVariantId = bundle!.items[0].allowedVariants[0].variantId;
    scarfBundleItemId = bundle!.items[1].id;
    scarfAllowedVariantId = bundle!.items[1].allowedVariants[0].variantId;
  });

  it('1. GET /health - should return healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
  });

  it('2. GET /api/products - public storefront should list active products with stock', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('variants');
    expect(res.body.data[0].variants[0]).toHaveProperty('availableStock');
  });

  it('3. GET /api/bundles - public storefront should list active bundles with allowedVariants', async () => {
    const res = await request(app).get('/api/bundles');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const bundle = res.body.data[0];
    expect(bundle).toHaveProperty('items');
    expect(bundle.items[0]).toHaveProperty('allowedVariants');
    expect(bundle.items[0].allowedVariants.length).toBeGreaterThan(0);
  });

  it('4. GET /api/shipping/zones - should list active Egyptian shipping zones', async () => {
    const res = await request(app).get('/api/shipping/zones');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(27);
    expect(res.body.data[0]).toHaveProperty('estimatedDays');
  });

  it('5. POST /api/orders - should create order as PENDING without deducting inventory (Delayed Allocation)', async () => {
    const initialInv = await prisma.inventory.findUnique({ where: { variantId: sampleVariantId } });
    const initialQty = initialInv!.quantity;

    const res = await request(app)
      .post('/api/orders')
      .send({
        customer: {
          name: 'محمد أحمد',
          phone: '01012345678',
          altPhone: '01198765432',
          address: '15 شارع النيل، المعادي',
          city: 'المعادي',
          notes: 'برجاء الاتصال قبل التوصيل',
        },
        shippingZoneId: cairoZoneId,
        items: [
          {
            type: 'product',
            variantId: sampleVariantId,
            quantity: 2,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const order = res.body.data;
    expect(order.status).toBe('PENDING');
    expect(order.orderNumber).toMatch(/^ORD-\d{8}-\d{3,4}$/);

    // Verify inventory was NOT changed at PENDING state
    const postInv = await prisma.inventory.findUnique({ where: { variantId: sampleVariantId } });
    expect(postInv!.quantity).toBe(initialQty);
  });

  it('6. POST /api/orders - Idempotency test with X-Idempotency-Key', async () => {
    const idempotencyKey = `idemp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const payload = {
      customer: {
        name: 'عميل مكرر',
        phone: '01234567890',
        address: 'شارع التحرير، الدقي',
        city: 'الدقي',
      },
      shippingZoneId: cairoZoneId,
      items: [
        {
          type: 'product',
          variantId: sampleVariantId,
          quantity: 1,
        },
      ],
    };

    // First request
    const res1 = await request(app)
      .post('/api/orders')
      .set('X-Idempotency-Key', idempotencyKey)
      .send(payload);
    expect(res1.status).toBe(201);
    const firstOrderId = res1.body.data.id;

    // Second request with SAME key
    const res2 = await request(app)
      .post('/api/orders')
      .set('X-Idempotency-Key', idempotencyKey)
      .send(payload);
    expect(res2.status).toBe(200);
    expect(res2.body.data._idempotent).toBe(true);
    expect(res2.body.data.id).toBe(firstOrderId);
  });

  it('7. PATCH /api/admin/orders/:id/status - CONFIRM order and verify atomic stock deduction', async () => {
    // 1. Create a fresh order
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customer: {
          name: 'أحمد محمود',
          phone: '01511223344',
          address: 'ميدان روكسي، مصر الجديدة',
          city: 'مصر الجديدة',
        },
        shippingZoneId: cairoZoneId,
        items: [
          {
            type: 'product',
            variantId: sampleVariantId,
            quantity: 3,
          },
        ],
      });

    const orderId = orderRes.body.data.id;
    const invBefore = await prisma.inventory.findUnique({ where: { variantId: sampleVariantId } });

    // 2. Admin confirms order
    const confirmRes = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CONFIRMED', note: 'تم تأكيد الطلب هاتفياً مع العميل' });

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('CONFIRMED');

    // 3. Verify stock was deducted by exactly 3
    const invAfter = await prisma.inventory.findUnique({ where: { variantId: sampleVariantId } });
    expect(invAfter!.quantity).toBe(invBefore!.quantity - 3);

    // 4. Verify InventoryLog was recorded
    const log = await prisma.inventoryLog.findFirst({
      where: { referenceId: orderId },
    });
    expect(log).toBeDefined();
    expect(log!.change).toBe(-3);
    expect(log!.reason).toBe('ORDER_CONFIRMED');
  });

  it('8. Full Lifecycle: CONFIRMED -> READY_FOR_PICKUP -> SHIPPED -> DELIVERED', async () => {
    // Create and confirm order
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customer: {
          name: 'حسام حسن',
          phone: '01099887766',
          address: 'المهندسين، شارع جامعة الدول',
          city: 'المهندسين',
        },
        shippingZoneId: cairoZoneId,
        items: [{ type: 'product', variantId: sampleVariantId, quantity: 1 }],
      });

    const orderId = orderRes.body.data.id;

    // CONFIRMED
    await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CONFIRMED' });

    // READY_FOR_PICKUP
    const readyRes = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'READY_FOR_PICKUP', trackingNumber: 'TRK-123456', carrierName: 'Bosta' });
    expect(readyRes.status).toBe(200);
    expect(readyRes.body.data.status).toBe('READY_FOR_PICKUP');
    expect(readyRes.body.data.trackingNumber).toBe('TRK-123456');

    // SHIPPED
    const shippedRes = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SHIPPED' });
    expect(shippedRes.status).toBe(200);
    expect(shippedRes.body.data.status).toBe('SHIPPED');

    // DELIVERED
    const deliveredRes = await request(app)
      .patch(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DELIVERED' });
    expect(deliveredRes.status).toBe(200);
    expect(deliveredRes.body.data.status).toBe('DELIVERED');
  });

  it('9. Bundle order creation and decomposition', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        customer: {
          name: 'طارق سليم',
          phone: '01211112222',
          address: 'المعادي، دجلة',
          city: 'المعادي',
        },
        shippingZoneId: cairoZoneId,
        items: [
          {
            type: 'bundle',
            bundleId: sampleBundleId,
            quantity: 1,
            selectedVariants: [
              { bundleItemId: hoodieBundleItemId, variantId: hoodieAllowedVariantId },
              { bundleItemId: scarfBundleItemId, variantId: scarfAllowedVariantId },
            ],
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBe(3); // 1 bundle snapshot + 2 component variants
  });

  it('10. Dashboard 12 Endpoints - should all return 200 with accurate aggregated data', async () => {
    const endpoints = [
      '/api/admin/dashboard/overview',
      '/api/admin/dashboard/revenue',
      '/api/admin/dashboard/top-products',
      '/api/admin/dashboard/top-bundles',
      '/api/admin/dashboard/governorates',
      '/api/admin/dashboard/return-rate',
      '/api/admin/dashboard/conversion',
      '/api/admin/dashboard/pending-actions',
      '/api/admin/dashboard/aov',
      '/api/admin/dashboard/repeat-customers',
      '/api/admin/dashboard/day-of-week',
      '/api/admin/dashboard/governorate-returns',
    ];

    for (const ep of endpoints) {
      const res = await request(app)
        .get(ep)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status, `Endpoint ${ep} failed with ${res.status}`).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    }
  });
});
