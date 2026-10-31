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

export interface ICartPopulatedItem {
  productId: string;
  name: string;
  slug: string;
  brand?: string;
  unit: string;
  image: string;
  price: number;
  discountedPrice?: number;
  unitSellingPrice: number;
  quantity: number;
  subtotal: number;
  regularSubtotal: number;
  discountAmount: number;
  availableStock: number;
  isAvailable: boolean;
  isOutOfStock: boolean;
  stockWarning?: string;
}

export interface ICartDetails {
  id: string;
  userId: string;
  items: ICartPopulatedItem[];
  totalItemsCount: number;
  subtotal: number;
  regularSubtotal: number;
  totalSavings: number;
  subtotalPaise: number;
  regularSubtotalPaise: number;
  totalSavingsPaise: number;
  hasOutOfStockItems: boolean;
}

export interface ICoupon {
  id: string;
  _id?: string;
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number;
  validUntil: string;
}

export interface IServiceabilityResult {
  serviceable: boolean;
  pincode: string;
  areaName?: string;
  deliveryWindow?: string;
  deliveryCharge: number;
  freeDeliveryThreshold: number;
  minOrderAmount: number;
  packagingCharge: number;
  message: string;
}

export interface ICheckoutPreview {
  canProceedToPayment: boolean;
  cart: ICartDetails;
  deliveryAddress: IAddress;
  serviceability: {
    isServiceable: boolean;
    pincode: string;
    areaName?: string;
    deliveryWindow?: string;
    message: string;
  };
  pricing: {
    itemsRegularTotalPaise: number;
    itemsRegularTotalFormatted: string;
    itemsSubtotalPaise: number;
    itemsSubtotalFormatted: string;
    productSavingsPaise: number;
    productSavingsFormatted: string;
    couponDiscountPaise: number;
    couponDiscountFormatted: string;
    appliedCoupon?: {
      code: string;
      discountType: string;
      discountValue: number;
    };
    deliveryChargePaise: number;
    deliveryChargeFormatted: string;
    isFreeDelivery: boolean;
    freeDeliveryThresholdPaise: number;
    freeDeliveryThresholdFormatted: string;
    amountNeededForFreeDeliveryPaise: number;
    amountNeededForFreeDeliveryFormatted: string;
    packagingChargePaise: number;
    packagingChargeFormatted: string;
    minOrderAmountPaise: number;
    minOrderAmountFormatted: string;
    isMinOrderMet: boolean;
    totalPayablePaise: number;
    totalPayableFormatted: string;
    totalOverallSavingsPaise: number;
    totalOverallSavingsFormatted: string;
  };
  validationIssues: string[];
  notice: string;
}
