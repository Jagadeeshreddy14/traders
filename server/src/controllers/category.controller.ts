import { Request, Response, NextFunction } from 'express';
import { Category } from '../models/Category';
import { sendResponse } from '../utils/apiResponse';

export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Categories fetched successfully',
      data: {
        categories,
        total: categories.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
