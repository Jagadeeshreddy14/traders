import { Request, Response, NextFunction } from 'express';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { recordAuditLog } from '../middleware/authorize.middleware';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

/**
 * GET /api/v1/admin/categories
 * List all categories with product counts and taxonomy
 */
export const getAdminCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await Category.find({})
      .populate('parentCategory', 'name slug')
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // Get count of products in each category
    const productCounts = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(productCounts.map((pc) => [pc._id.toString(), pc.count]));

    const categoriesWithCounts = categories.map((cat: any) => ({
      ...cat,
      productCount: countMap.get(cat._id.toString()) || 0,
    }));

    sendSuccess(
      res,
      { categories: categoriesWithCounts },
      'Categories retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/categories
 * Create new grocery department / category with subcategories
 */
export const createAdminCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      slug,
      description,
      image,
      icon,
      displayOrder = 0,
      parentCategory,
      subcategories = [],
      isActive = true,
    } = req.body;

    if (!name) {
      return next(AppError.badRequest('Category name is required.'));
    }

    const generatedSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    const existing = await Category.findOne({
      $or: [{ name: { $regex: new RegExp(`^${name}$`, 'i') } }, { slug: generatedSlug }],
    });
    if (existing) {
      return next(AppError.badRequest(`Category '${name}' or slug '${generatedSlug}' already exists.`));
    }

    const category = await Category.create({
      name,
      slug: generatedSlug,
      description,
      image,
      icon: icon || '🛒',
      displayOrder: Number(displayOrder) || 0,
      parentCategory: parentCategory || null,
      subcategories: Array.isArray(subcategories) ? subcategories : [],
      isActive,
    });

    await recordAuditLog(req, 'CREATE_CATEGORY', 'CATEGORY', {
      categoryId: category._id,
      name: category.name,
    });

    sendSuccess(res, { category }, 'Category created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/admin/categories/:id
 * Edit category
 */
export const updateAdminCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return next(AppError.notFound('Category not found'));
    }

    const {
      name,
      slug,
      description,
      image,
      icon,
      displayOrder,
      parentCategory,
      subcategories,
      isActive,
    } = req.body;

    if (name && name !== category.name) {
      const existing = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: category._id },
      });
      if (existing) {
        return next(AppError.badRequest(`Category name '${name}' is already taken.`));
      }
      category.name = name;
    }

    if (slug !== undefined) category.slug = slug;
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (icon !== undefined) category.icon = icon;
    if (displayOrder !== undefined) category.displayOrder = Number(displayOrder);
    if (parentCategory !== undefined) category.parentCategory = parentCategory || null;
    if (subcategories !== undefined) {
      category.subcategories = Array.isArray(subcategories) ? subcategories : [];
    }
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();

    await recordAuditLog(req, 'UPDATE_CATEGORY', 'CATEGORY', {
      categoryId: category._id,
      name: category.name,
    });

    sendSuccess(res, { category }, 'Category updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/categories/:id/status
 * Toggle category active status
 */
export const toggleAdminCategoryStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return next(AppError.notFound('Category not found'));
    }

    category.isActive = !category.isActive;
    await category.save();

    await recordAuditLog(req, 'TOGGLE_CATEGORY_STATUS', 'CATEGORY', {
      categoryId: category._id,
      name: category.name,
      isActive: category.isActive,
    });

    sendSuccess(
      res,
      { category },
      `Category is now ${category.isActive ? 'Active' : 'Inactive'}`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/categories/:id
 * Delete or soft-deactivate category
 */
export const deleteAdminCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return next(AppError.notFound('Category not found'));
    }

    // Check if products exist in category
    const associatedProducts = await Product.countDocuments({ category: category._id });
    if (associatedProducts > 0) {
      // Soft deactivate instead to protect products
      category.isActive = false;
      await category.save();

      await recordAuditLog(req, 'DEACTIVATE_CATEGORY', 'CATEGORY', {
        categoryId: category._id,
        name: category.name,
        reason: 'Products assigned to category, softly deactivated',
      });

      return sendSuccess(
        res,
        { category },
        `Category has ${associatedProducts} active products and was deactivated instead of deleted.`
      );
    }

    await Category.findByIdAndDelete(category._id);

    await recordAuditLog(req, 'DELETE_CATEGORY', 'CATEGORY', {
      categoryId: category._id,
      name: category.name,
    });

    sendSuccess(res, null, 'Category deleted successfully');
  } catch (error) {
    next(error);
  }
};
