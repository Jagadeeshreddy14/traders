import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { sendResponse } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      category,
      search,
      isFeatured,
      sortBy = 'popularity',
      page = '1',
      limit = '20',
    } = req.query;

    const filter: Record<string, any> = { isAvailable: true };

    // 1. Category Filter (by slug or ObjectId)
    if (category && typeof category === 'string') {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.category = new mongoose.Types.ObjectId(category);
      } else {
        const foundCategory = await Category.findOne({ slug: category });
        if (foundCategory) {
          filter.category = foundCategory._id;
        } else {
          // Category slug does not exist, return empty result cleanly
          return sendResponse({
            res,
            statusCode: 200,
            message: 'Products fetched successfully',
            data: {
              products: [],
              pagination: { total: 0, page: 1, limit: Number(limit), totalPages: 0 },
            },
          });
        }
      }
    }

    // 2. Search Filter (matches name, description, brand, or tags)
    if (search && typeof search === 'string') {
      const trimmed = search.trim();
      const regex = new RegExp(trimmed, 'i');
      filter.$or = [
        { name: regex },
        { brand: regex },
        { description: regex },
        { tags: regex },
      ];
    }

    // 3. Featured Filter
    if (isFeatured === 'true') {
      filter.isFeatured = true;
    }

    // 4. Sorting Options
    let sortOptions: Record<string, any> = { isFeatured: -1, createdAt: -1 };
    switch (sortBy) {
      case 'price_asc':
        sortOptions = { price: 1 };
        break;
      case 'price_desc':
        sortOptions = { price: -1 };
        break;
      case 'popularity':
      case 'featured':
        sortOptions = { isFeatured: -1, stockQuantity: -1, createdAt: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'discount':
        sortOptions = { discountedPrice: 1 };
        break;
      default:
        sortOptions = { isFeatured: -1, createdAt: -1 };
    }

    // 5. Pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug image')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const formattedProducts = products.map((p) => ({
      ...p,
      id: p._id.toString(),
    }));

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Products fetched successfully',
      data: {
        products: formattedProducts,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    let query: Record<string, any>;
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { _id: id };
    } else {
      query = { slug: id };
    }

    const product = await Product.findOne(query)
      .populate('category', 'name slug image')
      .lean();

    if (!product) {
      return next(AppError.notFound('Product not found'));
    }

    // Fetch related products from the same category
    const categoryId = (product.category as any)?._id || product.category;
    const relatedProducts = await Product.find({
      category: categoryId,
      _id: { $ne: product._id },
      isAvailable: true,
    })
      .populate('category', 'name slug')
      .limit(6)
      .lean();

    return sendResponse({
      res,
      statusCode: 200,
      message: 'Product retrieved successfully',
      data: {
        product: {
          ...product,
          id: product._id.toString(),
        },
        relatedProducts: relatedProducts.map((rp) => ({
          ...rp,
          id: rp._id.toString(),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
