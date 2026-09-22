# 🛍️ ClothesStore Backend (Micro E-commerce API)

باك إند متكامل وعالي الأداء لنظام تجارة إلكترونية مصمم خصيصاً للسلع سريعة الدوران والملابس الشتوية/الموسمية في السوق المصري، مع دعم الباقات (Bundles) ونظام الدفع عند الاستلام (COD)، ومعالجة ذرية للمخزون ضد الـ Overselling والـ Deadlocks.

---

## 🚀 المميزات المعمارية والتقنية

- **حجز المخزون المؤجل (Delayed Inventory Allocation):** يتم إنشاء الطلبات بحالة `PENDING` دون تجميد المخزون، ويتم الخصم الذري فقط عند تأكيد الطلب `CONFIRMED` بعد مكالمة العميل الهاتفية.
- **عمليات ذرية مانعة للـ Overselling والـ Deadlocks:** تنفيذ الخصم الذري على مستوى الصف مباشرة في PostgreSQL عبر استعلامات `$executeRaw`.
- **محرك باقات متقدم (`BundleItemVariant`):** يتيح للأدمن تحديد المقاسات المسموح بها لكل قطعة داخل الباقة، ويتيح للمشتري اختيار المقاس ديناميكياً لكل مكون.
- **Guest Checkout:** العميل لا يحتاج لإنشاء حساب أو كلمة سر للشراء، بياناته تُحفظ وتُحدث تلقائياً مع كل طلب.
- **توليد أرقام طلبات تتابعية متسلسلة (`ORD-YYYYMMDD-XXXX`):** توليد فريد محمي بواسطة PostgreSQL Sequence دون أي تكرار أو تعارض تحت التزامن العالي.
- **حماية من الطلبات المكررة (Idempotency):** دعم ترويسة `X-Idempotency-Key` لمنع إدخال الطلب أكثر من مرة عند بطء اتصال العميل.
- **لوحة تحكم وتحليلات (12 Endpoint):** تقارير مبيعات سريعة تنفذ في أقل من 50ms عبر استعلامات `$queryRaw` مجمعة بدون استهلاك RAM.
- **تكلفة شحن متغيرة بالمحافظة:** جدول يضم محافظات مصر الـ 27 مع مدة التوصيل المتوقعة وتكلفة الشحن.
- **Soft Delete حصري:** حماية البيانات القديمة من الانهيار عند تعطيل أي منتج أو باقة.

---

## 🛠️ متطلبات التشغيل (Requirements)

- Node.js >= 20.x
- PostgreSQL Database
- npm أو pnpm

---

## 📦 التثبيت والإعداد السريع

### 1. تثبيت الحزم:
```bash
npm install
```

### 2. إعداد ملف البيئة `.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/clothes_store?schema=public"
PORT=3000
NODE_ENV=development
JWT_SECRET="super-secret-jwt-key-clothes-store-min-32-chars-long"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:5173"

# Cloudflare R2 Storage (S3-Compatible)
R2_ACCOUNT_ID="your_account_id"
R2_ACCESS_KEY_ID="your_access_key_id"
R2_SECRET_ACCESS_KEY="your_secret_access_key"
R2_BUCKET_NAME="clothes-store-images"
R2_PUBLIC_URL="https://images.yourstore.com"
```

### 3. تطبيق الـ Migrations:
```bash
npm run db:migrate
```

### 4. بذر البيانات الأولية (Seed):
```bash
npm run db:seed
```
سيتم إنشاء:
* حساب Super Admin: `admin@clothesstore.com` / `Admin@123456`
* الـ 27 محافظة مصرية بتكلفة الشحن وأيام التوصيل.
* منتج "هودي أسود أوفر سايز" بـ 4 مقاسات (S, M, L, XL) ورصيد مخزني.
* منتج "كوفية صوف شتوية" بمقاس ONE_SIZE ورصيد مخزني.
* "باقة الشتاء الدافئة" (هودي + كوفية) بسعر مخفض ومقاسات ديناميكية.

### 5. تشغيل السيرفر في وضع التطوير:
```bash
npm run dev
```

### 6. تشغيل الاختبارات الآلية:
```bash
npm test
```

---

## 📡 أهم نقاط النهاية (API Endpoints Overview)

### المتجر العام (Storefront - بدون تسجيل)

| Method | Endpoint | الوصف |
|---|---|---|
| `GET` | `/health` | فحص صحة الخادم |
| `GET` | `/api/products` | تصفح المنتجات النشطة ومقاساتها ورصيد المخزون |
| `GET` | `/api/products/:id` | تفاصيل منتج محدد |
| `GET` | `/api/bundles` | تصفح الباقات النشطة والمقاسات المتاحة لكل قطعة |
| `GET` | `/api/bundles/:id` | تفاصيل باقة محددة ومكوناتها |
| `GET` | `/api/shipping/zones` | قائمة المحافظات وتكلفة ومدة الشحن |
| `POST` | `/api/orders` | إنشاء طلب جديد (يدعم `X-Idempotency-Key`) |
| `GET` | `/api/orders/:orderNumber/track` | تتبع الطلب برقم الطلب |

### لوحة تحكم الأدمن (Protected - Bearer JWT)

| Method | Endpoint | الوصف |
|---|---|---|
| `POST` | `/api/admin/auth/login` | تسجيل الدخول واستلام التوكن |
| `GET` | `/api/admin/auth/profile` | الملف الشخصي للأدمن |
| `PUT` | `/api/admin/auth/password` | تغيير كلمة السر |
| `GET` | `/api/admin/products` | إدارة كافة المنتجات والبحث والفلترة |
| `POST` | `/api/admin/products` | إضافة منتج جديد |
| `PUT` | `/api/admin/products/:id` | تعديل منتج |
| `PATCH` | `/api/admin/products/:id/toggle` | تفعيل/تعطيل منتج (Soft Delete) |
| `POST` | `/api/admin/variants` | إضافة مقاس جديد لمنتج مع المخزون الأولي |
| `GET` | `/api/admin/inventory` | لوحة المخزون الكاملة |
| `GET` | `/api/admin/inventory/low-stock` | تنبيهات المنتجات المنخفضة عن حد الأمان |
| `POST` | `/api/admin/inventory/:variantId/restock` | توريد وزيادة رصيد مخزون |
| `POST` | `/api/admin/inventory/:variantId/adjust` | تسوية جردية يدوية |
| `GET` | `/api/admin/inventory/:variantId/logs` | سجل حركات المخزون التفصيلي |
| `POST` | `/api/admin/bundles` | إنشاء باقة جديدة مع تحديد المقاسات المسموحة |
| `GET` | `/api/admin/orders` | قائمة الطلبات مع فلاتر الحالة والمحافظة والبحث |
| `GET` | `/api/admin/orders/:id` | تفاصيل الطلب الكاملة وسجل الحالات |
| `PATCH` | `/api/admin/orders/:id/status` | تغيير حالة الطلب مع تنفيذ آلة الحالة وخصم المخزون |
| `PATCH` | `/api/admin/orders/:id/notes` | إضافة ملاحظات إدارية للطلب |

### تقارير الـ Dashboard الـ 12

| Method | Endpoint | التقرير |
|---|---|---|
| `GET` | `/api/admin/dashboard/overview` | ملخص اليوم، الأسبوع، والشهر |
| `GET` | `/api/admin/dashboard/revenue` | الإيراد المحصل (`DELIVERED`) مقابل قيد التحصيل (`SHIPPED`) |
| `GET` | `/api/admin/dashboard/top-products` | أكثر المنتجات مبيعاً |
| `GET` | `/api/admin/dashboard/top-bundles` | أكثر الباقات مبيعاً |
| `GET` | `/api/admin/dashboard/governorates` | حجم المبيعات والإيرادات بالمحافظة |
| `GET` | `/api/admin/dashboard/return-rate` | نسبة المرتجعات وإجمالي خسائر الشحن |
| `GET` | `/api/admin/dashboard/conversion` | معدل تحويل الطلبات من PENDING إلى DELIVERED |
| `GET` | `/api/admin/dashboard/pending-actions` | التنبيهات العاجلة (طلبات تنتظر التأكيد + نواقص) |
| `GET` | `/api/admin/dashboard/aov` | متوسط قيمة الطلب (Average Order Value) |
| `GET` | `/api/admin/dashboard/repeat-customers` | العملاء المتكررين ونسبة ولائهم |
| `GET` | `/api/admin/dashboard/day-of-week` | توزيع المبيعات على أيام الأسبوع لجدولة الإعلانات |
| `GET` | `/api/admin/dashboard/governorate-returns` | المرتجعات والإلغاءات بالمحافظة |
