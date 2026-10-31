import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { InvoiceService } from '../services/invoice.service';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';
import { UserRole } from '../models/User';

/**
 * Customer / Admin: Get structured Invoice JSON
 * GET /api/v1/orders/:id/invoice
 */
export const getInvoiceData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    const isAdmin = req.user.role === UserRole.ADMIN;
    const order = await OrderService.getOrderById(req.params.id, req.user.id, isAdmin);
    const invoice = await InvoiceService.generateInvoiceData(order);

    sendSuccess(res, { invoice }, 'Invoice data retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Customer / Admin: View or Print HTML Invoice
 * GET /api/v1/orders/:id/invoice/html
 */
export const getHtmlInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    const isAdmin = req.user.role === UserRole.ADMIN;
    const order = await OrderService.getOrderById(req.params.id, req.user.id, isAdmin);
    const invoiceData = await InvoiceService.generateInvoiceData(order);
    const html = InvoiceService.generateHtmlInvoice(invoiceData);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
};
