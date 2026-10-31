import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../models/User';
import { Address } from '../models/Address';
import { Order } from '../models/Order';
import { recordAuditLog } from '../middleware/authorize.middleware';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

/**
 * GET /api/v1/admin/customers
 * List customers with total orders, total expenditure, registration date
 */
export const getAdminCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;

    const filter: Record<string, any> = { role: UserRole.CUSTOMER };

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    if (status === 'ACTIVE') {
      filter.isActive = true;
    } else if (status === 'INACTIVE') {
      filter.isActive = false;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Aggregate orders for these customers to show total orders and spent
    const userIds = users.map((u) => u._id);
    const orderAggregates = await Order.aggregate([
      { $match: { user: { $in: userIds }, orderStatus: { $ne: 'CANCELLED' } } },
      {
        $group: {
          _id: '$user',
          totalOrders: { $sum: 1 },
          totalSpentPaise: { $sum: '$finalAmount' },
          lastOrderDate: { $max: '$createdAt' },
        },
      },
    ]);

    const orderMap = new Map(orderAggregates.map((oa) => [oa._id.toString(), oa]));

    const customers = users.map((u: any) => {
      const agg = orderMap.get(u._id.toString());
      return {
        id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone || 'N/A',
        isActive: u.isActive,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
        totalOrders: agg ? agg.totalOrders : 0,
        totalSpentRupees: agg ? Math.round(agg.totalSpentPaise / 100) : 0,
        lastOrderDate: agg ? agg.lastOrderDate : null,
      };
    });

    sendSuccess(
      res,
      {
        customers,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      'Customers retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/customers/:id
 * Customer profile, addresses and order history
 */
export const getAdminCustomerDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return next(AppError.notFound('Customer not found'));
    }

    const [addresses, orders] = await Promise.all([
      Address.find({ user: customer._id }).lean(),
      Order.find({ user: customer._id }).sort({ createdAt: -1 }).lean(),
    ]);

    sendSuccess(
      res,
      {
        customer: customer.toSafeJSON(),
        addresses,
        orders: orders.map((ord: any) => ({
          id: ord._id,
          orderNumber: ord.orderNumber,
          invoiceNumber: ord.invoiceNumber,
          totalRupees: Math.round(ord.finalAmount / 100),
          orderStatus: ord.orderStatus,
          paymentStatus: ord.paymentStatus,
          paymentMethod: ord.paymentMethod,
          itemsCount: ord.items?.length || 0,
          createdAt: ord.createdAt,
        })),
      },
      'Customer details retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/customers/:id/status
 * Toggle customer account active/inactive
 */
export const toggleCustomerStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return next(AppError.notFound('Customer not found'));
    }

    customer.isActive = !customer.isActive;
    await customer.save();

    await recordAuditLog(req, 'TOGGLE_CUSTOMER_STATUS', 'CUSTOMER', {
      customerId: customer._id,
      email: customer.email,
      isActive: customer.isActive,
    });

    sendSuccess(
      res,
      { customer: customer.toSafeJSON() },
      `Customer account is now ${customer.isActive ? 'Active' : 'Deactivated'}`
    );
  } catch (error) {
    next(error);
  }
};
