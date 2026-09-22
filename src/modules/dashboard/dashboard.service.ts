import { prisma } from '../../config/database.js';

export class DashboardService {
  // 1. Overview: Quick summary (today, week, month) in a single fast query
  async getOverview() {
    const result = await prisma.$queryRaw<
      {
        orders_today: bigint;
        revenue_today: number;
        orders_week: bigint;
        revenue_week: number;
        orders_month: bigint;
        revenue_month: number;
        pending_orders: bigint;
      }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE "createdAt" >= CURRENT_DATE) AS orders_today,
        COALESCE(SUM(total) FILTER (WHERE status = 'DELIVERED' AND "deliveredAt" >= CURRENT_DATE), 0) AS revenue_today,
        COUNT(*) FILTER (WHERE "createdAt" >= DATE_TRUNC('week', NOW())) AS orders_week,
        COALESCE(SUM(total) FILTER (WHERE status = 'DELIVERED' AND "deliveredAt" >= DATE_TRUNC('week', NOW())), 0) AS revenue_week,
        COUNT(*) FILTER (WHERE "createdAt" >= DATE_TRUNC('month', NOW())) AS orders_month,
        COALESCE(SUM(total) FILTER (WHERE status = 'DELIVERED' AND "deliveredAt" >= DATE_TRUNC('month', NOW())), 0) AS revenue_month,
        COUNT(*) FILTER (WHERE status = 'PENDING') AS pending_orders
      FROM orders;
    `;

    const row = result[0];
    return {
      ordersToday: Number(row.orders_today),
      revenueToday: Number(row.revenue_today),
      ordersWeek: Number(row.orders_week),
      revenueWeek: Number(row.revenue_week),
      ordersMonth: Number(row.orders_month),
      revenueMonth: Number(row.revenue_month),
      pendingOrders: Number(row.pending_orders),
    };
  }

  // 2. Revenue breakdown: DELIVERED (Official) vs SHIPPED (In-transit / Pending Collection)
  async getRevenue() {
    const result = await prisma.$queryRaw<
      {
        confirmed_revenue: number;
        in_transit_revenue: number;
        delivered_orders_count: bigint;
        shipped_orders_count: bigint;
      }[]
    >`
      SELECT
        COALESCE(SUM(total) FILTER (WHERE status = 'DELIVERED'), 0) AS confirmed_revenue,
        COALESCE(SUM(total) FILTER (WHERE status = 'SHIPPED'), 0) AS in_transit_revenue,
        COUNT(*) FILTER (WHERE status = 'DELIVERED') AS delivered_orders_count,
        COUNT(*) FILTER (WHERE status = 'SHIPPED') AS shipped_orders_count
      FROM orders;
    `;

    const row = result[0];
    const confirmed = Number(row.confirmed_revenue);
    const inTransit = Number(row.in_transit_revenue);

    return {
      confirmedRevenue: confirmed,
      inTransitRevenue: inTransit,
      expectedTotal: confirmed + inTransit,
      deliveredOrdersCount: Number(row.delivered_orders_count),
      shippedOrdersCount: Number(row.shipped_orders_count),
    };
  }

  // 3. Top Products
  async getTopProducts(limit: number = 5) {
    const result = await prisma.$queryRaw<
      {
        product_name: string;
        total_quantity: bigint;
        total_revenue: number;
      }[]
    >`
      SELECT
        oi."productName" AS product_name,
        SUM(oi.quantity) AS total_quantity,
        SUM(oi."totalPrice") AS total_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi."orderId"
      WHERE o.status != 'CANCELLED' AND oi."bundleId" IS NULL
      GROUP BY oi."productName"
      ORDER BY total_quantity DESC
      LIMIT ${limit};
    `;

    return result.map((r) => ({
      productName: r.product_name,
      totalQuantity: Number(r.total_quantity),
      totalRevenue: Number(r.total_revenue),
    }));
  }

  // 4. Top Bundles
  async getTopBundles(limit: number = 5) {
    const result = await prisma.$queryRaw<
      {
        bundle_id: string;
        bundle_name: string;
        total_sold: bigint;
        total_revenue: number;
      }[]
    >`
      SELECT
        b.id AS bundle_id,
        b.name AS bundle_name,
        SUM(oi.quantity) AS total_sold,
        SUM(oi."totalPrice") AS total_revenue
      FROM order_items oi
      JOIN bundles b ON b.id = oi."bundleId"
      JOIN orders o ON o.id = oi."orderId"
      WHERE o.status != 'CANCELLED'
      GROUP BY b.id, b.name
      ORDER BY total_sold DESC
      LIMIT ${limit};
    `;

    return result.map((r) => ({
      bundleId: r.bundle_id,
      bundleName: r.bundle_name,
      totalSold: Number(r.total_sold),
      totalRevenue: Number(r.total_revenue),
    }));
  }

  // 5. Governorates: Volume and revenue by Egyptian province
  async getGovernorates() {
    const result = await prisma.$queryRaw<
      {
        governorate: string;
        governorate_en: string;
        orders_count: bigint;
        total_revenue: number;
      }[]
    >`
      SELECT
        sz.governorate,
        sz."governorateEn" AS governorate_en,
        COUNT(o.id) AS orders_count,
        COALESCE(SUM(o.total) FILTER (WHERE o.status = 'DELIVERED'), 0) AS total_revenue
      FROM shipping_zones sz
      LEFT JOIN orders o ON o."shippingZoneId" = sz.id
      GROUP BY sz.id, sz.governorate, sz."governorateEn"
      ORDER BY orders_count DESC;
    `;

    return result.map((r) => ({
      governorate: r.governorate,
      governorateEn: r.governorate_en,
      ordersCount: Number(r.orders_count),
      totalRevenue: Number(r.total_revenue),
    }));
  }

  // 6. Return Rate & Shipping Loss
  async getReturnRate() {
    const result = await prisma.$queryRaw<
      {
        total_orders: bigint;
        returned_orders: bigint;
        total_shipping_loss: number;
      }[]
    >`
      SELECT
        COUNT(*) AS total_orders,
        COUNT(*) FILTER (WHERE status = 'RETURNED') AS returned_orders,
        COALESCE(SUM("shippingLoss"), 0) AS total_shipping_loss
      FROM orders;
    `;

    const row = result[0];
    const total = Number(row.total_orders);
    const returned = Number(row.returned_orders);
    const returnRate = total > 0 ? (returned / total) * 100 : 0;

    return {
      totalOrders: total,
      returnedOrders: returned,
      returnRatePercentage: Number(returnRate.toFixed(2)),
      totalShippingLoss: Number(row.total_shipping_loss),
    };
  }

  // 7. Conversion Rate (Pending to Delivered)
  async getConversion() {
    const result = await prisma.$queryRaw<
      {
        total_orders: bigint;
        delivered_orders: bigint;
        cancelled_orders: bigint;
      }[]
    >`
      SELECT
        COUNT(*) AS total_orders,
        COUNT(*) FILTER (WHERE status = 'DELIVERED') AS delivered_orders,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_orders
      FROM orders;
    `;

    const row = result[0];
    const total = Number(row.total_orders);
    const delivered = Number(row.delivered_orders);
    const cancelled = Number(row.cancelled_orders);
    const conversionRate = total > 0 ? (delivered / total) * 100 : 0;

    return {
      totalOrders: total,
      deliveredOrders: delivered,
      cancelledOrders: cancelled,
      conversionRatePercentage: Number(conversionRate.toFixed(2)),
    };
  }

  // 8. Pending Actions (Urgent actions widget)
  async getPendingActions() {
    const [pendingOrdersCount, lowStockCount] = await Promise.all([
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) AS count
        FROM inventories i
        JOIN variants v ON v.id = i."variantId"
        JOIN products p ON p.id = v."productId"
        WHERE i.quantity <= i."lowStockAt"
          AND v."isActive" = true
          AND p."isActive" = true;
      `,
    ]);

    return {
      pendingOrdersToConfirm: pendingOrdersCount,
      lowStockVariantsCount: Number(lowStockCount[0].count),
    };
  }

  // 9. Average Order Value (AOV)
  async getAverageOrderValue() {
    const result = await prisma.$queryRaw<
      {
        avg_order_value: number;
        total_delivered_revenue: number;
        delivered_orders_count: bigint;
      }[]
    >`
      SELECT
        COALESCE(AVG(total), 0) AS avg_order_value,
        COALESCE(SUM(total), 0) AS total_delivered_revenue,
        COUNT(*) AS delivered_orders_count
      FROM orders
      WHERE status = 'DELIVERED';
    `;

    const row = result[0];
    return {
      averageOrderValue: Number(Number(row.avg_order_value).toFixed(2)),
      totalDeliveredRevenue: Number(row.total_delivered_revenue),
      deliveredOrdersCount: Number(row.delivered_orders_count),
    };
  }

  // 10. Repeat Customers
  async getRepeatCustomers() {
    const result = await prisma.$queryRaw<
      {
        total_customers: bigint;
        repeat_customers: bigint;
      }[]
    >`
      WITH customer_orders AS (
        SELECT "customerId", COUNT(*) AS order_count
        FROM orders
        WHERE status != 'CANCELLED'
        GROUP BY "customerId"
      )
      SELECT
        COUNT(*) AS total_customers,
        COUNT(*) FILTER (WHERE order_count > 1) AS repeat_customers
      FROM customer_orders;
    `;

    const row = result[0];
    const total = Number(row.total_customers);
    const repeat = Number(row.repeat_customers);
    const repeatRate = total > 0 ? (repeat / total) * 100 : 0;

    return {
      totalCustomers: total,
      repeatCustomers: repeat,
      repeatRatePercentage: Number(repeatRate.toFixed(2)),
    };
  }

  // 11. Day of Week distribution (0=Sunday ... 6=Saturday)
  async getDayOfWeek() {
    const result = await prisma.$queryRaw<
      {
        day_number: number;
        orders_count: bigint;
        total_revenue: number;
      }[]
    >`
      SELECT
        EXTRACT(DOW FROM "createdAt") AS day_number,
        COUNT(*) AS orders_count,
        COALESCE(SUM(total), 0) AS total_revenue
      FROM orders
      WHERE status != 'CANCELLED'
      GROUP BY day_number
      ORDER BY day_number ASC;
    `;

    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return result.map((r) => {
      const idx = Number(r.day_number);
      return {
        dayNumber: idx,
        dayNameAr: dayNames[idx],
        dayNameEn: dayNamesEn[idx],
        ordersCount: Number(r.orders_count),
        totalRevenue: Number(r.total_revenue),
      };
    });
  }

  // 12. Governorate Returns & Cancellations
  async getGovernorateReturns() {
    const result = await prisma.$queryRaw<
      {
        governorate: string;
        governorate_en: string;
        total_orders: bigint;
        returned_orders: bigint;
        cancelled_orders: bigint;
        shipping_loss: number;
      }[]
    >`
      SELECT
        sz.governorate,
        sz."governorateEn" AS governorate_en,
        COUNT(o.id) AS total_orders,
        COUNT(o.id) FILTER (WHERE o.status = 'RETURNED') AS returned_orders,
        COUNT(o.id) FILTER (WHERE o.status = 'CANCELLED') AS cancelled_orders,
        COALESCE(SUM(o."shippingLoss"), 0) AS shipping_loss
      FROM shipping_zones sz
      JOIN orders o ON o."shippingZoneId" = sz.id
      GROUP BY sz.id, sz.governorate, sz."governorateEn"
      ORDER BY returned_orders DESC, shipping_loss DESC;
    `;

    return result.map((r) => {
      const total = Number(r.total_orders);
      const returned = Number(r.returned_orders);
      const returnRate = total > 0 ? (returned / total) * 100 : 0;

      return {
        governorate: r.governorate,
        governorateEn: r.governorate_en,
        totalOrders: total,
        returnedOrders: returned,
        cancelledOrders: Number(r.cancelled_orders),
        returnRatePercentage: Number(returnRate.toFixed(2)),
        shippingLoss: Number(r.shipping_loss),
      };
    });
  }
}

export const dashboardService = new DashboardService();
