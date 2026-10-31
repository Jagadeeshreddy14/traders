import { Request, Response, NextFunction } from 'express';
import { Expense, ExpenseCategory, ExpensePaymentMethod } from '../models/Expense';
import { recordAuditLog } from '../middleware/authorize.middleware';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

/**
 * GET /api/v1/admin/expenses
 * List store operational expenses with category and date filtering
 */
export const getExpenses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { category, startDate, endDate, page = 1, limit = 50 } = req.query;

    const filter: Record<string, any> = {};
    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [expenses, total, sumAggregate] = await Promise.all([
      Expense.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Expense.countDocuments(filter),
      Expense.aggregate([
        { $match: filter },
        { $group: { _id: null, totalRupees: { $sum: '$amount' } } },
      ]),
    ]);

    const totalExpenseRupees = sumAggregate[0]?.totalRupees || 0;

    sendSuccess(
      res,
      {
        expenses,
        totalExpenseRupees,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      'Expenses retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/expenses
 * Record a new operational store expense (Rent, Salaries, Electricity, Transport, etc.)
 */
export const createExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      title,
      category,
      amount,
      date,
      paymentMethod = 'UPI',
      receiptUrl,
      referenceNumber,
      notes,
    } = req.body;

    if (!title || !category || amount === undefined) {
      return next(
        AppError.badRequest('Expense title, category, and amount are required.')
      );
    }

    const validCategories: ExpenseCategory[] = [
      'RENT',
      'SALARIES',
      'ELECTRICITY',
      'TRANSPORT',
      'PACKAGING',
      'MARKETING',
      'MAINTENANCE',
      'OTHER',
    ];

    if (!validCategories.includes(category)) {
      return next(
        AppError.badRequest(
          `Invalid category. Allowed categories: ${validCategories.join(', ')}`
        )
      );
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return next(AppError.badRequest('Amount must be a non-negative number.'));
    }

    const expense = await Expense.create({
      title,
      category,
      amount: numAmount,
      date: date ? new Date(date) : new Date(),
      paymentMethod,
      receiptUrl,
      referenceNumber,
      notes,
      recordedBy: req.user?._id,
      recordedByName: req.user?.name || 'Administrator',
    });

    await recordAuditLog(req, 'CREATE_EXPENSE', 'EXPENSE', {
      expenseId: expense._id,
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
    });

    sendSuccess(res, { expense }, 'Expense recorded successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/expenses/:id
 * Delete expense record
 */
export const deleteExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return next(AppError.notFound('Expense not found'));
    }

    await Expense.findByIdAndDelete(expense._id);

    await recordAuditLog(req, 'DELETE_EXPENSE', 'EXPENSE', {
      expenseId: expense._id,
      title: expense.title,
      amount: expense.amount,
    });

    sendSuccess(res, null, 'Expense deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/expenses/summary
 * Date-wise and category-wise aggregation report
 */
export const getExpenseSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const [categoryAggregation, monthlyAggregation, allExpenses] = await Promise.all([
      Expense.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: '$category', totalAmount: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { totalAmount: -1 } },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Expense.find({ date: { $gte: start, $lte: end } }).lean(),
    ]);

    const totalSpent = allExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    sendSuccess(
      res,
      {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        totalExpensesRupees: totalSpent,
        byCategory: categoryAggregation.map((c) => ({
          category: c._id,
          amountRupees: c.totalAmount,
          count: c.count,
          percentage: totalSpent > 0 ? Math.round((c.totalAmount / totalSpent) * 100) : 0,
        })),
        byDate: monthlyAggregation.map((m) => ({
          date: m._id,
          amountRupees: m.totalAmount,
          count: m.count,
        })),
      },
      'Expense summary report retrieved'
    );
  } catch (error) {
    next(error);
  }
};
