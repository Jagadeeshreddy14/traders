import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IStorePincode {
  pincode: string;
  areaName: string;
  deliveryWindow: string;
  isServiceable: boolean;
  deliveryChargeOverride?: number;
}

export interface IStoreSettingsDocument extends Document {
  storeName: string;
  storeLogo?: string;
  contactEmail: string;
  contactPhone: string;
  storeAddress: string;
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  deliveryChargeRupees: number;
  freeDeliveryThresholdRupees: number;
  packagingChargeRupees: number;
  minOrderAmountRupees: number;
  defaultDeliveryWindow: string;
  supportedPincodes: IStorePincode[];
  currency: string;
  taxGstin?: string;
  createdAt: Date;
  updatedAt: Date;
}

const storePincodeSchema = new Schema<IStorePincode>(
  {
    pincode: {
      type: String,
      required: true,
      trim: true,
    },
    areaName: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryWindow: {
      type: String,
      default: '30-45 mins',
    },
    isServiceable: {
      type: Boolean,
      default: true,
    },
    deliveryChargeOverride: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
);

const storeSettingsSchema = new Schema<IStoreSettingsDocument>(
  {
    storeName: {
      type: String,
      default: 'Paven Traders',
      trim: true,
    },
    storeLogo: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      default: 'support@paventraders.com',
      trim: true,
    },
    contactPhone: {
      type: String,
      default: '+91 98765 43210',
      trim: true,
    },
    storeAddress: {
      type: String,
      default: 'Shop 12, Paven Commercial Complex, Hyderabad, Telangana 500001',
      trim: true,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    openingTime: {
      type: String,
      default: '07:00 AM',
    },
    closingTime: {
      type: String,
      default: '10:00 PM',
    },
    deliveryChargeRupees: {
      type: Number,
      default: 40,
      min: 0,
    },
    freeDeliveryThresholdRupees: {
      type: Number,
      default: 499,
      min: 0,
    },
    packagingChargeRupees: {
      type: Number,
      default: 15,
      min: 0,
    },
    minOrderAmountRupees: {
      type: Number,
      default: 199,
      min: 0,
    },
    defaultDeliveryWindow: {
      type: String,
      default: '30-45 mins',
    },
    supportedPincodes: {
      type: [storePincodeSchema],
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
    currency: {
      type: String,
      default: 'INR',
    },
    taxGstin: {
      type: String,
      default: '36AAAAA0000A1Z5',
      trim: true,
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

export const StoreSettings: Model<IStoreSettingsDocument> =
  mongoose.models.StoreSettings ||
  mongoose.model<IStoreSettingsDocument>('StoreSettings', storeSettingsSchema);
