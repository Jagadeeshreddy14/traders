import mongoose, { Document, Schema, Model } from 'mongoose';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

export interface IUserCouponUsage {
  user: mongoose.Types.ObjectId;
  count: number;
}

export interface ICouponDocument extends Document {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number;
  userUsageLimit?: number;
  usedCount: number;
  usersUsed: IUserCouponUsage[];
  isActive: boolean;
  isValidNow(): boolean;
  isEligibleForUser(userId?: string | mongoose.Types.ObjectId): { eligible: boolean; reason?: string };
  createdAt: Date;
  updatedAt: Date;
}

const userCouponUsageSchema = new Schema<IUserCouponUsage>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    count: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const couponSchema = new Schema<ICouponDocument>(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: [0, 'Discount value cannot be negative'],
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order value cannot be negative'],
    },
    maxDiscountAmount: {
      type: Number,
      min: [0, 'Maximum discount amount cannot be negative'],
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: [true, 'Coupon expiration date is required'],
    },
    usageLimit: {
      type: Number,
      min: [1, 'Usage limit must be at least 1'],
    },
    userUsageLimit: {
      type: Number,
      default: 1,
      min: [1, 'Per user limit must be at least 1'],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    usersUsed: {
      type: [userCouponUsageSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

couponSchema.methods.isValidNow = function (this: ICouponDocument): boolean {
  const now = new Date();
  if (!this.isActive) return false;
  if (now < this.validFrom || now > this.validUntil) return false;
  if (this.usageLimit && this.usedCount >= this.usageLimit) return false;
  return true;
};

couponSchema.methods.isEligibleForUser = function (
  this: ICouponDocument,
  userId?: string | mongoose.Types.ObjectId
): { eligible: boolean; reason?: string } {
  if (!this.isValidNow()) {
    return { eligible: false, reason: 'Coupon is inactive, expired, or maximum overall usage limit reached' };
  }

  if (userId && this.userUsageLimit) {
    const userStr = userId.toString();
    const record = this.usersUsed?.find((u) => u.user.toString() === userStr);
    if (record && record.count >= this.userUsageLimit) {
      return { eligible: false, reason: `You have already used this coupon the maximum allowed number of times (${this.userUsageLimit})` };
    }
  }

  return { eligible: true };
};

export const Coupon: Model<ICouponDocument> =
  mongoose.models.Coupon || mongoose.model<ICouponDocument>('Coupon', couponSchema);
