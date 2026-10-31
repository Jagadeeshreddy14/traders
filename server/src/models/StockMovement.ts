import mongoose, { Document, Schema, Model } from 'mongoose';

export type StockMovementType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'ADJUSTMENT'
  | 'PURCHASE_RECEIPT'
  | 'ORDER_FULFILLMENT'
  | 'ORDER_CANCELLATION';

export interface IStockMovementDocument extends Document {
  product: mongoose.Types.ObjectId;
  productName: string;
  type: StockMovementType;
  quantity: number; // positive for additions, negative for reductions
  previousStock: number;
  newStock: number;
  batchNumber?: string;
  expiryDate?: Date;
  reason?: string;
  referenceId?: string; // e.g. orderId or purchaseId
  performedBy?: mongoose.Types.ObjectId;
  performedByName?: string;
  createdAt: Date;
}

const stockMovementSchema = new Schema<IStockMovementDocument>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        'STOCK_IN',
        'STOCK_OUT',
        'ADJUSTMENT',
        'PURCHASE_RECEIPT',
        'ORDER_FULFILLMENT',
        'ORDER_CANCELLATION',
      ],
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: Date,
    },
    reason: {
      type: String,
      trim: true,
    },
    referenceId: {
      type: String,
      trim: true,
      index: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    performedByName: {
      type: String,
      default: 'Admin Staff',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });

export const StockMovement: Model<IStockMovementDocument> =
  mongoose.models.StockMovement ||
  mongoose.model<IStockMovementDocument>('StockMovement', stockMovementSchema);
