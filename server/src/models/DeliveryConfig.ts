import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISupportedPincode {
  pincode: string;
  areaName: string;
  deliveryWindow: string; // e.g. "30-45 mins"
  isServiceable: boolean;
  deliveryChargeOverride?: number;
}

export interface IDeliveryConfigDocument extends Document {
  deliveryCharge: number; // in paise, e.g. 4000 = ₹40
  freeDeliveryThreshold: number; // in paise, e.g. 49900 = ₹499
  packagingCharge: number; // in paise, e.g. 1500 = ₹15
  minOrderAmount: number; // in paise, e.g. 19900 = ₹199
  defaultDeliveryWindow: string; // e.g. "30-45 mins"
  supportedPincodes: ISupportedPincode[];
  createdAt: Date;
  updatedAt: Date;
}

const supportedPincodeSchema = new Schema<ISupportedPincode>(
  {
    pincode: {
      type: String,
      required: true,
      trim: true,
      match: [/^[1-9][0-9]{5}$/, 'PIN code must be a valid 6-digit Indian postal code'],
    },
    areaName: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryWindow: {
      type: String,
      default: '30-45 mins',
      trim: true,
    },
    isServiceable: {
      type: Boolean,
      default: true,
    },
    deliveryChargeOverride: {
      type: Number,
      min: [0, 'Delivery charge override cannot be negative'],
    },
  },
  { _id: false }
);

const deliveryConfigSchema = new Schema<IDeliveryConfigDocument>(
  {
    deliveryCharge: {
      type: Number,
      default: 4000, // ₹40 in paise
      min: [0, 'Delivery charge cannot be negative'],
    },
    freeDeliveryThreshold: {
      type: Number,
      default: 49900, // ₹499 in paise
      min: [0, 'Threshold cannot be negative'],
    },
    packagingCharge: {
      type: Number,
      default: 1500, // ₹15 in paise
      min: [0, 'Packaging charge cannot be negative'],
    },
    minOrderAmount: {
      type: Number,
      default: 19900, // ₹199 in paise
      min: [0, 'Minimum order amount cannot be negative'],
    },
    defaultDeliveryWindow: {
      type: String,
      default: '30-45 mins',
      trim: true,
    },
    supportedPincodes: {
      type: [supportedPincodeSchema],
      default: [
        { pincode: '500001', areaName: 'City Center / Abids', deliveryWindow: '30-45 mins', isServiceable: true },
        { pincode: '500002', areaName: 'Koti Commercial Hub', deliveryWindow: '30-45 mins', isServiceable: true },
        { pincode: '500003', areaName: 'Secunderabad Station Zone', deliveryWindow: '35-50 mins', isServiceable: true },
        { pincode: '500004', areaName: 'Nampally / Bazar', deliveryWindow: '30-45 mins', isServiceable: true },
        { pincode: '500028', areaName: 'Mehdipatnam Hub', deliveryWindow: '30-45 mins', isServiceable: true },
        { pincode: '500034', areaName: 'Banjara Hills Sector 1-14', deliveryWindow: '25-40 mins', isServiceable: true },
        { pincode: '500081', areaName: 'Madhapur / Hitech City', deliveryWindow: '30-45 mins', isServiceable: true },
        { pincode: '500082', areaName: 'Gachibowli Outer Hub', deliveryWindow: '35-50 mins', isServiceable: true },
        { pincode: '500033', areaName: 'Jubilee Hills Road 1-36', deliveryWindow: '25-40 mins', isServiceable: true },
      ],
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

export const DeliveryConfig: Model<IDeliveryConfigDocument> =
  mongoose.models.DeliveryConfig ||
  mongoose.model<IDeliveryConfigDocument>('DeliveryConfig', deliveryConfigSchema);
