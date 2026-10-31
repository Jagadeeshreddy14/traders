import mongoose from 'mongoose';
import { Coupon, ICouponDocument, DiscountType } from '../models/Coupon';
import { AppError } from '../utils/appError';

export interface ICouponValidationResult {
  valid: boolean;
  coupon?: {
    id: string;
    code: string;
    description?: string;
    discountType: DiscountType;
    discountValue: number;
    minOrderValue: number;
    maxDiscountAmount?: number;
  };
  discountPaise: number;
  message: string;
}

export class CouponService {
  /**
   * Get public active coupons available for shopping customers
   */
  static async getActiveCoupons(): Promise<ICouponDocument[]> {
    const now = new Date();
    return Coupon.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $expr: {
        $or: [
          { $eq: [{ $ifNull: ['$usageLimit', null] }, null] },
          { $lt: ['$usedCount', '$usageLimit'] },
        ],
      },
    })
      .select('code description discountType discountValue minOrderValue maxDiscountAmount validUntil')
      .sort({ discountValue: -1 });
  }

  /**
   * Validate a coupon against current cart subtotal and customer eligibility
   */
  static async validateCoupon(
    code: string,
    subtotalPaise: number,
    userId?: string
  ): Promise<ICouponValidationResult> {
    if (!code || !code.trim()) {
      throw AppError.badRequest('Coupon code is required');
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode });

    if (!coupon) {
      return {
        valid: false,
        discountPaise: 0,
        message: `Coupon "${cleanCode}" is invalid or does not exist.`,
      };
    }

    // Check active & validity dates
    const now = new Date();
    if (!coupon.isActive) {
      return {
        valid: false,
        discountPaise: 0,
        message: `Coupon "${cleanCode}" is no longer active.`,
      };
    }

    if (now < coupon.validFrom) {
      return {
        valid: false,
        discountPaise: 0,
        message: `Coupon "${cleanCode}" will become active on ${coupon.validFrom.toLocaleDateString()}.`,
      };
    }

    if (now > coupon.validUntil) {
      return {
        valid: false,
        discountPaise: 0,
        message: `Coupon "${cleanCode}" expired on ${coupon.validUntil.toLocaleDateString()}.`,
      };
    }

    // Check overall usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return {
        valid: false,
        discountPaise: 0,
        message: `Coupon "${cleanCode}" has reached its maximum total redemptions.`,
      };
    }

    // Check per-user limit
    if (userId && coupon.userUsageLimit) {
      const userUsage = coupon.usersUsed?.find((u) => u.user.toString() === userId.toString());
      if (userUsage && userUsage.count >= coupon.userUsageLimit) {
        return {
          valid: false,
          discountPaise: 0,
          message: `You have already redeemed coupon "${cleanCode}" the maximum allowed number of times.`,
        };
      }
    }

    // Check minimum order value (converted to paise comparison if stored in paise/rupees)
    // We treat minOrderValue as paise in backend
    if (coupon.minOrderValue > 0 && subtotalPaise < coupon.minOrderValue) {
      const minInRupees = (coupon.minOrderValue / 100).toFixed(0);
      return {
        valid: false,
        discountPaise: 0,
        message: `Coupon "${cleanCode}" requires a minimum order subtotal of ₹${minInRupees}.`,
      };
    }

    // Calculate discount
    let discountPaise = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountPaise = Math.round((subtotalPaise * coupon.discountValue) / 100);
      if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
        discountPaise = Math.min(discountPaise, coupon.maxDiscountAmount);
      }
    } else {
      // Flat discount in paise
      discountPaise = Math.min(coupon.discountValue, subtotalPaise);
    }

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue,
        maxDiscountAmount: coupon.maxDiscountAmount,
      },
      discountPaise,
      message: `Coupon "${cleanCode}" applied! You saved ₹${(discountPaise / 100).toFixed(2)}.`,
    };
  }

  /**
   * Admin: List all coupons with metrics
   */
  static async getAllCoupons(): Promise<ICouponDocument[]> {
    return Coupon.find().sort({ createdAt: -1 });
  }

  /**
   * Admin: Create a new coupon
   */
  static async createCoupon(data: Partial<ICouponDocument>): Promise<ICouponDocument> {
    if (!data.code) {
      throw AppError.badRequest('Coupon code is required');
    }
    const cleanCode = data.code.trim().toUpperCase();

    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      throw AppError.conflict(`Coupon with code "${cleanCode}" already exists`);
    }

    return Coupon.create({
      ...data,
      code: cleanCode,
    });
  }

  /**
   * Admin: Update coupon
   */
  static async updateCoupon(id: string, data: Partial<ICouponDocument>): Promise<ICouponDocument> {
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw AppError.notFound('Coupon not found');
    }

    if (data.code) {
      const cleanCode = data.code.trim().toUpperCase();
      if (cleanCode !== coupon.code) {
        const existing = await Coupon.findOne({ code: cleanCode, _id: { $ne: id } });
        if (existing) {
          throw AppError.conflict(`Coupon code "${cleanCode}" is already taken`);
        }
        coupon.code = cleanCode;
      }
    }

    if (data.description !== undefined) coupon.description = data.description;
    if (data.discountType !== undefined) coupon.discountType = data.discountType;
    if (data.discountValue !== undefined) coupon.discountValue = data.discountValue;
    if (data.minOrderValue !== undefined) coupon.minOrderValue = data.minOrderValue;
    if (data.maxDiscountAmount !== undefined) coupon.maxDiscountAmount = data.maxDiscountAmount;
    if (data.validFrom !== undefined) coupon.validFrom = data.validFrom;
    if (data.validUntil !== undefined) coupon.validUntil = data.validUntil;
    if (data.usageLimit !== undefined) coupon.usageLimit = data.usageLimit;
    if (data.userUsageLimit !== undefined) coupon.userUsageLimit = data.userUsageLimit;
    if (data.isActive !== undefined) coupon.isActive = data.isActive;

    await coupon.save();
    return coupon;
  }

  /**
   * Admin: Toggle coupon active/inactive
   */
  static async toggleStatus(id: string): Promise<ICouponDocument> {
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw AppError.notFound('Coupon not found');
    }
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    return coupon;
  }

  /**
   * Admin: Delete coupon
   */
  static async deleteCoupon(id: string): Promise<void> {
    const coupon = await Coupon.findByIdAndDelete(id);
    if (!coupon) {
      throw AppError.notFound('Coupon not found');
    }
  }

  /**
   * Record a completed coupon redemption by a user
   */
  static async recordUsage(code: string, userId: string | mongoose.Types.ObjectId): Promise<void> {
    const cleanCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode });
    if (!coupon) return;

    coupon.usedCount = (coupon.usedCount || 0) + 1;
    if (!coupon.usersUsed) {
      coupon.usersUsed = [];
    }

    const userEntry = coupon.usersUsed.find((u) => u.user.toString() === userId.toString());
    if (userEntry) {
      userEntry.count += 1;
    } else {
      coupon.usersUsed.push({ user: new mongoose.Types.ObjectId(userId.toString()), count: 1 });
    }

    await coupon.save();
  }
}
