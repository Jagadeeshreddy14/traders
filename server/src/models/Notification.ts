import mongoose, { Document, Schema, Model } from 'mongoose';

export enum NotificationType {
  ORDER_CREATED = 'ORDER_CREATED',
  PAYMENT_SUCCESSFUL = 'PAYMENT_SUCCESSFUL',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  COD_ORDER_CONFIRMED = 'COD_ORDER_CONFIRMED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_STATUS_UPDATED = 'ORDER_STATUS_UPDATED',
}

export interface INotificationDocument extends Document {
  user: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  channel: 'IN_APP' | 'SMS_SIMULATED' | 'EMAIL_SIMULATED';
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    channel: {
      type: String,
      enum: ['IN_APP', 'SMS_SIMULATED', 'EMAIL_SIMULATED'],
      default: 'IN_APP',
    },
    read: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
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

notificationSchema.index({ user: 1, createdAt: -1 });

export const Notification: Model<INotificationDocument> =
  mongoose.models.Notification ||
  mongoose.model<INotificationDocument>('Notification', notificationSchema);
