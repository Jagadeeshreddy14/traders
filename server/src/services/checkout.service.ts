import mongoose from 'mongoose';
import { CartService, ICartDetails } from './cart.service';
import { AddressService } from './address.service';
import { DeliveryService } from './delivery.service';
import { CouponService, ICouponValidationResult } from './coupon.service';
import { IAddressDocument } from '../models/Address';
import { AppError } from '../utils/appError';

export interface ICheckoutPreviewResponse {
  canProceedToPayment: boolean;
  cart: ICartDetails;
  deliveryAddress: {
    id: string;
    fullName: string;
    phone: string;
    streetAddress: string;
    city: string;
    state: string;
    pincode: string;
    type: string;
    isDefault: boolean;
  };
  serviceability: {
    isServiceable: boolean;
    pincode: string;
    areaName?: string;
    deliveryWindow?: string;
    message: string;
  };
  pricing: {
    itemsRegularTotalPaise: number; // MRP sum
    itemsRegularTotalFormatted: string;
    itemsSubtotalPaise: number; // Discounted store price sum
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

export class CheckoutService {
  /**
   * Recalculate full checkout preview with backend-governed pricing, inventory,
   * delivery serviceability, and coupon validation.
   */
  static async getPreview(
    userId: string | mongoose.Types.ObjectId,
    addressId?: string,
    couponCode?: string
  ): Promise<ICheckoutPreviewResponse> {
    const validationIssues: string[] = [];

    // 1. Fetch live cart
    const cart = await CartService.getCart(userId);
    if (!cart.items || cart.items.length === 0) {
      throw AppError.badRequest('Your shopping cart is empty. Add grocery items before checkout.');
    }

    if (cart.hasOutOfStockItems) {
      validationIssues.push(
        'One or more items in your cart are currently out of stock or exceed available inventory.'
      );
    }

    // 2. Resolve delivery address
    let address: IAddressDocument;
    if (addressId) {
      address = await AddressService.getAddressById(addressId, userId);
    } else {
      const addresses = await AddressService.getUserAddresses(userId);
      if (addresses.length === 0) {
        throw AppError.badRequest('Please add a delivery address to review checkout options.');
      }
      address = addresses[0]; // Default or first
    }

    // 3. Verify PIN code serviceability
    const serviceabilityCheck = await DeliveryService.checkServiceability(address.postalCode);
    if (!serviceabilityCheck.serviceable) {
      validationIssues.push(
        `PIN code ${address.postalCode} (${address.city}) is outside Paven Traders express delivery coverage.`
      );
    }

    // 4. Calculate prices in integer paise
    const itemsSubtotalPaise = cart.subtotalPaise;
    const itemsRegularTotalPaise = cart.regularSubtotalPaise;
    const productSavingsPaise = cart.totalSavingsPaise;

    const minOrderAmountPaise = serviceabilityCheck.minOrderAmount;
    const isMinOrderMet = itemsSubtotalPaise >= minOrderAmountPaise;
    if (!isMinOrderMet) {
      const diffRupees = ((minOrderAmountPaise - itemsSubtotalPaise) / 100).toFixed(2);
      validationIssues.push(
        `Minimum order amount is ₹${(minOrderAmountPaise / 100).toFixed(0)}. Please add ₹${diffRupees} more to checkout.`
      );
    }

    const freeDeliveryThresholdPaise = serviceabilityCheck.freeDeliveryThreshold;
    const isFreeDelivery = itemsSubtotalPaise >= freeDeliveryThresholdPaise;
    const deliveryChargePaise = isFreeDelivery ? 0 : serviceabilityCheck.deliveryCharge;
    const amountNeededForFreeDeliveryPaise = isFreeDelivery
      ? 0
      : Math.max(0, freeDeliveryThresholdPaise - itemsSubtotalPaise);

    const packagingChargePaise = serviceabilityCheck.packagingCharge;

    // 5. Validate coupon if provided
    let couponDiscountPaise = 0;
    let appliedCoupon: ICheckoutPreviewResponse['pricing']['appliedCoupon'] | undefined;

    if (couponCode && couponCode.trim()) {
      const couponValidation: ICouponValidationResult = await CouponService.validateCoupon(
        couponCode.trim(),
        itemsSubtotalPaise,
        userId.toString()
      );

      if (couponValidation.valid && couponValidation.coupon) {
        couponDiscountPaise = couponValidation.discountPaise;
        appliedCoupon = {
          code: couponValidation.coupon.code,
          discountType: couponValidation.coupon.discountType,
          discountValue: couponValidation.coupon.discountValue,
        };
      } else {
        validationIssues.push(couponValidation.message);
      }
    }

    // 6. Calculate total payable
    const totalPayablePaise = Math.max(
      0,
      itemsSubtotalPaise - couponDiscountPaise + deliveryChargePaise + packagingChargePaise
    );
    const totalOverallSavingsPaise = productSavingsPaise + couponDiscountPaise;

    const canProceedToPayment =
      serviceabilityCheck.serviceable &&
      !cart.hasOutOfStockItems &&
      isMinOrderMet &&
      validationIssues.length === 0;

    return {
      canProceedToPayment,
      cart,
      deliveryAddress: {
        id: address.id,
        fullName: address.recipientName,
        phone: address.recipientPhone,
        streetAddress: address.streetAddress,
        city: address.city,
        state: address.state,
        pincode: address.postalCode,
        type: address.label,
        isDefault: address.isDefault,
      },
      serviceability: {
        isServiceable: serviceabilityCheck.serviceable,
        pincode: serviceabilityCheck.pincode,
        areaName: serviceabilityCheck.areaName,
        deliveryWindow: serviceabilityCheck.deliveryWindow,
        message: serviceabilityCheck.message,
      },
      pricing: {
        itemsRegularTotalPaise,
        itemsRegularTotalFormatted: `₹${(itemsRegularTotalPaise / 100).toFixed(2)}`,
        itemsSubtotalPaise,
        itemsSubtotalFormatted: `₹${(itemsSubtotalPaise / 100).toFixed(2)}`,
        productSavingsPaise,
        productSavingsFormatted: `₹${(productSavingsPaise / 100).toFixed(2)}`,
        couponDiscountPaise,
        couponDiscountFormatted: `₹${(couponDiscountPaise / 100).toFixed(2)}`,
        appliedCoupon,
        deliveryChargePaise,
        deliveryChargeFormatted: deliveryChargePaise === 0 ? 'FREE' : `₹${(deliveryChargePaise / 100).toFixed(2)}`,
        isFreeDelivery,
        freeDeliveryThresholdPaise,
        freeDeliveryThresholdFormatted: `₹${(freeDeliveryThresholdPaise / 100).toFixed(0)}`,
        amountNeededForFreeDeliveryPaise,
        amountNeededForFreeDeliveryFormatted: `₹${(amountNeededForFreeDeliveryPaise / 100).toFixed(2)}`,
        packagingChargePaise,
        packagingChargeFormatted: `₹${(packagingChargePaise / 100).toFixed(2)}`,
        minOrderAmountPaise,
        minOrderAmountFormatted: `₹${(minOrderAmountPaise / 100).toFixed(0)}`,
        isMinOrderMet,
        totalPayablePaise,
        totalPayableFormatted: `₹${(totalPayablePaise / 100).toFixed(2)}`,
        totalOverallSavingsPaise,
        totalOverallSavingsFormatted: `₹${(totalOverallSavingsPaise / 100).toFixed(2)}`,
      },
      validationIssues,
      notice:
        'Phase 3 Checkout Preview: Pricing, delivery serviceability, and inventory validated. Permanent order placement and payment gateway integration will be completed in Phase 4.',
    };
  }
}
