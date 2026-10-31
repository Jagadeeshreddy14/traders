export interface ICategory {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface IProduct {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  brand?: string;
  description?: string;
  category: ICategory | string;
  sku?: string;
  price: number;
  discountedPrice?: number;
  unit: string;
  stockQuantity: number;
  images: string[];
  isAvailable: boolean;
  isFeatured: boolean;
  tags: string[];
  createdAt?: string;
}

export interface IAddress {
  id: string;
  _id?: string;
  fullName: string;
  phone: string;
  houseNo?: string;
  street?: string;
  area?: string;
  streetAddress: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  type: 'HOME' | 'WORK' | 'OTHER';
  isDefault: boolean;
}

export interface ICoupon {
  id: string;
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
}

export interface ICheckoutPreview {
  canProceedToPayment: boolean;
  deliveryAddress: IAddress;
  serviceability: {
    isServiceable: boolean;
    pincode: string;
    areaName?: string;
    deliveryWindow?: string;
    message: string;
  };
  pricing: {
    itemsRegularTotalFormatted: string;
    itemsSubtotalFormatted: string;
    productSavingsFormatted: string;
    couponDiscountFormatted: string;
    appliedCoupon?: {
      code: string;
      discountType: string;
      discountValue: number;
    };
    deliveryChargeFormatted: string;
    isFreeDelivery: boolean;
    packagingChargeFormatted: string;
    totalPayableFormatted: string;
    totalOverallSavingsFormatted: string;
  };
  validationIssues: string[];
  notice: string;
}

export interface IOrderItem {
  product: {
    _id?: string;
    id?: string;
    name: string;
    images?: string[];
    unit?: string;
  };
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IOrder {
  _id: string;
  id?: string;
  orderNumber: string;
  invoiceNumber?: string;
  items: IOrderItem[];
  deliveryAddress: IAddress;
  pricing: {
    itemsSubtotalPaise: number;
    couponDiscountPaise: number;
    deliveryFeePaise: number;
    packagingFeePaise: number;
    totalPayablePaise: number;
  };
  couponCode?: string;
  orderStatus: string;
  paymentMethod: 'ONLINE' | 'CASH_ON_DELIVERY';
  paymentStatus: string;
  createdAt: string;
}

export type RootStackParamList = {
  Splash: undefined;
  MainTabs: undefined;
  ProductListing: { categorySlug?: string; categoryName?: string; searchQuery?: string };
  ProductDetails: { productId: string; productTitle?: string };
  Checkout: undefined;
  OrderConfirmation: { orderId: string };
  Orders: undefined;
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Categories: undefined;
  Cart: undefined;
  Search: undefined;
  Account: undefined;
};

