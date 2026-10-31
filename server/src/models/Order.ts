import mongoose, { Document, Schema, Model } from 'mongoose';

export enum OrderStatus {
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  CONFIRMED = 'CONFIRMED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PROCESSING = 'PROCESSING',
  PACKED = 'PACKED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUND_PENDING = 'REFUND_PENDING',
  REFUNDED = 'REFUNDED',
  // Backward compatibility alias
  PENDING = 'PAYMENT_PENDING',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  PAID = 'PAID',
  FAILED = 'FAILED',
  USER_DROPPED = 'USER_DROPPED',
  REFUNDED = 'REFUNDED',
}

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number; // in paise
  totalUnitPrice: number; // in paise
  image?: string;
}

export interface IStatusHistoryItem {
  status: OrderStatus;
  timestamp: Date;
  comment?: string;
  updatedBy?: mongoose.Types.ObjectId;
}

export interface IOrderDocument extends Document {
  orderNumber: string;
  invoiceNumber: string;
  user: mongoose.Types.ObjectId;
  items: IOrderItem[];
  deliveryAddress: {
    label?: string;
    recipientName: string;
    recipientPhone: string;
    streetAddress: string;
    landmark?: string;
    city: string;
    state: string;
    postalCode: string;
    location?: {
      type: 'Point';
      coordinates: [number, number];
    };
  };
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'COD' | 'ONLINE' | 'PHONEPE' | 'UPI';
  totalAmount: number; // in paise (subtotal)
  discountAmount: number; // in paise
  deliveryFee: number; // in paise
  packagingFee: number; // in paise
  finalAmount: number; // in paise
  couponCode?: string;
  deliveryPartner?: mongoose.Types.ObjectId;
  estimatedDeliveryTime?: Date;
  deliveredAt?: Date;
  cancellationReason?: string;
  idempotencyKey?: string;
  inventoryReservationExpiresAt?: Date;
  inventoryDeducted: boolean;
  codCollectionInfo?: {
    collectedBy?: mongoose.Types.ObjectId;
    collectedAt?: Date;
    notes?: string;
  };
  statusHistory: IStatusHistoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalUnitPrice: { type: Number, required: true, min: 0 },
    image: { type: String },
  },
  { _id: false }
);

const deliveryAddressSnapshotSchema = new Schema(
  {
    label: { type: String },
    recipientName: { type: String, required: true },
    recipientPhone: { type: String, required: true },
    streetAddress: { type: String, required: true },
    landmark: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
  },
  { _id: false }
);

const statusHistorySchema = new Schema<IStatusHistoryItem>(
  {
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    comment: { type: String },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrderDocument>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    deliveryAddress: {
      type: deliveryAddressSnapshotSchema,
      required: true,
    },
    orderStatus: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PAYMENT_PENDING,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['COD', 'ONLINE', 'PHONEPE', 'UPI'],
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    packagingFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    couponCode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    deliveryPartner: {
      type: Schema.Types.ObjectId,
      ref: 'DeliveryPartner',
      index: true,
    },
    estimatedDeliveryTime: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
    inventoryReservationExpiresAt: {
      type: Date,
      index: true,
    },
    inventoryDeducted: {
      type: Boolean,
      default: false,
    },
    codCollectionInfo: {
      collectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      collectedAt: { type: Date },
      notes: { type: String },
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });

export const Order: Model<IOrderDocument> =
  mongoose.models.Order || mongoose.model<IOrderDocument>('Order', orderSchema);
