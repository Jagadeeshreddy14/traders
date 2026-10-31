import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Purchase, IPurchaseItem } from '../models/Purchase';
import { Supplier } from '../models/Supplier';
import { Product } from '../models/Product';
import { Inventory } from '../models/Inventory';
import { StockMovement } from '../models/StockMovement';
import { recordAuditLog } from '../middleware/authorize.middleware';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

/**
 * GET /api/v1/admin/purchases
 * List purchase orders with filters
 */
export const getPurchases = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, supplierId, search, page = 1, limit = 50 } = req.query;

    const filter: Record<string, any> = {};
    if (status && status !== 'ALL') filter.status = status;
    if (supplierId && supplierId !== 'ALL') filter.supplier = supplierId;

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      filter.$or = [
        { purchaseNumber: searchRegex },
        { supplierInvoiceNumber: searchRegex },
        { supplierName: searchRegex },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const [purchases, total] = await Promise.all([
      Purchase.find(filter)
        .populate('supplier', 'name phone email gstin')
        .sort({ purchaseDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Purchase.countDocuments(filter),
    ]);

    sendSuccess(
      res,
      {
        purchases,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      'Purchases retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/purchases
 * Create a new purchase order
 */
export const createPurchase = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      supplierId,
      supplierInvoiceNumber,
      purchaseDate,
      items,
      taxAmount = 0,
      paymentStatus = 'PENDING',
      paidAmount = 0,
      notes,
      receiveImmediately = false,
    } = req.body;

    if (!supplierId || !Array.isArray(items) || items.length === 0) {
      return next(
        AppError.badRequest('Supplier and at least one purchase item are required.')
      );
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return next(AppError.notFound('Supplier not found'));
    }

    // Generate unique Purchase Order Number: PO-YYYYMMDD-XXXX
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const purchaseNumber = `PO-${datePrefix}-${randomSuffix}`;

    let subtotal = 0;
    const formattedItems: IPurchaseItem[] = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return next(AppError.notFound(`Product ID '${item.productId}' not found`));
      }

      const qty = Number(item.quantity);
      const unitPrice = Number(item.purchasePrice);
      const itemTotal = qty * unitPrice;

      if (qty <= 0 || unitPrice < 0) {
        return next(
          AppError.badRequest(`Invalid quantity or price for item "${product.name}"`)
        );
      }

      subtotal += itemTotal;
      formattedItems.push({
        product: product._id as mongoose.Types.ObjectId,
        name: product.name,
        unit: product.unit,
        quantity: qty,
        purchasePrice: unitPrice,
        totalPrice: itemTotal,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
      });
    }

    const totalAmount = subtotal + Number(taxAmount);

    const purchase = await Purchase.create({
      purchaseNumber,
      supplier: supplier._id,
      supplierName: supplier.name,
      supplierInvoiceNumber,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      status: receiveImmediately ? 'RECEIVED' : 'ORDERED',
      items: formattedItems,
      subtotal,
      taxAmount: Number(taxAmount),
      totalAmount,
      paymentStatus,
      paidAmount: Number(paidAmount),
      notes,
      receivedAt: receiveImmediately ? new Date() : undefined,
      receivedBy: receiveImmediately ? req.user?._id : undefined,
      receivedByName: receiveImmediately ? req.user?.name || 'Administrator' : undefined,
    });

    // RULE: "Stock updates only after confirmed receipt."
    if (receiveImmediately) {
      for (const item of formattedItems) {
        const product = await Product.findById(item.product);
        if (!product) continue;

        const previousStock = product.stockQuantity;
        const newStock = previousStock + item.quantity;

        // Update product stock and purchase price
        product.stockQuantity = newStock;
        product.purchasePrice = item.purchasePrice;
        await product.save();

        // Update Inventory record
        await Inventory.findOneAndUpdate(
          { product: product._id },
          {
            $inc: { currentStock: item.quantity },
            $set: {
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
              supplierName: supplier.name,
              lastRestockedAt: new Date(),
            },
          },
          { upsert: true }
        );

        // Record stock movement
        await StockMovement.create({
          product: product._id,
          productName: product.name,
          type: 'PURCHASE_RECEIPT',
          quantity: item.quantity,
          previousStock,
          newStock,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          reason: `Stock receipt from PO #${purchase.purchaseNumber}`,
          referenceId: purchase.purchaseNumber,
          performedBy: req.user?._id,
          performedByName: req.user?.name || 'Administrator',
        });
      }
    }

    await recordAuditLog(req, 'CREATE_PURCHASE', 'PURCHASE', {
      purchaseNumber: purchase.purchaseNumber,
      supplierName: supplier.name,
      totalAmount: purchase.totalAmount,
      status: purchase.status,
    });

    sendSuccess(res, { purchase }, 'Purchase order created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/purchases/:id
 */
export const getPurchaseById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('supplier')
      .populate('items.product', 'name sku barcode unit images');

    if (!purchase) {
      return next(AppError.notFound('Purchase order not found'));
    }

    sendSuccess(res, { purchase }, 'Purchase order details retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/purchases/:id/receive
 * Confirmed Receipt: Stock updates only happen on this action!
 */
export const receivePurchase = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return next(AppError.notFound('Purchase order not found'));
    }

    // STRICT CHECK: Prevent double receipt!
    if (purchase.status === 'RECEIVED') {
      return next(
        AppError.badRequest('This purchase order has already been marked as RECEIVED and inventory was updated.')
      );
    }

    if (purchase.status === 'CANCELLED') {
      return next(
        AppError.badRequest('Cannot receive stock for a CANCELLED purchase order.')
      );
    }

    // Apply inventory receipt for all items
    for (const item of purchase.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;

      const previousStock = product.stockQuantity;
      const newStock = previousStock + item.quantity;

      // Update product stock and purchase price
      product.stockQuantity = newStock;
      product.purchasePrice = item.purchasePrice;
      await product.save();

      // Update inventory record
      await Inventory.findOneAndUpdate(
        { product: product._id },
        {
          $inc: { currentStock: item.quantity },
          $set: {
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            supplierName: purchase.supplierName,
            lastRestockedAt: new Date(),
          },
        },
        { upsert: true }
      );

      // Record stock movement
      await StockMovement.create({
        product: product._id,
        productName: product.name,
        type: 'PURCHASE_RECEIPT',
        quantity: item.quantity,
        previousStock,
        newStock,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        reason: `Confirmed stock receipt PO #${purchase.purchaseNumber}`,
        referenceId: purchase.purchaseNumber,
        performedBy: req.user?._id,
        performedByName: req.user?.name || 'Administrator',
      });
    }

    purchase.status = 'RECEIVED';
    purchase.receivedAt = new Date();
    purchase.receivedBy = req.user?._id;
    purchase.receivedByName = req.user?.name || 'Administrator';
    await purchase.save();

    await recordAuditLog(req, 'RECEIVE_PURCHASE', 'PURCHASE', {
      purchaseNumber: purchase.purchaseNumber,
      supplierName: purchase.supplierName,
      itemsCount: purchase.items.length,
    });

    sendSuccess(
      res,
      { purchase },
      `Stock confirmed and received for PO #${purchase.purchaseNumber}. Inventory updated.`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/purchases/:id/cancel
 * Cancel purchase order
 */
export const cancelPurchase = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return next(AppError.notFound('Purchase order not found'));
    }

    if (purchase.status === 'RECEIVED') {
      return next(
        AppError.badRequest('Cannot cancel a purchase order that has already been received into stock.')
      );
    }

    purchase.status = 'CANCELLED';
    await purchase.save();

    await recordAuditLog(req, 'CANCEL_PURCHASE', 'PURCHASE', {
      purchaseNumber: purchase.purchaseNumber,
    });

    sendSuccess(res, { purchase }, 'Purchase order cancelled successfully');
  } catch (error) {
    next(error);
  }
};
