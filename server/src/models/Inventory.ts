import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IInventoryDocument extends Document {
  product: mongoose.Types.ObjectId;
  currentStock: number;
  reservedStock: number;
  minThreshold: number;
  batchNumber?: string;
  expiryDate?: Date;
  supplierName?: string;
  lastRestockedAt?: Date;
  isLowStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new Schema<IInventoryDocument>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
      index: true,
    },
    currentStock: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: [0, 'Reserved stock cannot be negative'],
    },
    minThreshold: {
      type: Number,
      default: 10,
      min: [0, 'Threshold cannot be negative'],
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: Date,
    },
    supplierName: {
      type: String,
      trim: true,
    },
    lastRestockedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

inventorySchema.virtual('isLowStock').get(function (this: IInventoryDocument) {
  return (this.currentStock - this.reservedStock) <= this.minThreshold;
});

export const Inventory: Model<IInventoryDocument> =
  mongoose.models.Inventory || mongoose.model<IInventoryDocument>('Inventory', inventorySchema);
