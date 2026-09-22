import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EGYPT_GOVERNORATES = [
  { governorate: 'القاهرة', governorateEn: 'Cairo', shippingCost: 50, estimatedDays: 1 },
  { governorate: 'الجيزة', governorateEn: 'Giza', shippingCost: 50, estimatedDays: 1 },
  { governorate: 'القليوبية', governorateEn: 'Qalyubia', shippingCost: 55, estimatedDays: 2 },
  { governorate: 'الإسكندرية', governorateEn: 'Alexandria', shippingCost: 60, estimatedDays: 2 },
  { governorate: 'الشرقية', governorateEn: 'Sharqia', shippingCost: 60, estimatedDays: 2 },
  { governorate: 'الدقهلية', governorateEn: 'Dakahlia', shippingCost: 60, estimatedDays: 2 },
  { governorate: 'الغربية', governorateEn: 'Gharbia', shippingCost: 60, estimatedDays: 2 },
  { governorate: 'المنوفية', governorateEn: 'Menoufia', shippingCost: 60, estimatedDays: 2 },
  { governorate: 'البحيرة', governorateEn: 'Beheira', shippingCost: 65, estimatedDays: 3 },
  { governorate: 'كفر الشيخ', governorateEn: 'Kafr El Sheikh', shippingCost: 65, estimatedDays: 3 },
  { governorate: 'دمياط', governorateEn: 'Damietta', shippingCost: 65, estimatedDays: 3 },
  { governorate: 'بورسعيد', governorateEn: 'Port Said', shippingCost: 60, estimatedDays: 2 },
  { governorate: 'الإسماعيلية', governorateEn: 'Ismailia', shippingCost: 60, estimatedDays: 2 },
  { governorate: 'السويس', governorateEn: 'Suez', shippingCost: 60, estimatedDays: 2 },
  { governorate: 'الفيوم', governorateEn: 'Fayoum', shippingCost: 65, estimatedDays: 3 },
  { governorate: 'بني سويف', governorateEn: 'Beni Suef', shippingCost: 65, estimatedDays: 3 },
  { governorate: 'المنيا', governorateEn: 'Minya', shippingCost: 70, estimatedDays: 4 },
  { governorate: 'أسيوط', governorateEn: 'Asyut', shippingCost: 70, estimatedDays: 4 },
  { governorate: 'سوهاج', governorateEn: 'Sohag', shippingCost: 75, estimatedDays: 4 },
  { governorate: 'قنا', governorateEn: 'Qena', shippingCost: 75, estimatedDays: 4 },
  { governorate: 'الأقصر', governorateEn: 'Luxor', shippingCost: 75, estimatedDays: 4 },
  { governorate: 'أسوان', governorateEn: 'Aswan', shippingCost: 80, estimatedDays: 5 },
  { governorate: 'البحر الأحمر', governorateEn: 'Red Sea', shippingCost: 85, estimatedDays: 5 },
  { governorate: 'مطروح', governorateEn: 'Matrouh', shippingCost: 85, estimatedDays: 5 },
  { governorate: 'الوادي الجديد', governorateEn: 'New Valley', shippingCost: 90, estimatedDays: 6 },
  { governorate: 'شمال سيناء', governorateEn: 'North Sinai', shippingCost: 90, estimatedDays: 6 },
  { governorate: 'جنوب سيناء', governorateEn: 'South Sinai', shippingCost: 90, estimatedDays: 6 },
];

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Super Admin
  const adminEmail = (process.env.ADMIN_DEFAULT_EMAIL || 'admin@clothesstore.com').toLowerCase();
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123456';

  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await prisma.admin.create({
      data: {
        name: 'Super Admin',
        email: adminEmail,
        password: hashedPassword,
        isActive: true,
      },
    });
    console.log(`✅ Super Admin created: ${adminEmail}`);
  } else {
    console.log(`ℹ️ Super Admin already exists: ${adminEmail}`);
  }

  // 2. Seed 27 Shipping Zones
  console.log('📦 Seeding 27 shipping zones...');
  for (const zone of EGYPT_GOVERNORATES) {
    await prisma.shippingZone.upsert({
      where: { governorate: zone.governorate },
      update: {
        shippingCost: zone.shippingCost,
        estimatedDays: zone.estimatedDays,
      },
      create: {
        governorate: zone.governorate,
        governorateEn: zone.governorateEn,
        shippingCost: zone.shippingCost,
        estimatedDays: zone.estimatedDays,
        isActive: true,
      },
    });
  }
  console.log('✅ 27 Shipping zones seeded');

  // 3. Seed Products
  console.log('👕 Seeding products and variants...');
  let hoodie = await prisma.product.findFirst({ where: { name: 'هودي أسود أوفر سايز' } });
  if (!hoodie) {
    hoodie = await prisma.product.create({
      data: {
        name: 'هودي أسود أوفر سايز',
        nameAr: 'هودي أسود قطن ميلتون ثقيل',
        description: 'هودي شتوي عالي الجودة مصنوع من القطن المصري 100% مع بطانة داخلية ناعمة',
        basePrice: 450.0,
        images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2'],
        isActive: true,
        sortOrder: 1,
      },
    });

    // Variants for Hoodie: S, M, L, XL
    const sizes = [
      { size: 'S', sku: 'HOODIE-BLK-S', qty: 15 },
      { size: 'M', sku: 'HOODIE-BLK-M', qty: 30 },
      { size: 'L', sku: 'HOODIE-BLK-L', qty: 25 },
      { size: 'XL', sku: 'HOODIE-BLK-XL', qty: 10 },
    ];

    for (const v of sizes) {
      const variant = await prisma.variant.create({
        data: {
          productId: hoodie.id,
          size: v.size,
          sku: v.sku,
          isActive: true,
        },
      });

      await prisma.inventory.create({
        data: {
          variantId: variant.id,
          quantity: v.qty,
          lowStockAt: 5,
        },
      });

      await prisma.inventoryLog.create({
        data: {
          inventoryId: (await prisma.inventory.findUnique({ where: { variantId: variant.id } }))!.id,
          change: v.qty,
          reason: 'MANUAL_RESTOCK',
          referenceId: 'INITIAL_SEED',
        },
      });
    }
  }

  let scarf = await prisma.product.findFirst({ where: { name: 'كوفية صوف شتوية' } });
  if (!scarf) {
    scarf = await prisma.product.create({
      data: {
        name: 'كوفية صوف شتوية',
        nameAr: 'كوفية صوف ناعمة عريضة',
        description: 'كوفية صوف محاكة يدوياً بتصميم عصري وألوان محايدة',
        basePrice: 150.0,
        images: ['https://images.unsplash.com/photo-1520903920243-00d872a2d1c9'],
        isActive: true,
        sortOrder: 2,
      },
    });

    const scarfVariant = await prisma.variant.create({
      data: {
        productId: scarf.id,
        size: 'ONE_SIZE',
        sku: 'SCARF-GRY-OS',
        isActive: true,
      },
    });

    await prisma.inventory.create({
      data: {
        variantId: scarfVariant.id,
        quantity: 50,
        lowStockAt: 5,
      },
    });

    await prisma.inventoryLog.create({
      data: {
        inventoryId: (await prisma.inventory.findUnique({ where: { variantId: scarfVariant.id } }))!.id,
        change: 50,
        reason: 'MANUAL_RESTOCK',
        referenceId: 'INITIAL_SEED',
      },
    });
  }

  // 4. Seed Winter Bundle
  console.log('🎁 Seeding winter bundle...');
  const existingBundle = await prisma.bundle.findFirst({ where: { name: 'باقة الشتاء الدافئة' } });
  if (!existingBundle && hoodie && scarf) {
    const bundle = await prisma.bundle.create({
      data: {
        name: 'باقة الشتاء الدافئة',
        nameAr: 'هودي قطن + كوفية صوف',
        description: 'وفر 100 ج.م واشتري الهودي والكوفية معاً في عرض الشتاء المميز',
        image: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2',
        price: 500.0,
        isActive: true,
        sortOrder: 1,
      },
    });

    // Bundle Item 1: Hoodie (with allowed variants: S, M, L, XL)
    const hoodieVariants = await prisma.variant.findMany({ where: { productId: hoodie.id } });
    const bundleItem1 = await prisma.bundleItem.create({
      data: {
        bundleId: bundle.id,
        productId: hoodie.id,
        quantity: 1,
      },
    });

    for (const hv of hoodieVariants) {
      await prisma.bundleItemVariant.create({
        data: {
          bundleItemId: bundleItem1.id,
          variantId: hv.id,
        },
      });
    }

    // Bundle Item 2: Scarf (with allowed variant: ONE_SIZE)
    const scarfVariants = await prisma.variant.findMany({ where: { productId: scarf.id } });
    const bundleItem2 = await prisma.bundleItem.create({
      data: {
        bundleId: bundle.id,
        productId: scarf.id,
        quantity: 1,
      },
    });

    for (const sv of scarfVariants) {
      await prisma.bundleItemVariant.create({
        data: {
          bundleItemId: bundleItem2.id,
          variantId: sv.id,
        },
      });
    }
    console.log('✅ Bundle created with BundleItemVariant associations');
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
