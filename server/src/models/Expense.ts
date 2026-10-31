import mongoose, { Document, Schema, Model } from 'mongoose';

export type ExpenseCategory =
  | 'RENT'
  | 'SALARIES'
  | 'ELECTRICITY'
  | 'TRANSPORT'
  | 'PACKAGING'
  | 'MARKETING'
  | 'MAINTENANCE'
  | 'OTHER';

export type ExpensePaymentMethod =
  | 'CASH'
  | 'BANK_TRANSFER'
  | 'UPI'
  | 'CHEQUE'
  | 'OTHER';

export interface IExpenseDocument extends Document {
  title: string;
  category: ExpenseCategory;
  amount: number; // in Rupees
  date: Date;
  paymentMethod: ExpensePaymentMethod;
  receiptUrl?: string;
  referenceNumber?: string;
  notes?: string;
  recordedBy?: mongoose.Types.ObjectId;
  recordedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpenseDocument>(
  {
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        'RENT',
        'SALARIES',
        'ELECTRICITY',
        'TRANSPORT',
        'PACKAGING',
        'MARKETING',
        'MAINTENANCE',
        'OTHER',
      ],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER'],
      default: 'UPI',
    },
    receiptUrl: {
      type: String,
      trim: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    recordedByName: {
      type: String,
      default: 'Admin Staff',
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

expenseSchema.index({ category: 1, date: -1 });
expenseSchema.index({ date: -1 });

export const Expense: Model<IExpenseDocument> =
  mongoose.models.Expense || mongoose.model<IExpenseDocument>('Expense', expenseSchema);
