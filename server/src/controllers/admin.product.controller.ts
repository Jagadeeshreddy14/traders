import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Inventory } from '../models/Inventory';
import { StockMovement } from '../models/StockMovement';
import { Category } from '../models/Category';
import { recordAuditLog } from '../middleware/authorize.middleware';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

/**
 * GET /api/v1/admin/products
 * List products with search, category filtering, stock status, and pagination
 */
export const getAdminProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, category, status, isLowStock, page = 1, limit = 50 } = req.query;

    const filter: Record<string, any> = {};

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      filter.$or = [
        { name: searchRegex },
        { brand: searchRegex },
        { sku: searchRegex },
        { barcode: searchRegex },
      ];
    }

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (status === 'ACTIVE') {
      filter.isAvailable = true;
    } else if (status === 'INACTIVE') {
      filter.isAvailable = false;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(filter),
    ]);

    // Attach inventory threshold status
    const productIds = products.map((p) => p._id);
    const inventories = await Inventory.find({ product: { $in: productIds } }).lean();
    const invMap = new Map(inventories.map((inv) => [inv.product.toString(), inv]));

    const productsWithInventory = products.map((p: any) => {
      const inv = invMap.get(p._id.toString());
      const available = inv ? inv.currentStock - inv.reservedStock : p.stockQuantity;
      const minThreshold = inv ? inv.minThreshold : 10;
      return {
        ...p,
        inventory: inv
          ? {
              currentStock: inv.currentStock,
              reservedStock: inv.reservedStock,
              minThreshold: inv.minThreshold,
              batchNumber: inv.batchNumber,
              expiryDate: inv.expiryDate,
              isLowStock: available <= minThreshold,
            }
          : {
              currentStock: p.stockQuantity,
              reservedStock: 0,
              minThreshold: 10,
              isLowStock: p.stockQuantity <= 10,
            },
      };
    });

    sendSuccess(
      res,
      {
        products: productsWithInventory,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      'Admin products retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/products
 * Add new product with initial stock, barcode, purchase price, tax and variants
 */
export const createAdminProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      slug,
      brand,
      description,
      category,
      sku,
      barcode,
      purchasePrice = 0,
      price,
      discountedPrice,
      taxRate = 0,
      unit,
      stockQuantity = 0,
      variants = [],
      images = [],
      isAvailable = true,
      isFeatured = false,
      tags = [],
      batchNumber,
      expiryDate,
      minThreshold = 10,
    } = req.body;

    if (!name || !category || price === undefined || !unit) {
      return next(
        AppError.badRequest('Product name, category, price, and unit are required.')
      );
    }

    // Auto-generate slug if not provided
    const generatedSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;

    const existingSlug = await Product.findOne({ slug: generatedSlug });
    if (existingSlug) {
      return next(AppError.badRequest(`Slug '${generatedSlug}' is already in use.`));
    }

    if (sku) {
      const existingSku = await Product.findOne({ sku });
      if (existingSku) {
        return next(AppError.badRequest(`SKU '${sku}' is already in use.`));
      }
    }

    if (barcode) {
      const existingBarcode = await Product.findOne({ barcode });
      if (existingBarcode) {
        return next(AppError.badRequest(`Barcode '${barcode}' is already in use.`));
      }
    }

    const product = await Product.create({
      name,
      slug: generatedSlug,
      brand: brand || 'Paven Choice',
      description,
      category,
      sku,
      barcode,
      purchasePrice: Number(purchasePrice) || 0,
      price: Number(price),
      discountedPrice: discountedPrice !== undefined ? Number(discountedPrice) : undefined,
      taxRate: Number(taxRate) || 0,
      unit,
      stockQuantity: Number(stockQuantity) || 0,
      variants,
      images,
      isAvailable,
      isFeatured,
      tags,
    });

    // Create corresponding Inventory record
    await Inventory.create({
      product: product._id,
      currentStock: Number(stockQuantity) || 0,
      reservedStock: 0,
      minThreshold: Number(minThreshold) || 10,
      batchNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      lastRestockedAt: new Date(),
    });

    // Record initial StockMovement if stock > 0
    if (Number(stockQuantity) > 0) {
      await StockMovement.create({
        product: product._id,
        productName: product.name,
        type: 'STOCK_IN',
        quantity: Number(stockQuantity),
        previousStock: 0,
        newStock: Number(stockQuantity),
        batchNumber,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        reason: 'Initial catalog creation',
        performedBy: req.user?._id,
        performedByName: req.user?.name || 'Administrator',
      });
    }

    await recordAuditLog(req, 'CREATE_PRODUCT', 'PRODUCT', {
      productId: product._id,
      name: product.name,
      price: product.price,
      stock: product.stockQuantity,
    });

    sendSuccess(res, { product }, 'Product created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/products/:id
 */
export const getAdminProductById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) {
      return next(AppError.notFound('Product not found'));
    }

    const inventory = await Inventory.findOne({ product: product._id });

    sendSuccess(
      res,
      {
        product,
        inventory: inventory || {
          currentStock: product.stockQuantity,
          reservedStock: 0,
          minThreshold: 10,
        },
      },
      'Product details retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/admin/products/:id
 * Edit product details
 */
export const updateAdminProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(AppError.notFound('Product not found'));
    }

    const {
      name,
      brand,
      description,
      category,
      sku,
      barcode,
      purchasePrice,
      price,
      discountedPrice,
      taxRate,
      unit,
      stockQuantity,
      variants,
      images,
      isAvailable,
      isFeatured,
      tags,
      minThreshold,
      batchNumber,
      expiryDate,
    } = req.body;

    // Check SKU collision
    if (sku && sku !== product.sku) {
      const existingSku = await Product.findOne({ sku, _id: { $ne: product._id } });
      if (existingSku) {
        return next(AppError.badRequest(`SKU '${sku}' is already in use by another product.`));
      }
    }

    // Check Barcode collision
    if (barcode && barcode !== product.barcode) {
      const existingBarcode = await Product.findOne({ barcode, _id: { $ne: product._id } });
      if (existingBarcode) {
        return next(AppError.badRequest(`Barcode '${barcode}' is already in use by another product.`));
      }
    }

    const previousStock = product.stockQuantity;

    if (name !== undefined) product.name = name;
    if (brand !== undefined) product.brand = brand;
    if (description !== undefined) product.description = description;
    if (category !== undefined) product.category = category;
    if (sku !== undefined) product.sku = sku;
    if (barcode !== undefined) product.barcode = barcode;
    if (purchasePrice !== undefined) product.purchasePrice = Number(purchasePrice);
    if (price !== undefined) product.price = Number(price);
    if (discountedPrice !== undefined) product.discountedPrice = discountedPrice === null ? undefined : Number(discountedPrice);
    if (taxRate !== undefined) product.taxRate = Number(taxRate);
    if (unit !== undefined) product.unit = unit;
    if (variants !== undefined) product.variants = variants;
    if (images !== undefined) product.images = images;
    if (isAvailable !== undefined) product.isAvailable = Boolean(isAvailable);
    if (isFeatured !== undefined) product.isFeatured = Boolean(isFeatured);
    if (tags !== undefined) product.tags = tags;

    // Stock update sync
    if (stockQuantity !== undefined && Number(stockQuantity) !== previousStock) {
      const newStock = Number(stockQuantity);
      if (newStock < 0) {
        return next(AppError.badRequest('Stock quantity cannot be negative.'));
      }
      product.stockQuantity = newStock;

      const inv = await Inventory.findOne({ product: product._id });
      const currentInvStock = inv ? inv.currentStock : previousStock;
      const stockDiff = newStock - currentInvStock;

      await Inventory.findOneAndUpdate(
        { product: product._id },
        {
          $set: {
            currentStock: newStock,
            ...(minThreshold !== undefined ? { minThreshold: Number(minThreshold) } : {}),
            ...(batchNumber !== undefined ? { batchNumber } : {}),
            ...(expiryDate !== undefined ? { expiryDate: new Date(expiryDate) } : {}),
          },
        },
        { upsert: true }
      );

      // Record adjustment movement
      await StockMovement.create({
        product: product._id,
        productName: product.name,
        type: 'ADJUSTMENT',
        quantity: stockDiff,
        previousStock: currentInvStock,
        newStock,
        reason: 'Manual stock edit from product management',
        performedBy: req.user?._id,
        performedByName: req.user?.name || 'Administrator',
      });
    }

    await product.save();

    await recordAuditLog(req, 'UPDATE_PRODUCT', 'PRODUCT', {
      productId: product._id,
      name: product.name,
      changes: req.body,
    });

    sendSuccess(res, { product }, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/products/:id/status
 * Toggle product active/deactive status
 */
export const toggleAdminProductStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(AppError.notFound('Product not found'));
    }

    product.isAvailable = !product.isAvailable;
    await product.save();

    await recordAuditLog(req, 'TOGGLE_PRODUCT_STATUS', 'PRODUCT', {
      productId: product._id,
      name: product.name,
      isAvailable: product.isAvailable,
    });

    sendSuccess(
      res,
      { product },
      `Product is now ${product.isAvailable ? 'Active' : 'Inactive'}`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/products/:id
 * Deactivates product (safe soft-deactivation)
 */
export const deleteAdminProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(AppError.notFound('Product not found'));
    }

    // Soft delete to protect past orders referencing this product
    product.isAvailable = false;
    await product.save();

    await recordAuditLog(req, 'DEACTIVATE_PRODUCT', 'PRODUCT', {
      productId: product._id,
      name: product.name,
    });

    sendSuccess(res, { product }, 'Product deactivated successfully');
  } catch (error) {
    next(error);
  }
};
