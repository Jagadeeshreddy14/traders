import mongoose, { Document, Schema, Model } from 'mongoose';

export enum DeliveryPartnerStatus {
  AVAILABLE = 'AVAILABLE',
  ON_DELIVERY = 'ON_DELIVERY',
  OFFLINE = 'OFFLINE',
}

export enum VehicleType {
  BICYCLE = 'BICYCLE',
  MOTORCYCLE = 'MOTORCYCLE',
  SCOOTER = 'SCOOTER',
  VAN = 'VAN',
}

export interface IDeliveryPartnerDocument extends Document {
  user: mongoose.Types.ObjectId;
  vehicleType: VehicleType;
  vehicleNumber: string;
  licenseNumber: string;
  status: DeliveryPartnerStatus;
  currentLocation?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  activeOrderId?: mongoose.Types.ObjectId;
  totalDeliveriesCompleted: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryPartnerSchema = new Schema<IDeliveryPartnerDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    vehicleType: {
      type: String,
      enum: Object.values(VehicleType),
      required: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: Object.values(DeliveryPartnerStatus),
      default: DeliveryPartnerStatus.OFFLINE,
      index: true,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0],
      },
    },
    activeOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    totalDeliveriesCompleted: {
      type: Number,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1.0,
      max: 5.0,
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

deliveryPartnerSchema.index({ currentLocation: '2dsphere' });

export const DeliveryPartner: Model<IDeliveryPartnerDocument> =
  mongoose.models.DeliveryPartner ||
  mongoose.model<IDeliveryPartnerDocument>('DeliveryPartner', deliveryPartnerSchema);
