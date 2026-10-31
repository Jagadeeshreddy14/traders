import { DeliveryConfig, IDeliveryConfigDocument, ISupportedPincode } from '../models/DeliveryConfig';
import { AppError } from '../utils/appError';

export class DeliveryService {
  /**
   * Get the singleton delivery configuration, or initialize with defaults
   */
  static async getConfig(): Promise<IDeliveryConfigDocument> {
    let config = await DeliveryConfig.findOne();
    if (!config) {
      config = await DeliveryConfig.create({
        deliveryCharge: 4000, // ₹40 in paise
        freeDeliveryThreshold: 49900, // ₹499 in paise
        packagingCharge: 1500, // ₹15 in paise
        minOrderAmount: 19900, // ₹199 in paise
        defaultDeliveryWindow: '30-45 mins',
      });
    }
    return config;
  }

  /**
   * Check delivery serviceability for a given 6-digit PIN code
   */
  static async checkServiceability(pincode: string): Promise<{
    serviceable: boolean;
    pincode: string;
    areaName?: string;
    deliveryWindow?: string;
    deliveryCharge: number; // in paise
    freeDeliveryThreshold: number; // in paise
    minOrderAmount: number; // in paise
    packagingCharge: number; // in paise
    message: string;
  }> {
    const cleanPincode = pincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPincode)) {
      throw AppError.badRequest('Please enter a valid 6-digit Indian PIN code (e.g. 500001)');
    }

    const config = await this.getConfig();
    const match = config.supportedPincodes.find(
      (p) => p.pincode === cleanPincode && p.isServiceable
    );

    if (match) {
      const charge = match.deliveryChargeOverride !== undefined ? match.deliveryChargeOverride : config.deliveryCharge;
      return {
        serviceable: true,
        pincode: cleanPincode,
        areaName: match.areaName,
        deliveryWindow: match.deliveryWindow || config.defaultDeliveryWindow,
        deliveryCharge: charge,
        freeDeliveryThreshold: config.freeDeliveryThreshold,
        minOrderAmount: config.minOrderAmount,
        packagingCharge: config.packagingCharge,
        message: `Delivery available in ${match.areaName} within ${match.deliveryWindow || config.defaultDeliveryWindow}.`,
      };
    }

    return {
      serviceable: false,
      pincode: cleanPincode,
      deliveryCharge: config.deliveryCharge,
      freeDeliveryThreshold: config.freeDeliveryThreshold,
      minOrderAmount: config.minOrderAmount,
      packagingCharge: config.packagingCharge,
      message: `Paven Traders currently delivers to central city zones only. PIN code ${cleanPincode} is outside our express delivery coverage.`,
    };
  }

  /**
   * Admin: update delivery charges, minimum order amount, packaging charge, etc.
   */
  static async updateConfig(updates: Partial<IDeliveryConfigDocument>): Promise<IDeliveryConfigDocument> {
    let config = await DeliveryConfig.findOne();
    if (!config) {
      config = new DeliveryConfig();
    }

    if (updates.deliveryCharge !== undefined) config.deliveryCharge = updates.deliveryCharge;
    if (updates.freeDeliveryThreshold !== undefined) config.freeDeliveryThreshold = updates.freeDeliveryThreshold;
    if (updates.packagingCharge !== undefined) config.packagingCharge = updates.packagingCharge;
    if (updates.minOrderAmount !== undefined) config.minOrderAmount = updates.minOrderAmount;
    if (updates.defaultDeliveryWindow !== undefined) config.defaultDeliveryWindow = updates.defaultDeliveryWindow;
    if (updates.supportedPincodes !== undefined) config.supportedPincodes = updates.supportedPincodes;

    await config.save();
    return config;
  }

  /**
   * Admin: Add or update a serviceable PIN code
   */
  static async addOrUpdatePincode(pincodeData: ISupportedPincode): Promise<IDeliveryConfigDocument> {
    const config = await this.getConfig();
    const existingIndex = config.supportedPincodes.findIndex((p) => p.pincode === pincodeData.pincode);

    if (existingIndex >= 0) {
      config.supportedPincodes[existingIndex] = pincodeData;
    } else {
      config.supportedPincodes.push(pincodeData);
    }

    await config.save();
    return config;
  }

  /**
   * Admin: Remove or deactivate a PIN code
   */
  static async removePincode(pincode: string): Promise<IDeliveryConfigDocument> {
    const config = await this.getConfig();
    config.supportedPincodes = config.supportedPincodes.filter((p) => p.pincode !== pincode);
    await config.save();
    return config;
  }
}
