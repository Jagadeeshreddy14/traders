import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IProductVariant {
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  discountedPrice?: number;
  stockQuantity: number;
}

export interface IProductDocument extends Document {
  name: string;
  slug: string;
  brand?: string;
  description?: string;
  category: mongoose.Types.ObjectId;
  sku?: string;
  barcode?: string;
  purchasePrice?: number;
  price: number;
  discountedPrice?: number;
  taxRate?: number;
  unit: string;
  stockQuantity: number;
  variants: IProductVariant[];
  images: string[];
  isAvailable: boolean;
  isFeatured: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const variantSchema = new Schema<IProductVariant>(
  {
    name: { type: String, required: true },
    sku: { type: String, trim: true, uppercase: true },
    barcode: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    discountedPrice: { type: Number, min: 0 },
    stockQuantity: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const productSchema = new Schema<IProductDocument>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    brand: {
      type: String,
      trim: true,
      default: 'Paven Choice',
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category is required'],
      index: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },
    barcode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    purchasePrice: {
      type: Number,
      default: 0,
      min: [0, 'Purchase price cannot be negative'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountedPrice: {
      type: Number,
      min: [0, 'Discounted price cannot be negative'],
      validate: {
        validator: function (this: IProductDocument, value: number) {
          if (value === undefined || value === null) return true;
          return value <= this.price;
        },
        message: 'Discounted price must be less than or equal to regular price',
      },
    },
    taxRate: {
      type: Number,
      default: 0,
      min: [0, 'Tax rate cannot be negative'],
    },
    unit: {
      type: String,
      required: [true, 'Unit specification is required (e.g., 1 kg, 500 g)'],
      trim: true,
      default: '1 unit',
    },
    stockQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    variants: {
      type: [variantSchema],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
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

productSchema.index({ category: 1, isAvailable: 1 });
productSchema.index({ isFeatured: 1, isAvailable: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

export const Product: Model<IProductDocument> =
  mongoose.models.Product || mongoose.model<IProductDocument>('Product', productSchema);
