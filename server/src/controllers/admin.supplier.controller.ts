import { Request, Response, NextFunction } from 'express';
import { Supplier } from '../models/Supplier';
import { Purchase } from '../models/Purchase';
import { recordAuditLog } from '../middleware/authorize.middleware';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

/**
 * GET /api/v1/admin/suppliers
 * List suppliers with total purchase orders count
 */
export const getSuppliers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search } = req.query;

    const filter: Record<string, any> = {};
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      filter.$or = [
        { name: searchRegex },
        { contactPerson: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
      ];
    }

    const suppliers = await Supplier.find(filter).sort({ name: 1 }).lean();

    // Attach purchase counts
    const purchaseCounts = await Purchase.aggregate([
      { $group: { _id: '$supplier', count: { $sum: 1 }, totalSpent: { $sum: '$totalAmount' } } },
    ]);
    const purchaseMap = new Map(purchaseCounts.map((pc) => [pc._id.toString(), pc]));

    const result = suppliers.map((sup: any) => {
      const pData = purchaseMap.get(sup._id.toString());
      return {
        ...sup,
        purchaseCount: pData ? pData.count : 0,
        totalPurchasedRupees: pData ? pData.totalSpent : 0,
      };
    });

    sendSuccess(res, { suppliers: result }, 'Suppliers retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/suppliers
 * Create new supplier profile
 */
export const createSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, contactPerson, phone, email, address, gstin, bankDetails, notes } =
      req.body;

    if (!name || !phone) {
      return next(AppError.badRequest('Supplier name and phone are required.'));
    }

    const supplier = await Supplier.create({
      name,
      contactPerson,
      phone,
      email,
      address,
      gstin,
      bankDetails,
      notes,
      isActive: true,
    });

    await recordAuditLog(req, 'CREATE_SUPPLIER', 'SUPPLIER', {
      supplierId: supplier._id,
      name: supplier.name,
    });

    sendSuccess(res, { supplier }, 'Supplier profile created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/admin/suppliers/:id
 * Edit supplier details
 */
export const updateSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return next(AppError.notFound('Supplier not found'));
    }

    const { name, contactPerson, phone, email, address, gstin, bankDetails, notes, isActive } =
      req.body;

    if (name !== undefined) supplier.name = name;
    if (contactPerson !== undefined) supplier.contactPerson = contactPerson;
    if (phone !== undefined) supplier.phone = phone;
    if (email !== undefined) supplier.email = email;
    if (address !== undefined) supplier.address = address;
    if (gstin !== undefined) supplier.gstin = gstin;
    if (bankDetails !== undefined) supplier.bankDetails = bankDetails;
    if (notes !== undefined) supplier.notes = notes;
    if (isActive !== undefined) supplier.isActive = Boolean(isActive);

    await supplier.save();

    await recordAuditLog(req, 'UPDATE_SUPPLIER', 'SUPPLIER', {
      supplierId: supplier._id,
      name: supplier.name,
    });

    sendSuccess(res, { supplier }, 'Supplier updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/suppliers/:id
 * Soft deactivates or removes supplier
 */
export const deleteSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return next(AppError.notFound('Supplier not found'));
    }

    supplier.isActive = false;
    await supplier.save();

    await recordAuditLog(req, 'DEACTIVATE_SUPPLIER', 'SUPPLIER', {
      supplierId: supplier._id,
      name: supplier.name,
    });

    sendSuccess(res, { supplier }, 'Supplier profile deactivated');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/suppliers/:id/purchases
 * List purchase records for this supplier
 */
export const getSupplierPurchases = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const purchases = await Purchase.find({ supplier: req.params.id })
      .sort({ purchaseDate: -1 })
      .lean();

    sendSuccess(res, { purchases }, 'Supplier purchase records retrieved');
  } catch (error) {
    next(error);
  }
};
