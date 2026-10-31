export type OrderStatus =
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'PROCESSING'
  | 'PACKED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type PaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'PAID'
  | 'FAILED'
  | 'USER_DROPPED'
  | 'REFUNDED';

export type PaymentMethod = 'COD' | 'ONLINE' | 'PHONEPE' | 'UPI';

export interface IOrderItem {
  product: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number; // in paise
  totalUnitPrice: number; // in paise
  image?: string;
}

export interface IOrder {
  id: string;
  _id?: string;
  orderNumber: string;
  invoiceNumber?: string;
  user: string;
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
  };
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  totalAmount: number; // in paise
  discountAmount: number; // in paise
  deliveryFee: number; // in paise
  packagingFee: number; // in paise
  finalAmount: number; // in paise
  couponCode?: string;
  estimatedDeliveryTime?: string;
  deliveredAt?: string;
  statusHistory?: Array<{
    status: OrderStatus;
    timestamp: string;
    comment?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface IPaymentRecord {
  id: string;
  order: string;
  amount: number;
  currency: string;
  provider: string;
  status: PaymentStatus;
  merchantTransactionId?: string;
  phonepeTransactionId?: string;
  paymentMethod?: string;
  createdAt: string;
}
