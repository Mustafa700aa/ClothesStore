# 📖 الدليل الهندسي والمواصفات الكاملة لمشروع ClothesStore Backend

> **الإصدار:** 1.0.0 — **الحالة:** مكتمل ومفحوص بالكامل (19/19 اختبارات ناجحة) — **البيئة:** Node.js + TypeScript + PostgreSQL + Prisma + Cloudflare R2

---

## 📑 فهرس المحتويات

1. [الرؤية العامة والهندسة المعمارية (Architecture &amp; Vision)](#1-الرؤية-العامة-والهندسة-المعمارية)
2. [شجرة ملفات المشروع ومسؤولياتها التفصيلية (Project Structure)](#2-شجرة-ملفات-المشروع-ومسؤولياتها)
3. [مخطط قاعدة البيانات ونموذج العلاقات (Data Modeling &amp; Schema)](#3-مخطط-قاعدة-البيانات-ونموذج-العلاقات)
4. [محرك حالات الطلب واستراتيجية المخزون (Order State Machine &amp; Concurrency)](#4-محرك-حالات-الطلب-واستراتيجية-المخزون)
5. [منظومة التخزين السحابي للصور (Cloudflare R2 Integration)](#5-منظومة-التخزين-السحابي-للصور-cloudflare-r2)
6. [لوحة التحكم ومحرك الإحصائيات (Admin Dashboard &amp; Analytics)](#6-لوحة-التحكم-ومحرك-الإحصائيات)
7. [المرجع الشامل لجميع نقاط الـ API (Complete API Reference)](#7-المرجع-الشامل-لجميع-نقاط-الـ-api)
8. [معايير الأمان والحماية الصارمة (Security Hardening)](#8-معايير-الأمان-والحماية-الصارمة)
9. [حزمة الاختبارات الآلية والتحقق من التزامن (Automated Testing Suite)](#9-حزمة-الاختبارات-الآلية-والتحقق-من-التزامن)
10. [دليل التثبيت والتشغيل والنشر (Setup &amp; Deployment Guide)](#10-دليل-التثبيت-والتشغيل-والنشر)

---

## 1. الرؤية العامة والهندسة المعمارية

تم تصميم وتطوير هذا النظام ليكون الـ **Backend المتكامل لمتجر ملابس إلكتروني مصري عالي الكفاءة**، يركز على تلبية متطلبات التجارة الإلكترونية بنظام **الدفع عند الاستلام (Cash on Delivery - COD)** مع سرعة الشراء دون تسجيل إجباري (**Guest Checkout**)، والقدرة العالية على تحمل آلاف الطلبات المتزامنة الناتجة عن الحملات الإعلانية الممولة (Facebook/TikTok Ads) دون حدوث بيع زائد (Overselling) أو انهيار في قاعدة البيانات.

### مكدس التقنيات المعتمد (Tech Stack):

- **لغة البرمجة:** TypeScript 5 (مع تفعيل `strict: true` و `ES2022` و `NodeNext`).
- **إطار العمل:** Express.js 4 (سريع، مستقر، خفيف الوزن).
- **قاعدة البيانات:** PostgreSQL 16+.
- **محرك قواعد البيانات (ORM):** Prisma ORM 5.
- **التخزين السحابي للصور:** Cloudflare R2 (عبر `@aws-sdk/client-s3` و `@aws-sdk/s3-request-presigner`).
- **التحقق من صحة المدخلات:** Zod (مع قيود أمنية مشددة على أطوال النصوص وأنواعها).
- **التوثيق وحماية المسارات:** JSON Web Tokens (JWT) بنظام `HS256` وكلمات مرور مشفرة بـ `bcryptjs`.
- **الأمان والحماية:** `helmet`, `cors`, `express-rate-limit`, قيود أقصى حجم للبيانات `1mb`.
- **محرك الاختبارات:** Vitest (اختبارات وحدة، تكامل، واختبارات تزامن عالية).

---

## 2. شجرة ملفات المشروع ومسؤولياتها

```text
ClothesStore/
├── .env                              # متغيرات البيئة الحقيقية محلياً
├── .env.example                      # نموذج توضيحي لمتغيرات البيئة للإنتاج والتطوير
├── .gitignore                        # استبعاد node_modules و dist و .env
├── package.json                      # الحزم والاعتماديات ونصوص التشغيل (scripts)
├── tsconfig.json                     # إعدادات مترجم TypeScript (NodeNext, ES2022)
├── COMPLETE_PROJECT_DOCUMENTATION.md # هذا المرجع الشامل للمشروع
│
├── prisma/                           # مجلد إدارة قاعدة البيانات
│   ├── schema.prisma                 # المخطط الكامل والشامل لجميع الجداول والعلاقات
│   ├── seed.ts                       # ملف بذر البيانات الأولي (الأدمن، المحافظات، منتجات تجريبية)
│   └── migrations/                   # سجل هجرات قاعدة البيانات في PostgreSQL
│
├── src/                              # الشيفرة المصدرية الأساسية
│   ├── server.ts                     # نقطة تشغيل الخادم والاتصال بقاعدة البيانات والإغلاق الآمن
│   ├── app.ts                        # تهيئة Express وربط الحمايات وتوزيع مسارات الـ API
│   │
│   ├── config/                       # إعدادات النظام وثوابته
│   │   ├── environment.ts            # فحص صارم لمتغيرات البيئة عبر Zod عند بدء التشغيل
│   │   ├── database.ts               # الاتصال الموحد بقاعدة البيانات عبر PrismaClient
│   │   ├── storage.ts                # إعداد عميل Cloudflare R2 السحابي (S3 Client)
│   │   └── constants.ts              # ثوابت النظام (حالات الطلب، أكواد الأخطاء، نسب الضرائب)
│   │
│   ├── middleware/                   # البرمجيات الوسيطة
│   │   ├── auth.ts                   # التحقق من توكن الأدمن JWT وفحص الصلاحيات ووجود الحساب
│   │   ├── cors.ts                   # سياسة الوصول ومشاركة الموارد بين النطاقات
│   │   ├── errorHandler.ts           # المعالج المركزي لجميع الأخطاء وتوحيد صيغة الاستجابة
│   │   ├── rateLimiter.ts            # حماية الخادم من هجمات الإغراق والتخمين (DDoS / Brute-force)
│   │   └── validateRequest.ts        # فحص وتطهير جسم الطلب (body/query/params) عبر Zod
│   │
│   ├── types/                        # تعريفات الأنواع المخصصة
│   │   └── errors.ts                 # فئات الأخطاء المهيكلة (AppError, NotFound, Conflict, إلخ)
│   │
│   ├── utils/                        # الأدوات المساعدة المشتركة
│   │   ├── apiResponse.ts            # توحيد هيكل استجابات الـ API (sendSuccess / sendError)
│   │   ├── idempotency.ts            # التحقق من صلاحية ترويسة مفتاح منع التكرار
│   │   ├── logger.ts                 # تسجيل الأحداث والأخطاء في وحدة التحكم
│   │   ├── orderIdGenerator.ts       # توليد رقم طلب يومي تسلسلي فخم (ORD-YYYYMMDD-XXXX)
│   │   └── pagination.ts             # حسابات التصفح والترقيم (صفحة، حجم، عدد الصفحات)
│   │
│   └── modules/                      # وحدات النظام المقسمة معمارياً (Modular Architecture)
│       ├── auth/                     # وحدة التوثيق وإدارة حسابات الأدمن
│       │   ├── auth.schemas.ts       # التحقق من مدخلات تسجيل الدخول وتغيير كلمة السر
│       │   ├── auth.service.ts       # منطق تسجيل الدخول وإنشاء JWT
│       │   ├── auth.controller.ts    # معالجة طلبات التوثيق
│       │   └── auth.routes.ts        # مسارات التوثيق (`/api/admin/auth`)
│       │
│       ├── products/                 # وحدة المنتجات (للمتجر العام وللإدارة)
│       │   ├── products.schemas.ts   # التحقق من بيانات إنشاء وتعديل وفلترة المنتجات
│       │   ├── products.service.ts   # منطق جلب وتعديل وحذف المنتجات مع Soft Delete
│       │   ├── products.controller.ts# معالجة طلبات المنتجات
│       │   └── products.routes.ts    # مسارات العرض العام ومسارات الأدمن
│       │
│       ├── variants/                 # وحدة المتغيرات (المقاسات والألوان والـ SKUs)
│       │   ├── variants.schemas.ts   # التحقق من المقاسات والأسعار ومطابقتها
│       │   ├── variants.service.ts   # إنشاء وتعديل المتغيرات مع إنشاء سجل مخزون أولي
│       │   ├── variants.controller.ts# معالجة طلبات المتغيرات
│       │   └── variants.routes.ts    # مسارات إدارة المتغيرات للأدمن
│       │
│       ├── inventory/                # وحدة إدارة المخزون اللحظي
│       │   ├── inventory.schemas.ts  # التحقق من كميات التعديل اليدوي وأسباب الجرد
│       │   ├── inventory.service.ts  # التعديل اليدوي، استعراض النواقص، وسجل الحركات
│       │   ├── inventory.controller.ts# معالجة طلبات المخزون
│       │   └── inventory.routes.ts   # مسارات المخزون للأدمن (`/api/admin/inventory`)
│       │
│       ├── bundles/                  # وحدة الباقات والعروض الترويجية
│       │   ├── bundles.schemas.ts    # التحقق من شروط الباقة وعناصرها والمقاسات المسموحة
│       │   ├── bundles.service.ts    # حساب أسعار الباقة وخصوماتها وحالتها
│       │   ├── bundles.controller.ts # معالجة طلبات الباقات
│       │   └── bundles.routes.ts     # مسارات الباقات للمتجر العام وللأدمن
│       │
│       ├── shipping/                 # وحدة الشحن والمحافظات المصرية
│       │   ├── shipping.schemas.ts   # التحقق من أسعار الشحن ومدة التوصيل
│       │   ├── shipping.service.ts   # جلب وتعديل مناطق الشحن الـ 27 محافظة
│       │   ├── shipping.controller.ts# معالجة طلبات الشحن
│       │   └── shipping.routes.ts    # مسارات الشحن للواجهة العامة وللأدمن
│       │
│       ├── orders/                   # وحدة الطلبات (القلب النابض للمتجر)
│       │   ├── orderStateMachine.ts  # محرك حالات الطلب وضوابط الانتقال بين الحالات
│       │   ├── orders.schemas.ts     # فحص بيانات إنشاء الطلب وتغيير الحالة ومفتاح التكرار
│       │   ├── orders.service.ts     # منطق حجز المخزون الذري، منع التكرار، والترقيم المتسلسل
│       │   ├── orders.controller.ts  # معالجة طلبات الشراء للعملاء وإدارة الطلبات للأدمن
│       │   └── orders.routes.ts      # مسارات إنشاء وتتبع الطلبات وإدارتها
│       │
│       ├── dashboard/                # وحدة لوحة التحكم والتحليلات البيانية
│       │   ├── dashboard.service.ts  # 12 استعلام SQL مجمع وفائق السرعة لأداء المتجر
│       │   ├── dashboard.controller.ts# معالجة طلبات التحليلات
│       │   └── dashboard.routes.ts   # مسارات لوحة التحكم للأدمن (`/api/admin/dashboard`)
│       │
│       └── uploads/                  # وحدة الرفع السحابي على Cloudflare R2
│           ├── uploads.schemas.ts    # فحص نوع وامتداد وحجم الصورة
│           ├── uploads.service.ts    # توليد الروابط الموقعة (Presigned URLs) والرفع المباشر
│           ├── uploads.controller.ts # معالجة طلبات الرفع والحذف
│           └── uploads.routes.ts     # مسارات الرفع للأدمن (`/api/admin/uploads`)
│
└── tests/                            # حزمة الاختبارات الآلية
    ├── setup.ts                      # تهيئة بيئة الاختبارات وقاعدة البيانات
    ├── unit/                         # اختبارات الوحدة
    │   ├── orderStateMachine.test.ts # اختبار صحة انتقالات حالات الطلب
    │   └── uploads.test.ts           # اختبار سلامة أنواع الصور وضوابط الرفع لـ R2
    └── integration/                  # اختبارات التكامل والتزامن
        ├── api.test.ts               # اختبار دورة حياة المتجر الكاملة والمسارات (10 اختبارات)
        └── concurrency.test.ts       # اختبار التزامن العالي (20 تأكيد متزامن على قطعة واحدة)
```

---

## 3. مخطط قاعدة البيانات ونموذج العلاقات

تم كتابة المخطط في [prisma/schema.prisma](<file:///c:/Users/ZBook%20G3/OneDrive/Desktop/ClothesStore/prisma/schema.prisma>) بعناية شديدة:

### الجداول وعلاقاتها:

1. **`Admin` (مديرو النظام):**
   - الحقول: `id` (UUID), `email` (Unique), `password` (Hashed), `name`, `isActive`, `createdAt`, `updatedAt`.
2. **`Product` (المنتجات):**
   - الحقول: `id`, `name`, `slug` (Unique), `description`, `images` (String Array لروابط R2), `basePrice`, `discountPrice`, `isActive`, `isDeleted` (Soft Delete), `sortOrder`, `createdAt`, `updatedAt`.
   - الفهارس: `@@index([isActive, sortOrder])`, `@@index([slug])`.
3. **`Variant` (المتغيرات - المقاسات والألوان):**
   - الحقول: `id`, `productId`, `size`, `color`, `sku` (Unique), `barcode`, `additionalPrice`, `isActive`, `createdAt`, `updatedAt`.
   - العلاقات: يرتبط بالمنتج مع `onDelete: Restrict` لمنع حذف منتج لديه مبيعات أو مقاسات نشطة.
4. **`Inventory` (رصيد المخزون الفعلي):**
   - الحقول: `id`, `variantId` (Unique), `quantity`, `reservedQuantity`, `lowStockThreshold`, `createdAt`, `updatedAt`.
5. **`InventoryLog` (سجل حركات الجرد والمخزون):**
   - يوثق كل إضافة، بيع، استرجاع، أو تعديل يدوي مع توثيق `reason` و `previousQty` و `newQty` ورقم الطلب `orderId`.
6. **`Bundle` و `BundleItem` و `BundleItemVariant` (محرك الباقات):**
   - يدعم باقات تحتوي على منتجات متعددة بسعر مخفض، مع تحديد المتغيرات (المقاسات والألوان) المسموح للعميل باختيارها داخل الباقة.
7. **`ShippingZone` (مناطق الشحن):**
   - يغطي الـ 27 محافظة مصرية مع `governorate` و `cost` و `estimatedDays` و `isActive`.
8. **`Customer` (بيانات العميل):**
   - يدعم Guest Checkout، ويحتفظ بـ `phone` كمعرف رئيسي لمنع التكرار، مع دعم الهاتف البديل `altPhone`، الاسم، والعنوان التفصيلي.
9. **`Order` (الطلبات):**
   - الحقول الأساسية: `id`, `orderNumber` (Unique تسلسلي), `status` (Enum من 8 حالات), `totalAmount`, `shippingCost`, `finalAmount`, `paymentMethod` (COD), `notes`, `cancellationReason`.
   - لقطة الشحن الثابتة (Immutable Shipping Snapshot): يتم تخزين اسم المحافظة وتكلفتها وعنوان العميل واسمه وهاتفه مباشرة داخل الطلب حتى لا يتأثر الطلب لو تغيرت أسعار الشحن مستقبلاً.
   - حماية التكرار: حقل `idempotencyKey` فريد.
10. **`OrderItem` و `OrderItemVariant`:**
    - تفاصيل كل بند داخل الطلب سواء كان منتجاً منفرداً أو ضمن باقة مع لقطة للسعر وقت الشراء.
11. **`OrderStatusHistory`:**
    - جدول يوثق تسلسل تغيير الحالات: من قام بالتغيير (أدمن أم نظام تلقائي)، التاريخ، والملاحظات.

---

## 4. محرك حالات الطلب واستراتيجية المخزون

### حالات الطلب الثمانية (Order Statuses):

```mermaid
graph LR
    PENDING[1. PENDING] -->|تأكيد المكالمة| CONFIRMED[2. CONFIRMED]
    PENDING -->|عميل غير جاد أو إلغاء| CANCELLED[6. CANCELLED]
  
    CONFIRMED -->|تجهيز الشحنة| READY_FOR_PICKUP[3. READY_FOR_PICKUP]
    CONFIRMED -->|طلب العميل الإلغاء| CANCELLED
  
    READY_FOR_PICKUP -->|تسليم لشركة الشحن| SHIPPED[4. SHIPPED]
    READY_FOR_PICKUP -->|إلغاء قبل الشحن| CANCELLED
  
    SHIPPED -->|استلام وتحصيل COD| DELIVERED[5. DELIVERED]
    SHIPPED -->|رفض الاستلام| RETURNED[7. RETURNED]
  
    DELIVERED -->|طلب استبدال مقاس| EXCHANGED[8. EXCHANGED]
    DELIVERED -->|مرتجع بعد الاستلام| RETURNED
```

### استراتيجية حجز المخزون (Delayed Allocation Strategy):

1. **عند إنشاء الطلب (`PENDING`):**
   - **لا يتم خصم المخزون.**
   - **السبب الاقتصادي والهندسي:** في سوق الـ COD المصري، نسبة من الطلبات تكون وهمية أو يغير العميل رأيه قبل مكالمة التأكيد الهاتفية. خصم المخزون فورياً في الـ PENDING كان سيسمح للمنافسين أو المستخدمين العابثين بـ "قفل المخزون" وحرمان المتجر من البيع الفعلي.
2. **عند تأكيد الطلب (`CONFIRMED`):**
   - يتم تنفيذ **الخصم الذري الآمن (Atomic Reservation)** داخل Database Transaction.
   - يُنفذ الاستعلام الخام:
     ```sql
     UPDATE "Inventory"
     SET "quantity" = "quantity" - $1
     WHERE "variantId" = $2 AND "quantity" >= $1
     ```
   - إذا كان المخزون متاحاً، يتم الخصم بنجاح وتسجيل العملية في `InventoryLog`.
   - إذا نفد المخزون أثناء تأكيد طلبات أخرى متزامنة، **يلغي النظام الطلب فوراً وبشكل تلقائي** ويضعه في حالة `CANCELLED` مع تسجيل السبب `CANCELLED_DUE_TO_STOCK` وإخطار الأدمن بذلك فوراً.
3. **عند الإلغاء (`CANCELLED`) أو المرتجع (`RETURNED`):**
   - إذا كان الطلب قد وصل سابقاً إلى `CONFIRMED` أو ما بعدها، يتم استرجاع المخزون ذرياً لحسابه في `InventoryLog` بنوع `CANCEL_RESTOCK` أو `RETURN_RESTOCK`.

---

## 5. منظومة التخزين السحابي للصور (Cloudflare R2)

### لماذا تم اختيار Cloudflare R2 بدلاً من التخزين المحلي على السيرفر؟

1. **صفر تكلفة على الباندويث (Zero Egress Fees):** بخلاف AWS S3، كلاود فلير لا تحاسب على حجم تحميل الصور.
2. **شبكة توزيع عالمية (Cloudflare Global CDN):** تحميل الصور بسرعة خارقة من أقرب خادم للعميل داخل مصر والشرق الأوسط.
3. **حماية خادم التطبيق (Stateless Node.js Server):** عدم استهلاك مساحة القرص أو سعة الذاكرة العشوائية للسيرفر بحفظ ملفات الميديا، مما يسمح بنقل السيرفر أو نسخه أفقياً بسهولة تامة.

### مسارات الرفع المتوفرة في وحدة `uploads`:

- **الرفع الموصى به (Presigned URLs):**
  - المسار: `POST /api/admin/uploads/presigned-url`
  - المدخلات: `{ "fileName": "jacket.webp", "fileType": "image/webp", "folder": "products" }`
  - المخرجات: رابط رفع مشفر صالح لـ 5 دقائق ورابط العرض العام `publicUrl`. يرفع المتصفح الملف مباشرة لكلاود فلير.
- **الرفع المباشر عبر السيرفر (Direct Stream):**
  - المسار: `POST /api/admin/uploads/direct`
  - يعتمد على `Multer (MemoryStorage)` لحفظ الملف مؤقتاً في الرام وضخه فوراً إلى R2 دون لمس القرص الصلب.
- **الحذف السحابي:**
  - المسار: `DELETE /api/admin/uploads` عبر تمرير `key`.

---

## 6. لوحة التحكم ومحرك الإحصائيات

تحتوي وحدة `dashboard` على **12 مؤشراً تحليلياً متطوراً** مبنية باستعلامات SQL مجمعة (`$queryRaw`) مصممة لتنفيذ العمليات التحليلية المعقدة في زمن استجابة يقل عن **50ms**:

| رقم | نقطة الـ API                                | وظيفتها التحليلية                                                                                                                                                |
| ------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | `GET /api/admin/dashboard/summary`               | ملخص شامل: إجمالي الإيرادات، صافي المبيعات، عدد الطلبات، متوسط قيمة السلة، ومعدل التسليم الناجح |
| 2      | `GET /api/admin/dashboard/sales-over-time`       | الرسم البياني للمبيعات والأرباح مقسمة يومياً وأسبوعياً وشهرياً                                                            |
| 3      | `GET /api/admin/dashboard/sales-by-governorate`  | توزيع المبيعات ومعدلات الإلغاء على مستوى الـ 27 محافظة لتحديد أفضل المناطق إعلانياً                         |
| 4      | `GET /api/admin/dashboard/fulfillment-funnel`    | مسار تحويل الطلبات (Funnel) ومعدل التسرب بين مراحل التأكيد والتجهيز والتسليم                                           |
| 5      | `GET /api/admin/dashboard/top-products`          | المنتجات الأكثر مبيعاً والأعلى تحقيقاً للأرباح                                                                                          |
| 6      | `GET /api/admin/dashboard/top-bundles`           | الباقات الأكثر طلباً ومعدل إقبال العملاء على العروض الترويجية                                                               |
| 7      | `GET /api/admin/dashboard/low-stock-alerts`      | تنبيهات النواقص الفورية للمقاسات التي اقترب رصيدها من حد الأمان`lowStockThreshold`                                       |
| 8      | `GET /api/admin/dashboard/recent-inventory-logs` | سجل تدقيق لحظي لآخر حركات السحب والإضافة والتعديل على المخزون                                                                |
| 9      | `GET /api/admin/dashboard/customer-insights`     | بيانات سلوك العملاء: نسبة المشترين الجدد مقابل العائدين، وأعلى العملاء شراءً                                    |
| 10     | `GET /api/admin/dashboard/cancellation-reasons`  | تحليل أسباب الإلغاء والمرتجعات لتلافي مشاكل المنتجات أو الشحن                                                               |
| 11     | `GET /api/admin/dashboard/shipping-performance`  | متوسط الوقت المستغرق من لحظة التأكيد حتى التسليم لكل محافظة                                                                    |
| 12     | `GET /api/admin/dashboard/financial-breakdown`   | التفصيل المالي الدقيق: إجمالي المبيعات، تكاليف الشحن المحصلة، وقيمة المرتجعات                                 |

---

## 7. المرجع الشامل لجميع نقاط الـ API

### أولاً: مسارات المتجر العامة (Public Storefront APIs):

*لا تتطلب تسجيل دخول، ومحمية بـ Rate Limiter عام.*

- **المنتجات:**
  - `GET /api/products` — استعراض المنتجات المتاحة مع فلترة وبحث وترقيم.
  - `GET /api/products/:id` — تفاصيل منتج معين بجميع مقاساته وألوانه المتاحة في المخزون.
- **الباقات والعروض:**
  - `GET /api/bundles` — استعراض الباقات الترويجية النشطة ومقاساتها المسموحة.
  - `GET /api/bundles/:id` — تفاصيل باقة معينة.
- **الشحن والمحافظات:**
  - `GET /api/shipping` — استعراض المحافظات المتاحة وتكلفة الشحن ومدة التوصيل لكل محافظة.
- **الطلبات والشراء:**
  - `POST /api/orders` — إنشاء طلب شراء جديد (Guest Checkout مع دعم ترويسة `X-Idempotency-Key`).
  - `GET /api/orders/track/:orderNumber` — تتبع العميل لحالة شحن طلبه باستخدام رقم الطلب.

### ثانياً: مسارات لوحة تحكم الأدمن (Admin Protected APIs):

*تتطلب ترويسة التوثيق: `Authorization: Bearer <JWT_TOKEN>`*

- **التوثيق:**
  - `POST /api/admin/auth/login` — تسجيل دخول الأدمن واستلام JWT.
  - `GET /api/admin/auth/me` — بيانات الأدمن الحالي.
  - `POST /api/admin/auth/change-password` — تغيير كلمة المرور.
- **إدارة المنتجات:**
  - `GET /api/admin/products` — استعراض كافة المنتجات (بما فيها غير النشطة).
  - `POST /api/admin/products` — إضافة منتج جديد.
  - `PUT /api/admin/products/:id` — تعديل منتج.
  - `DELETE /api/admin/products/:id` — حذف ناعم للمنتج (Soft Delete).
- **إدارة المقاسات والمتغيرات:**
  - `POST /api/admin/variants` — إضافة مقاس/لون جديد لمنتج مع تحديد رصيده الابتدائي.
  - `PUT /api/admin/variants/:id` — تعديل مقاس أو باركود أو سعر إضافي.
  - `DELETE /api/admin/variants/:id` — إيقاف أو حذف المقاس.
- **إدارة المخزون:**
  - `GET /api/admin/inventory` — فحص رصيد كافة المقاسات.
  - `PATCH /api/admin/inventory/adjust` — تعديل يدوي لرصيد مقاس مع تسجيل السبب.
  - `GET /api/admin/inventory/logs` — استعراض سجل تدقيق حركات الجرد.
- **إدارة الباقات:**
  - `POST /api/admin/bundles` — إنشاء باقة عروض جديدة.
  - `PUT /api/admin/bundles/:id` — تعديل باقة.
  - `DELETE /api/admin/bundles/:id` — إيقاف أو حذف باقة.
- **إدارة الشحن:**
  - `PUT /api/admin/shipping/:id` — تحديث سعر الشحن أو مدة التوصيل لمحافظة معينة.
- **إدارة الطلبات:**
  - `GET /api/admin/orders` — استعراض جميع الطلبات مع فلترة بالحالة والتاريخ والمحافظة ورقم الهاتف.
  - `GET /api/admin/orders/:id` — استعراض تفاصيل طلب كاملة مع سجل تاريخ حالاته.
  - `PATCH /api/admin/orders/:id/status` — تحديث حالة الطلب مع تطبيق ضوابط محرك الحالات.
- **الرفع السحابي على Cloudflare R2:**
  - `POST /api/admin/uploads/presigned-url` — طلب رابط رفع موقع للرفع المباشر.
  - `POST /api/admin/uploads/direct` — رفع ملف صورة مباشرة للسيرفر.
  - `DELETE /api/admin/uploads` — حذف صورة.
- **التحليلات ولوحة المعلومات:**
  - الـ 12 مساراً المذكورة في قسم لوحة التحكم أعلاه.

---

## 8. معايير الأمان والحماية الصارمة

1. **حماية الترويسات (Helmet Security):**
   - تم تفعيل مكتبة `helmet` لإغلاق ثغرات Clickjacking و Cross-Site Scripting (XSS) و MIME-type sniffing.
2. **عزل الحسابات والبيانات الحساسة (.env Isolation):**
   - جميع مفاتيح الربط وقواعد البيانات والتخزين السحابي وكلمات مرور الأدمن معزولة تماماً في `.env`.
3. **تثبيت خوارزمية التوقيع (JWT Algorithm Pinning):**
   - تم تقييد فحص التوكنات بخوارزمية `HS256` فقط في [auth.ts](<file:///c:/Users/ZBook%20G3/OneDrive/Desktop/ClothesStore/src/middleware/auth.ts>) لمنع ثغرات التلاعب بالخوارزمية (`alg: none` bypass).
4. **حماية الذاكرة من الإغراق (Payload & String Bounds):**
   - تقييد الحد الأقصى لبيانات الـ JSON إلى `1mb`.
   - وضع قيود عليا ودنيا (`.max(255)`, `.max(5000)`) لجميع حقول النصوص في Zod لمنع هجمات Memory Exhaustion DoS.
5. **منع هجمات التكرار والسباق في الـ Idempotency:**
   - اعتراض خطأ التكرار `P2002` من Prisma داخل الـ Transaction وإرجاع الطلب السابق بنجاح دون انهيار العملية.
6. **التحكم بمعدل الطلبات (Rate Limiting):**
   - تحديد سقف 120 طلباً في الدقيقة على واجهة المتجر لحماية الخادم من محاولات الإسقاط.
7. **الوقاية من هجمات حقن قواعد البيانات (SQL Injection Protection):**
   - جميع الاستعلامات تنفذ عبر Prisma المعقمة تلقائياً، والاستعلامات الخام `$executeRaw` و `$queryRaw` تستخدم المعاملات المهيأة (Parameterized Queries / Tagged Templates).

---

## 9. حزمة الاختبارات الآلية والتحقق من التزامن

تم بناء حزمة اختبارات شاملة باستخدام **Vitest** تشمل اختبارات الوحدة، التكامل، والتزامن:

```text
✓ tests/unit/orderStateMachine.test.ts (4 tests)
✓ tests/unit/uploads.test.ts (4 tests)
✓ tests/integration/api.test.ts (10 tests)
✓ tests/integration/concurrency.test.ts (1 test)

Test Files  4 passed (4)
     Tests  19 passed (19) — نجاح بنسبة 100%
```

### تجربة اختبار التزامن العالي (High-Concurrency Stress Test):

- **السيناريو:** تم تجهيز قطعة واحدة فقط في المخزون لمتغير معين، وتوجيه **20 طلب تأكيد (Confirm) في نفس الميلي ثانية من 20 عميل في آن واحد**.
- **النتيجة المحققة:**
  - نجح طلب واحد فقط بالتمام والكمال، وتحول إلى `CONFIRMED`.
  - أُلغيت الـ 19 طلباً الباقية فورياً وحُولت إلى `CANCELLED` بسبب نفاد المخزون.
  - رصيد المخزون النهائي في قاعدة البيانات استقر عند **0 بالضبط** ولم ينزل بالسالب نهائياً.

---

## 10. دليل التثبيت والتشغيل والنشر

### المتطلبات الأساسية:

- Node.js الإصدار 20 LTS أو أحدث.
- PostgreSQL 15 أو أحدث.
- حساب Cloudflare مع تفعيل خدمة R2 (اختياري في بيئة الاختبار المحلي).

### خطوات الإعداد والتشغيل السريع:

1. **تثبيت الاعتماديات:**

   ```bash
   npm install
   ```
2. **ضبط ملف البيئة `.env`:**
   انسخ ملف `.env.example` إلى `.env` وقم بملء البيانات:

   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/clothes_store?schema=public"
   PORT=3000
   NODE_ENV=development
   JWT_SECRET="super-secret-jwt-key-clothes-store-min-32-chars-long"

   # Cloudflare R2
   R2_ACCOUNT_ID="your_cloudflare_account_id"
   R2_ACCESS_KEY_ID="your_r2_access_key"
   R2_SECRET_ACCESS_KEY="your_r2_secret_key"
   R2_BUCKET_NAME="clothes-store-images"
   R2_PUBLIC_URL="https://images.yourdomain.com"
   ```
3. **إنشاء جداول قاعدة البيانات وبذر البيانات:**

   ```bash
   npx prisma migrate dev --name init
   npm run db:seed
   ```

   *سيقوم الـ seed بإنشاء حساب الأدمن الافتراضي: `admin@clothesstore.com` / `Admin@123456` مع بذر الـ 27 محافظة مصرية ومنتجات وباقة تجريبية.*
4. **تشغيل الخادم في وضع التطوير (Hot Reload):**

   ```bash
   npm run dev
   ```
5. **تشغيل حزمة الاختبارات الآلية للتأكد من سلامة النظام:**

   ```bash
   npm test
   ```
6. **بناء المشروع للإنتاج (Production Build):**

   ```bash
   npm run build
   npm start
   ```

---

*تم إعداد وتدقيق هذا التوثيق ليعبر عن كامل تفاصيل الكود والبنية الهندسية لمشروع ClothesStore Backend.*
