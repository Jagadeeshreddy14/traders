import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAddressDocument extends Document {
  user: mongoose.Types.ObjectId;
  label: 'HOME' | 'WORK' | 'OTHER';
  recipientName: string;
  recipientPhone: string;
  houseNo?: string;
  street?: string;
  area?: string;
  streetAddress: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddressDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    label: {
      type: String,
      enum: ['HOME', 'WORK', 'OTHER'],
      default: 'HOME',
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
    },
    recipientPhone: {
      type: String,
      required: true,
      trim: true,
    },
    houseNo: {
      type: String,
      trim: true,
    },
    street: {
      type: String,
      trim: true,
    },
    area: {
      type: String,
      trim: true,
    },
    streetAddress: {
      type: String,
      required: true,
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      default: 'Hyderabad',
    },
    state: {
      type: String,
      required: true,
      trim: true,
      default: 'Telangana',
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
      match: [/^[1-9][0-9]{5}$/, 'PIN code must be a valid 6-digit Indian postal code'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    location: {
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
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        ret.id = ret._id;
        ret.fullName = ret.recipientName;
        ret.phone = ret.recipientPhone;
        ret.pincode = ret.postalCode;
        ret.type = ret.label;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

addressSchema.index({ 'location': '2dsphere' });
addressSchema.index({ user: 1, isDefault: 1 });

export const Address: Model<IAddressDocument> =
  mongoose.models.Address || mongoose.model<IAddressDocument>('Address', addressSchema);
