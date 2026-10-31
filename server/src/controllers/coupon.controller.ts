import { Request, Response, NextFunction } from 'express';
import { CouponService } from '../services/coupon.service';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

export const getActiveCoupons = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await CouponService.getActiveCoupons();
    sendSuccess(res, { coupons }, 'Active shopping coupons retrieved');
  } catch (error) {
    next(error);
  }
};

export const validateCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, subtotalPaise } = req.body;
    if (!code) {
      return next(AppError.badRequest('Coupon code is required'));
    }

    const subtotal = Number(subtotalPaise) || 0;
    const userId = req.user ? req.user.id : undefined;

    const result = await CouponService.validateCoupon(code, subtotal, userId);
    sendSuccess(res, result, result.message);
  } catch (error) {
    next(error);
  }
};

export const getAdminCoupons = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const coupons = await CouponService.getAllCoupons();
    sendSuccess(res, { coupons }, 'All coupons retrieved for admin');
  } catch (error) {
    next(error);
  }
};

export const createAdminCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await CouponService.createCoupon(req.body);
    sendSuccess(res, { coupon }, 'Coupon created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateAdminCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await CouponService.updateCoupon(req.params.id, req.body);
    sendSuccess(res, { coupon }, 'Coupon updated successfully');
  } catch (error) {
    next(error);
  }
};

export const toggleAdminCouponStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const coupon = await CouponService.toggleStatus(req.params.id);
    sendSuccess(res, { coupon }, `Coupon status set to ${coupon.isActive ? 'Active' : 'Inactive'}`);
  } catch (error) {
    next(error);
  }
};

export const deleteAdminCoupon = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await CouponService.deleteCoupon(req.params.id);
    sendSuccess(res, null, 'Coupon deleted successfully');
  } catch (error) {
    next(error);
  }
};
