import mongoose, { Document, Schema, Model } from 'mongoose';

export type PurchaseStatus = 'ORDERED' | 'RECEIVED' | 'CANCELLED';
export type PurchasePaymentStatus = 'PAID' | 'PENDING' | 'PARTIAL';

export interface IPurchaseItem {
  product: mongoose.Types.ObjectId;
  name: string;
  unit: string;
  quantity: number;
  purchasePrice: number; // in Rupees
  totalPrice: number; // in Rupees
  batchNumber?: string;
  expiryDate?: Date;
}

export interface IPurchaseDocument extends Document {
  purchaseNumber: string;
  supplier: mongoose.Types.ObjectId;
  supplierName: string;
  supplierInvoiceNumber?: string;
  purchaseDate: Date;
  status: PurchaseStatus;
  items: IPurchaseItem[];
  subtotal: number; // in Rupees
  taxAmount: number; // in Rupees
  totalAmount: number; // in Rupees
  paymentStatus: PurchasePaymentStatus;
  paidAmount: number; // in Rupees
  notes?: string;
  receivedAt?: Date;
  receivedBy?: mongoose.Types.ObjectId;
  receivedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseItemSchema = new Schema<IPurchaseItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true },
    unit: { type: String, default: '1 unit' },
    quantity: { type: Number, required: true, min: 1 },
    purchasePrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    batchNumber: { type: String, trim: true },
    expiryDate: { type: Date },
  },
  { _id: false }
);

const purchaseSchema = new Schema<IPurchaseDocument>(
  {
    purchaseNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      index: true,
    },
    supplierName: {
      type: String,
      required: true,
    },
    supplierInvoiceNumber: {
      type: String,
      trim: true,
      index: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['ORDERED', 'RECEIVED', 'CANCELLED'],
      default: 'ORDERED',
      index: true,
    },
    items: {
      type: [purchaseItemSchema],
      required: true,
      validate: {
        validator: (items: IPurchaseItem[]) => items.length > 0,
        message: 'Purchase order must have at least one product item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PENDING', 'PARTIAL'],
      default: 'PENDING',
      index: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    receivedAt: {
      type: Date,
    },
    receivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    receivedByName: {
      type: String,
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

purchaseSchema.index({ supplier: 1, createdAt: -1 });
purchaseSchema.index({ status: 1, createdAt: -1 });

export const Purchase: Model<IPurchaseDocument> =
  mongoose.models.Purchase || mongoose.model<IPurchaseDocument>('Purchase', purchaseSchema);
