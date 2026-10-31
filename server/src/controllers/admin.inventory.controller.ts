import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Inventory } from '../models/Inventory';
import { Product } from '../models/Product';
import { StockMovement, StockMovementType } from '../models/StockMovement';
import { recordAuditLog } from '../middleware/authorize.middleware';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

/**
 * GET /api/v1/admin/inventory
 * List inventory records with live product info, available stock, batch and expiry dates
 */
export const getAdminInventory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, isLowStock, page = 1, limit = 50 } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const productQuery: Record<string, any> = {};
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      productQuery.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { barcode: searchRegex },
        { brand: searchRegex },
      ];
    }

    // If search was provided, get matching product IDs
    let matchingProductIds: mongoose.Types.ObjectId[] | null = null;
    if (search) {
      const matchingProducts = await Product.find(productQuery).select('_id').lean();
      matchingProductIds = matchingProducts.map((p) => p._id as mongoose.Types.ObjectId);
    }

    const inventoryFilter: Record<string, any> = {};
    if (matchingProductIds) {
      inventoryFilter.product = { $in: matchingProductIds };
    }

    const [inventories, total] = await Promise.all([
      Inventory.find(inventoryFilter)
        .populate('product', 'name sku barcode unit price purchasePrice isAvailable images')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Inventory.countDocuments(inventoryFilter),
    ]);

    const formatted = inventories.map((inv: any) => {
      const currentStock = inv.currentStock || 0;
      const reservedStock = inv.reservedStock || 0;
      const availableStock = currentStock - reservedStock;
      const minThreshold = inv.minThreshold || 10;
      const isLow = availableStock <= minThreshold;

      return {
        id: inv._id,
        productId: inv.product?._id,
        productName: inv.product?.name || 'Unknown Item',
        sku: inv.product?.sku || '',
        barcode: inv.product?.barcode || '',
        unit: inv.product?.unit || '1 unit',
        price: inv.product?.price || 0,
        purchasePrice: inv.product?.purchasePrice || 0,
        image: inv.product?.images?.[0] || '',
        isAvailable: inv.product?.isAvailable ?? true,
        currentStock,
        reservedStock,
        availableStock,
        minThreshold,
        batchNumber: inv.batchNumber || '',
        expiryDate: inv.expiryDate || null,
        supplierName: inv.supplierName || '',
        isLowStock: isLow,
        lastRestockedAt: inv.lastRestockedAt || inv.updatedAt,
      };
    });

    // Optional filter by low stock if requested
    const filtered =
      isLowStock === 'true'
        ? formatted.filter((item) => item.isLowStock)
        : formatted;

    sendSuccess(
      res,
      {
        inventory: filtered,
        pagination: {
          total: isLowStock === 'true' ? filtered.length : total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil((isLowStock === 'true' ? filtered.length : total) / limitNum),
        },
      },
      'Inventory records retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/inventory/adjust
 * Stock in, stock out, or direct stock adjustment with negative inventory prevention
 */
export const adjustStock = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      productId,
      type, // 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'
      quantity, // number
      batchNumber,
      expiryDate,
      reason,
    } = req.body;

    if (!productId || !type || quantity === undefined) {
      return next(
        AppError.badRequest('Product ID, adjustment type, and quantity are required.')
      );
    }

    if (!['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'].includes(type)) {
      return next(
        AppError.badRequest("Invalid type. Allowed types: 'STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'")
      );
    }

    const qty = Number(quantity);
    if (isNaN(qty)) {
      return next(AppError.badRequest('Quantity must be a valid number.'));
    }

    const product = await Product.findById(productId);
    if (!product) {
      return next(AppError.notFound('Product not found'));
    }

    let inv = await Inventory.findOne({ product: product._id });
    if (!inv) {
      inv = await Inventory.create({
        product: product._id,
        currentStock: product.stockQuantity || 0,
        reservedStock: 0,
        minThreshold: 10,
      });
    }

    const previousStock = inv.currentStock;
    let newStock = previousStock;
    let delta = 0;

    if (type === 'STOCK_IN') {
      if (qty <= 0) return next(AppError.badRequest('Stock-in quantity must be greater than zero.'));
      delta = qty;
      newStock = previousStock + qty;
    } else if (type === 'STOCK_OUT') {
      if (qty <= 0) return next(AppError.badRequest('Stock-out quantity must be greater than zero.'));
      // STRICT RULE: Prevent negative inventory!
      if (previousStock - qty < 0) {
        return next(
          AppError.badRequest(
            `Cannot stock out ${qty} units. Current stock is only ${previousStock} units (Negative inventory prevented).`
          )
        );
      }
      delta = -qty;
      newStock = previousStock - qty;
    } else if (type === 'ADJUSTMENT') {
      // Set to exact quantity
      if (qty < 0) {
        return next(AppError.badRequest('Stock quantity cannot be negative.'));
      }
      delta = qty - previousStock;
      newStock = qty;
    }

    // Atomic update
    inv.currentStock = newStock;
    if (batchNumber) inv.batchNumber = batchNumber;
    if (expiryDate) inv.expiryDate = new Date(expiryDate);
    if (type === 'STOCK_IN') inv.lastRestockedAt = new Date();
    await inv.save();

    // Synchronize Product.stockQuantity
    product.stockQuantity = newStock;
    await product.save();

    // Create StockMovement audit record
    const movement = await StockMovement.create({
      product: product._id,
      productName: product.name,
      type: type as StockMovementType,
      quantity: delta,
      previousStock,
      newStock,
      batchNumber: batchNumber || inv.batchNumber,
      expiryDate: expiryDate ? new Date(expiryDate) : inv.expiryDate,
      reason: reason || `Manual ${type.toLowerCase()} by admin staff`,
      performedBy: req.user?._id,
      performedByName: req.user?.name || 'Administrator',
    });

    await recordAuditLog(req, 'STOCK_ADJUSTMENT', 'INVENTORY', {
      productId: product._id,
      productName: product.name,
      type,
      quantity: delta,
      previousStock,
      newStock,
      reason,
    });

    sendSuccess(
      res,
      {
        inventory: inv,
        productStockQuantity: product.stockQuantity,
        movement,
      },
      `Stock successfully adjusted. New stock: ${newStock} units.`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/inventory/movements
 * Complete stock movement history and audit trail
 */
export const getStockMovements = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { productId, type, page = 1, limit = 50 } = req.query;

    const filter: Record<string, any> = {};
    if (productId) filter.product = productId;
    if (type && type !== 'ALL') filter.type = type;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [movements, total] = await Promise.all([
      StockMovement.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StockMovement.countDocuments(filter),
    ]);

    sendSuccess(
      res,
      {
        movements,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      'Stock movements retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/inventory/alerts
 * Low stock and out-of-stock items needing replenishment
 */
export const getLowStockAlerts = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const inventories = await Inventory.find({})
      .populate('product', 'name sku barcode unit price stockQuantity isAvailable images')
      .lean();

    const lowStockAlerts: Array<any> = [];

    for (const inv of inventories) {
      const prod = inv.product as any;
      if (!prod) continue;
      const available = (inv.currentStock || 0) - (inv.reservedStock || 0);
      const threshold = inv.minThreshold || 10;

      if (available <= threshold) {
        lowStockAlerts.push({
          id: inv._id,
          productId: prod._id,
          name: prod.name,
          sku: prod.sku,
          unit: prod.unit,
          currentStock: inv.currentStock,
          reservedStock: inv.reservedStock,
          availableStock: available,
          minThreshold: threshold,
          isOutOfStock: available <= 0,
          batchNumber: inv.batchNumber,
          expiryDate: inv.expiryDate,
        });
      }
    }

    sendSuccess(
      res,
      { alerts: lowStockAlerts, count: lowStockAlerts.length },
      'Low stock alerts retrieved'
    );
  } catch (error) {
    next(error);
  }
};
