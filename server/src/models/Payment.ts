import mongoose, { Document, Schema, Model } from 'mongoose';

export enum PaymentProvider {
  PHONEPE = 'PHONEPE',
  UPI = 'UPI',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  // Legacy / fallback
  RAZORPAY = 'RAZORPAY',
  STRIPE = 'STRIPE',
}

export enum PaymentTransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  PAID = 'PAID',
  FAILED = 'FAILED',
  USER_DROPPED = 'USER_DROPPED',
  REFUNDED = 'REFUNDED',
}

export interface IPaymentAuditEvent {
  event: string;
  status: string;
  timestamp: Date;
  details?: Record<string, any>;
}

export interface IPaymentDocument extends Document {
  order: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  amount: number; // in paise
  currency: string;
  provider: PaymentProvider;
  status: PaymentTransactionStatus;
  merchantTransactionId?: string;
  phonepeTransactionId?: string;
  paymentMethod?: string;
  transactionId?: string;
  paymentGatewayOrderId?: string;
  idempotencyKey?: string;
  rawResponse?: Record<string, any>;
  codCollectedBy?: mongoose.Types.ObjectId;
  codCollectedAt?: Date;
  codCollectionNotes?: string;
  auditEvents: IPaymentAuditEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const auditEventSchema = new Schema<IPaymentAuditEvent>(
  {
    event: { type: String, required: true },
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    details: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const paymentSchema = new Schema<IPaymentDocument>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    provider: {
      type: String,
      enum: Object.values(PaymentProvider),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(PaymentTransactionStatus),
      default: PaymentTransactionStatus.PENDING,
      index: true,
    },
    merchantTransactionId: {
      type: String,
      trim: true,
    },
    phonepeTransactionId: {
      type: String,
      sparse: true,
      trim: true,
      index: true,
    },
    paymentMethod: {
      type: String,
      trim: true,
    },
    transactionId: {
      type: String,
      sparse: true,
      trim: true,
      index: true,
    },
    paymentGatewayOrderId: {
      type: String,
      sparse: true,
      trim: true,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
    rawResponse: {
      type: Schema.Types.Mixed,
    },
    codCollectedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    codCollectedAt: {
      type: Date,
    },
    codCollectionNotes: {
      type: String,
    },
    auditEvents: {
      type: [auditEventSchema],
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

paymentSchema.index({ order: 1, status: 1 });
paymentSchema.index({ merchantTransactionId: 1 }, { unique: true, sparse: true });

export const Payment: Model<IPaymentDocument> =
  mongoose.models.Payment || mongoose.model<IPaymentDocument>('Payment', paymentSchema);
