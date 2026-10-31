import { Request, Response, NextFunction } from 'express';
import { CheckoutService } from '../services/checkout.service';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

export const getCheckoutPreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(AppError.unauthorized());
    const { addressId, couponCode } = req.body;

    const preview = await CheckoutService.getPreview(req.user.id, addressId, couponCode);
    sendSuccess(res, { preview }, 'Checkout preview generated successfully');
  } catch (error) {
    next(error);
  }
};
