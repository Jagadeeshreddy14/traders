import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Order, OrderStatus, PaymentStatus } from '../models/Order';
import { Product } from '../models/Product';
import { User, UserRole } from '../models/User';
import { Inventory } from '../models/Inventory';
import { Purchase } from '../models/Purchase';
import { Expense } from '../models/Expense';
import { sendSuccess } from '../utils/apiResponse';

/**
 * GET /api/v1/admin/analytics/dashboard
 * Complete single-store dashboard metrics, live sales stats, and accurate financial breakdown
 */
export const getDashboardAnalytics = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const now = new Date();

    // Start of Today (00:00:00)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Start of Week (last 7 days)
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Start of Month (first day of current month)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Fetch live orders, products, inventory, users, purchases, and expenses
    const [
      allOrders,
      totalCustomers,
      activeProductsCount,
      totalProductsCount,
      inventoryRecords,
      recentOrders,
      receivedPurchases,
      allExpenses,
    ] = await Promise.all([
      Order.find({}).lean(),
      User.countDocuments({ role: UserRole.CUSTOMER }),
      Product.countDocuments({ isAvailable: true }),
      Product.countDocuments({}),
      Inventory.find({}).populate('product', 'name price stockQuantity isAvailable').lean(),
      Order.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('deliveryPartner', 'name phone')
        .lean(),
      Purchase.find({ status: 'RECEIVED' }).lean(),
      Expense.find({}).lean(),
    ]);

    // 2. Metrics calculation
    let todaySalesPaise = 0;
    let todayOrdersCount = 0;
    let weekSalesPaise = 0;
    let monthSalesPaise = 0;
    let pendingOrdersCount = 0;
    let completedOrdersCount = 0;

    // Financial breakdown (strict non-inflation rules)
    let paidOnlineRevenuePaise = 0;
    let codCollectedRevenuePaise = 0;
    let codOutstandingPaise = 0;
    let totalSalesValuePaise = 0; // All confirmed/active/delivered orders
    let refundsPaise = 0;
    let cancelledOrdersCount = 0;
    let cancelledOrdersValuePaise = 0;

    for (const order of allOrders) {
      const orderDate = new Date(order.createdAt);
      const isToday = orderDate >= startOfToday;
      const isWeek = orderDate >= startOfWeek;
      const isMonth = orderDate >= startOfMonth;
      const isCancelled = order.orderStatus === OrderStatus.CANCELLED;
      const isRefunded =
        order.orderStatus === OrderStatus.REFUNDED ||
        order.paymentStatus === PaymentStatus.REFUNDED;

      if (isCancelled) {
        cancelledOrdersCount++;
        cancelledOrdersValuePaise += order.finalAmount || 0;
      }

      if (isRefunded) {
        refundsPaise += order.finalAmount || 0;
      }

      // Valid order for sales tracking
      if (!isCancelled) {
        totalSalesValuePaise += order.finalAmount || 0;

        if (isToday) {
          todaySalesPaise += order.finalAmount || 0;
          todayOrdersCount++;
        }
        if (isWeek) {
          weekSalesPaise += order.finalAmount || 0;
        }
        if (isMonth) {
          monthSalesPaise += order.finalAmount || 0;
        }

        // Pending vs Completed
        if (order.orderStatus === OrderStatus.DELIVERED) {
          completedOrdersCount++;
        } else if (
          order.orderStatus === OrderStatus.PAYMENT_PENDING ||
          order.orderStatus === OrderStatus.CONFIRMED ||
          order.orderStatus === OrderStatus.PROCESSING ||
          order.orderStatus === OrderStatus.PACKED ||
          order.orderStatus === OrderStatus.OUT_FOR_DELIVERY
        ) {
          pendingOrdersCount++;
        }

        // Revenue Breakdown:
        // A) Paid Online: Online payment with PAID/SUCCESS
        if (
          order.paymentMethod !== 'COD' &&
          (order.paymentStatus === PaymentStatus.PAID || order.paymentStatus === PaymentStatus.SUCCESS)
        ) {
          paidOnlineRevenuePaise += order.finalAmount || 0;
        }

        // B) COD Collected: COD payment marked PAID or order DELIVERED or codCollectionInfo exists
        if (
          order.paymentMethod === 'COD' &&
          (order.paymentStatus === PaymentStatus.PAID ||
            order.orderStatus === OrderStatus.DELIVERED ||
            Boolean(order.codCollectionInfo?.collectedAt))
        ) {
          codCollectedRevenuePaise += order.finalAmount || 0;
        }

        // C) COD Outstanding: COD order not yet delivered or collected
        if (
          order.paymentMethod === 'COD' &&
          order.paymentStatus !== PaymentStatus.PAID &&
          order.orderStatus !== OrderStatus.DELIVERED &&
          !order.codCollectionInfo?.collectedAt
        ) {
          codOutstandingPaise += order.finalAmount || 0;
        }
      }
    }

    // 3. Purchase Costs & Expenses
    let totalPurchaseCostRupees = 0;
    for (const pur of receivedPurchases) {
      totalPurchaseCostRupees += pur.totalAmount || 0;
    }

    let totalExpensesRupees = 0;
    for (const exp of allExpenses) {
      totalExpensesRupees += exp.amount || 0;
    }

    // Convert paise to Rupees for clean financial view
    const paidOnlineRevenueRupees = Math.round(paidOnlineRevenuePaise / 100);
    const codCollectedRevenueRupees = Math.round(codCollectedRevenuePaise / 100);
    const codOutstandingRupees = Math.round(codOutstandingPaise / 100);
    const refundsRupees = Math.round(refundsPaise / 100);
    const totalSalesValueRupees = Math.round(totalSalesValuePaise / 100);
    const todaySalesRupees = Math.round(todaySalesPaise / 100);
    const weekSalesRupees = Math.round(weekSalesPaise / 100);
    const monthSalesRupees = Math.round(monthSalesPaise / 100);

    // Total Actual Cash / Bank Revenue Realized
    const actualRevenueCollectedRupees =
      paidOnlineRevenueRupees + codCollectedRevenueRupees - refundsRupees;

    // Basic estimated profit
    const estimatedProfitRupees =
      actualRevenueCollectedRupees - totalPurchaseCostRupees - totalExpensesRupees;

    // 4. Low-stock & Out-of-stock items calculation
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockItems: Array<any> = [];

    for (const inv of inventoryRecords) {
      const prod = inv.product as any;
      if (!prod) continue;
      const available = (inv.currentStock || 0) - (inv.reservedStock || 0);
      const threshold = inv.minThreshold || 10;

      if (available <= 0) {
        outOfStockCount++;
        lowStockItems.push({
          id: prod._id,
          name: prod.name,
          currentStock: inv.currentStock,
          reservedStock: inv.reservedStock,
          availableStock: available,
          minThreshold: threshold,
          status: 'OUT_OF_STOCK',
        });
      } else if (available <= threshold) {
        lowStockCount++;
        lowStockItems.push({
          id: prod._id,
          name: prod.name,
          currentStock: inv.currentStock,
          reservedStock: inv.reservedStock,
          availableStock: available,
          minThreshold: threshold,
          status: 'LOW_STOCK',
        });
      }
    }

    // 5. Daily Sales Chart for last 7 days
    const dailySalesChart: Array<{ date: string; day: string; salesRupees: number; orders: number }> = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      const dayName = dayNames[targetDate.getDay()];

      let dayTotalPaise = 0;
      let dayOrders = 0;

      for (const ord of allOrders) {
        if (ord.orderStatus === OrderStatus.CANCELLED) continue;
        const ordDateStr = new Date(ord.createdAt).toISOString().split('T')[0];
        if (ordDateStr === targetDateStr) {
          dayTotalPaise += ord.finalAmount || 0;
          dayOrders++;
        }
      }

      dailySalesChart.push({
        date: targetDateStr,
        day: dayName,
        salesRupees: Math.round(dayTotalPaise / 100),
        orders: dayOrders,
      });
    }

    // 6. Response payload
    const dashboardData = {
      kpi: {
        todaySales: todaySalesRupees,
        todayOrders: todayOrdersCount,
        weeklySales: weekSalesRupees,
        monthlySales: monthSalesRupees,
        pendingOrders: pendingOrdersCount,
        completedOrders: completedOrdersCount,
        totalCustomers,
        activeProducts: activeProductsCount,
        totalProducts: totalProductsCount,
        lowStockCount,
        outOfStockCount,
      },
      financialSummary: {
        paidOnlineRevenue: paidOnlineRevenueRupees,
        codCollected: codCollectedRevenueRupees,
        codOutstanding: codOutstandingRupees,
        totalRevenueReceived: actualRevenueCollectedRupees,
        totalSalesValue: totalSalesValueRupees,
        refunds: refundsRupees,
        cancelledOrdersCount,
        cancelledOrdersValue: Math.round(cancelledOrdersValuePaise / 100),
        purchaseCosts: totalPurchaseCostRupees,
        expenses: totalExpensesRupees,
        basicEstimatedProfit: estimatedProfitRupees,
      },
      lowStockItems: lowStockItems.slice(0, 10),
      recentOrders: recentOrders.map((ord: any) => ({
        id: ord._id,
        orderNumber: ord.orderNumber,
        invoiceNumber: ord.invoiceNumber,
        customerName: ord.deliveryAddress?.recipientName || 'Customer',
        customerPhone: ord.deliveryAddress?.recipientPhone || '',
        itemCount: ord.items?.length || 0,
        itemsDescription: ord.items?.map((it: any) => `${it.name} (${it.quantity})`).join(', ') || '',
        totalRupees: Math.round((ord.finalAmount || 0) / 100),
        orderStatus: ord.orderStatus,
        paymentStatus: ord.paymentStatus,
        paymentMethod: ord.paymentMethod,
        deliveryPartnerName: ord.deliveryPartner?.name || 'Unassigned',
        createdAt: ord.createdAt,
      })),
      salesChart: dailySalesChart,
    };

    sendSuccess(res, dashboardData, 'Dashboard analytics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/analytics/sales-report
 * Filterable date-wise sales and revenue report
 */
export const getSalesReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const orders = await Order.find({
      createdAt: { $gte: start, $lte: end },
      orderStatus: { $ne: OrderStatus.CANCELLED },
    }).lean();

    let totalSalesPaise = 0;
    let totalDiscountPaise = 0;
    let totalDeliveryFeePaise = 0;
    let totalOrders = orders.length;

    const dateMap: Record<string, { date: string; salesPaise: number; orders: number }> = {};

    for (const ord of orders) {
      totalSalesPaise += ord.finalAmount || 0;
      totalDiscountPaise += ord.discountAmount || 0;
      totalDeliveryFeePaise += ord.deliveryFee || 0;

      const d = new Date(ord.createdAt).toISOString().split('T')[0];
      if (!dateMap[d]) {
        dateMap[d] = { date: d, salesPaise: 0, orders: 0 };
      }
      dateMap[d].salesPaise += ord.finalAmount || 0;
      dateMap[d].orders += 1;
    }

    const dailyBreakdown = Object.values(dateMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((entry) => ({
        date: entry.date,
        salesRupees: Math.round(entry.salesPaise / 100),
        orders: entry.orders,
      }));

    sendSuccess(
      res,
      {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        summary: {
          totalOrders,
          totalSalesRupees: Math.round(totalSalesPaise / 100),
          totalDiscountsRupees: Math.round(totalDiscountPaise / 100),
          totalDeliveryFeesRupees: Math.round(totalDeliveryFeePaise / 100),
          averageOrderValueRupees:
            totalOrders > 0 ? Math.round(totalSalesPaise / totalOrders / 100) : 0,
        },
        dailyBreakdown,
      },
      'Sales report generated'
    );
  } catch (error) {
    next(error);
  }
};
