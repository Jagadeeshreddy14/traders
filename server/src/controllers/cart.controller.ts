import { Request, Response, NextFunction } from 'express';
import { CartService } from '../services/cart.service';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(AppError.unauthorized());
    const cart = await CartService.getCart(req.user.id);
    sendSuccess(res, { cart }, 'Shopping cart retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const addItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(AppError.unauthorized());
    const { productId, quantity } = req.body;
    if (!productId) {
      return next(AppError.badRequest('productId is required'));
    }

    const qty = quantity !== undefined ? Number(quantity) : 1;
    const cart = await CartService.addItem(req.user.id, productId, qty);
    sendSuccess(res, { cart }, 'Item added to cart successfully');
  } catch (error) {
    next(error);
  }
};

export const updateItemQuantity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(AppError.unauthorized());
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      return next(AppError.badRequest('quantity is required'));
    }

    const cart = await CartService.updateItemQuantity(req.user.id, productId, Number(quantity));
    sendSuccess(res, { cart }, 'Cart item quantity updated');
  } catch (error) {
    next(error);
  }
};

export const removeItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(AppError.unauthorized());
    const { productId } = req.params;
    const cart = await CartService.removeItem(req.user.id, productId);
    sendSuccess(res, { cart }, 'Item removed from cart');
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(AppError.unauthorized());
    const cart = await CartService.clearCart(req.user.id);
    sendSuccess(res, { cart }, 'Cart cleared successfully');
  } catch (error) {
    next(error);
  }
};

export const syncCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(AppError.unauthorized());
    const { items } = req.body;
    const cart = await CartService.syncGuestCart(req.user.id, items || []);
    sendSuccess(res, { cart }, 'Guest cart synchronized with customer account');
  } catch (error) {
    next(error);
  }
};
